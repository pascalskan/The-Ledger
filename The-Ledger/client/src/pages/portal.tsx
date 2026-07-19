import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/mockData";
import { usePortalAuth } from "@/lib/portalAuth";
import {
  toPortalClient,
  projectClientJobs,
  projectClientSites,
  projectClientInvoices,
  projectMilestones,
  projectDeliverables,
  projectSharedDocuments,
  projectThreads,
  projectMessages,
  projectClientQuotes,
  projectClientVariations,
  projectClientPayments,
  projectClientCreditNotes,
  buildClientFinancialProjection,
  type PortalJob,
  type PortalDocument,
  type PortalThread,
  type PortalInvoice,
  type PortalQuote,
} from "@/lib/portalProjections";
import { buildPortalActivity, type ActivityMilestone, type ActivityDeliverable } from "@/lib/portalActivity";
import { getPortalBranding } from "@/lib/portalBranding";
import { recordPortalAudit } from "@/lib/portalAudit";
import { createThread, addClientMessage, recordThreadViewed, type ClientThreadTopic } from "@/lib/portalCommunication";
import { PortalShell, PORTAL_NAV, type PortalSectionKey } from "@/components/portal/PortalShell";
import { PortalLogin } from "@/components/portal/PortalLogin";
import { PortalDashboard } from "@/pages/portal/dashboard";
import { PortalSites } from "@/pages/portal/sites";
import { PortalJobs } from "@/pages/portal/jobs";
import { PortalDocumentsPage } from "@/pages/portal/documents";
import { PortalMessages } from "@/pages/portal/messages";
import { PortalNotifications } from "@/pages/portal/notifications";
import { PortalFinance } from "@/pages/portal/finance";
import { PortalRequests } from "@/pages/portal/placeholders";
import { useToast } from "@/hooks/use-toast";

const VALID_SECTIONS = PORTAL_NAV.map((n) => n.key);

export default function PortalPage() {
  const { allClients: clients, allJobs: jobs, allWorkers: workers, allRoles: roles, allInvoices: invoices } = useStore();
  const { account, signIn, signOut } = usePortalAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Bumped after a communication mutation so projections re-derive.
  const [commVersion, setCommVersion] = useState(0);

  const branding = getPortalBranding(account?.clientId);

  // ── Route parsing ──────────────────────────────────────────────────────────
  const rel = location.replace(/^\/portal\/?/, "");
  const segs = rel.split("/").filter(Boolean);
  const rawSection = segs[0] || "dashboard";
  const section: PortalSectionKey = (VALID_SECTIONS as string[]).includes(rawSection)
    ? (rawSection as PortalSectionKey)
    : "dashboard";
  const jobId = section === "jobs" ? segs[1] : undefined;
  const threadId = section === "messages" ? segs[1] : undefined;
  const invoiceId = section === "invoices" ? segs[1] : undefined;

  // ── Client-safe projections (scoped to account.clientId) ───────────────────
  const portalClient = useMemo(
    () => (account ? clients.filter((c) => c.id === account.clientId).map(toPortalClient)[0] : undefined),
    [account, clients]
  );
  const portalJobs = useMemo(
    () => (account ? projectClientJobs(account.clientId, jobs, workers, roles) : []),
    [account, jobs, workers, roles]
  );
  const visibleProjectIds = useMemo(() => portalJobs.map((j) => j.id), [portalJobs]);
  const projectTitleById = useMemo(
    () => Object.fromEntries(portalJobs.map((j) => [j.id, j.title])) as Record<string, string>,
    [portalJobs]
  );
  const portalSites = useMemo(
    () => (account ? projectClientSites(account.clientId, jobs, workers, roles) : []),
    [account, jobs, workers, roles]
  );
  const portalInvoices = useMemo(
    () => (account ? projectClientInvoices(account.clientId, invoices, projectTitleById) : []),
    [account, invoices, projectTitleById]
  );
  // ── Financial projections (CL-6) ────────────────────────────────────────────
  const financials = useMemo(() => {
    const invoiceNumberById = Object.fromEntries(
      portalInvoices.map((i) => [i.id, i.invoiceId])
    ) as Record<string, string>;
    const quotes = projectClientQuotes(visibleProjectIds, projectTitleById);
    const variations = projectClientVariations(visibleProjectIds, projectTitleById);
    const payments = projectClientPayments(visibleProjectIds, invoiceNumberById);
    const credits = projectClientCreditNotes(visibleProjectIds, invoiceNumberById);
    return buildClientFinancialProjection(quotes, variations, portalInvoices, payments, credits);
  }, [visibleProjectIds, projectTitleById, portalInvoices]);
  const portalDocuments = useMemo(
    () => (account ? projectSharedDocuments(visibleProjectIds) : []),
    [account, visibleProjectIds]
  );
  const portalThreads = useMemo(
    () => (account ? projectThreads(visibleProjectIds, portalJobs) : []),
    // commVersion re-derives after create/reply
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, visibleProjectIds, portalJobs, commVersion]
  );
  const portalActivity = useMemo(() => {
    const milestones: ActivityMilestone[] = [];
    const deliverables: ActivityDeliverable[] = [];
    for (const job of portalJobs) {
      for (const m of projectMilestones(job.id)) milestones.push({ jobTitle: job.title, milestone: m });
      for (const d of projectDeliverables(job.id)) deliverables.push({ jobTitle: job.title, deliverable: d });
    }
    return buildPortalActivity(
      portalJobs,
      portalInvoices,
      milestones,
      deliverables,
      portalDocuments,
      portalThreads,
      financials.quotes,
      financials.payments
    );
  }, [portalJobs, portalInvoices, portalDocuments, portalThreads, financials]);

  const selectedJob: PortalJob | null = jobId ? portalJobs.find((j) => j.id === jobId) ?? null : null;
  const selectedThread: PortalThread | null = threadId
    ? portalThreads.find((t) => t.id === threadId) ?? null
    : null;
  const selectedInvoice: PortalInvoice | null = invoiceId
    ? portalInvoices.find((i) => i.id === invoiceId) ?? null
    : null;
  const threadMessages = useMemo(
    () => (selectedThread ? projectMessages(selectedThread.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedThread?.id, commVersion]
  );

  // ── Audit: dashboard view ───────────────────────────────────────────────────
  useEffect(() => {
    if (account && section === "dashboard") {
      recordPortalAudit({
        type: "client_viewed_dashboard",
        who: account.email,
        what: "Viewed portal dashboard",
        clientId: account.clientId,
        externalReference: account.clientId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, section]);

  // ── Audit: job view ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (account && selectedJob) {
      recordPortalAudit({
        type: "client_viewed_job",
        who: account.email,
        what: `Viewed job ${selectedJob.jobId}`,
        clientId: account.clientId,
        sourceObjectId: selectedJob.id,
        externalReference: account.clientId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, selectedJob?.id]);

  // ── Audit: invoice view ─────────────────────────────────────────────────────
  useEffect(() => {
    if (account && selectedInvoice) {
      recordPortalAudit({
        type: "client_viewed_invoice",
        who: account.email,
        what: `Viewed invoice ${selectedInvoice.invoiceId}`,
        clientId: account.clientId,
        sourceObjectId: selectedInvoice.id,
        externalReference: account.clientId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, selectedInvoice?.id]);

  // ── Audit: thread view ──────────────────────────────────────────────────────
  useEffect(() => {
    if (account && selectedThread) {
      recordThreadViewed(selectedThread.id, account.email, account.clientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, selectedThread?.id]);

  // ── Unauthenticated → login (covers direct-URL access to any section) ──────
  if (!account) {
    return <PortalLogin branding={branding} signIn={signIn} />;
  }

  const handleOpenJob = (job: PortalJob) => setLocation(`/portal/jobs/${job.id}`);
  const handleBackToJobs = () => setLocation("/portal/jobs");
  const handleSignOut = () => {
    signOut();
    setLocation("/portal");
  };

  const handleViewDocument = (doc: PortalDocument) => {
    recordPortalAudit({
      type: "client_viewed_document",
      who: account.email,
      what: `Viewed document "${doc.title}"`,
      clientId: account.clientId,
      sourceObjectId: doc.id,
      externalReference: doc.projectId,
    });
    toast({ title: "Opening document", description: `${doc.title} (${doc.fileType})` });
  };

  // ── Financial handlers (CL-6) ──────────────────────────────────────────────
  const handleOpenInvoice = (inv: PortalInvoice) => setLocation(`/portal/invoices/${inv.id}`);
  const handleBackToFinance = () => setLocation("/portal/invoices");

  const handleDownloadInvoice = (inv: PortalInvoice) => {
    recordPortalAudit({
      type: "client_downloaded_invoice",
      who: account.email,
      what: `Downloaded invoice ${inv.invoiceId}`,
      clientId: account.clientId,
      sourceObjectId: inv.id,
      externalReference: account.clientId,
    });
    toast({ title: "Preparing download", description: `Invoice ${inv.invoiceId}` });
  };

  const handleViewQuote = (quote: PortalQuote) => {
    recordPortalAudit({
      type: "client_viewed_quote",
      who: account.email,
      what: `Viewed quote ${quote.quoteNumber}`,
      clientId: account.clientId,
      sourceObjectId: quote.id,
      externalReference: quote.projectId,
    });
    toast({ title: quote.quoteNumber, description: quote.description });
  };

  const handleViewPayments = () => {
    recordPortalAudit({
      type: "client_viewed_payment",
      who: account.email,
      what: "Viewed payment history",
      clientId: account.clientId,
      externalReference: account.clientId,
    });
  };

  const handleOpenThread = (thread: PortalThread) => setLocation(`/portal/messages/${thread.id}`);
  const handleBackToThreads = () => setLocation("/portal/messages");

  const handleCreateThread = (input: {
    projectId: string;
    subject: string;
    topic: ClientThreadTopic;
    message: string;
  }) => {
    createThread({
      ...input,
      senderName: portalClient?.name || "Client",
      who: account.email,
      clientId: account.clientId,
    });
    setCommVersion((v) => v + 1);
    toast({ title: "Conversation started", description: "Your project team has been notified." });
  };

  const handleReply = (tid: string, message: string) => {
    addClientMessage({
      threadId: tid,
      message,
      senderName: portalClient?.name || "Client",
      who: account.email,
      clientId: account.clientId,
    });
    setCommVersion((v) => v + 1);
    toast({ title: "Reply sent", description: "Your message has been added to the conversation." });
  };

  return (
    <PortalShell active={section} branding={branding} client={portalClient} onSignOut={handleSignOut}>
      {section === "dashboard" && (
        <PortalDashboard
          client={portalClient}
          jobs={portalJobs}
          sites={portalSites}
          invoices={portalInvoices}
          activity={portalActivity}
          onOpenJob={handleOpenJob}
        />
      )}
      {section === "sites" && <PortalSites sites={portalSites} />}
      {section === "jobs" && (
        <PortalJobs
          jobs={portalJobs}
          selectedJob={selectedJob}
          threads={portalThreads}
          onOpenJob={handleOpenJob}
          onBack={handleBackToJobs}
          onOpenMessages={() => setLocation("/portal/messages")}
        />
      )}
      {section === "documents" && (
        <PortalDocumentsPage
          documents={portalDocuments}
          projectTitleById={projectTitleById}
          onViewDocument={handleViewDocument}
        />
      )}
      {section === "messages" && (
        <PortalMessages
          threads={portalThreads}
          selectedThread={selectedThread}
          messages={threadMessages}
          jobs={portalJobs}
          onOpenThread={handleOpenThread}
          onBack={handleBackToThreads}
          onCreateThread={handleCreateThread}
          onReply={handleReply}
        />
      )}
      {section === "invoices" && (
        <PortalFinance
          financials={financials}
          branding={branding}
          selectedInvoice={selectedInvoice}
          onOpenInvoice={handleOpenInvoice}
          onBack={handleBackToFinance}
          onDownloadInvoice={handleDownloadInvoice}
          onViewQuote={handleViewQuote}
          onViewPayments={handleViewPayments}
        />
      )}
      {section === "requests" && <PortalRequests />}
      {section === "notifications" && <PortalNotifications activity={portalActivity} />}
    </PortalShell>
  );
}
