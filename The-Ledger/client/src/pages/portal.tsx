import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/mockData";
import { usePortalAuth } from "@/lib/portalAuth";
import {
  toPortalClient,
  projectClientJobs,
  projectClientSites,
  projectClientInvoices,
  type PortalJob,
} from "@/lib/portalProjections";
import { buildPortalActivity } from "@/lib/portalActivity";
import { getPortalBranding } from "@/lib/portalBranding";
import { recordPortalAudit } from "@/lib/portalAudit";
import { PortalShell, PORTAL_NAV, type PortalSectionKey } from "@/components/portal/PortalShell";
import { PortalLogin } from "@/components/portal/PortalLogin";
import { PortalDashboard } from "@/pages/portal/dashboard";
import { PortalSites } from "@/pages/portal/sites";
import { PortalJobs } from "@/pages/portal/jobs";
import { PortalNotifications } from "@/pages/portal/notifications";
import { PortalDocuments, PortalInvoices, PortalRequests } from "@/pages/portal/placeholders";

const VALID_SECTIONS = PORTAL_NAV.map((n) => n.key);

export default function PortalPage() {
  const { allClients: clients, allJobs: jobs, allWorkers: workers, allRoles: roles, allInvoices: invoices } = useStore();
  const { account, signIn, signOut } = usePortalAuth();
  const [location, setLocation] = useLocation();

  const branding = getPortalBranding(account?.clientId);

  // ── Route parsing ──────────────────────────────────────────────────────────
  const rel = location.replace(/^\/portal\/?/, "");
  const segs = rel.split("/").filter(Boolean);
  const rawSection = segs[0] || "dashboard";
  const section: PortalSectionKey = (VALID_SECTIONS as string[]).includes(rawSection)
    ? (rawSection as PortalSectionKey)
    : "dashboard";
  const jobId = section === "jobs" ? segs[1] : undefined;

  // ── Client-safe projections (scoped to account.clientId) ───────────────────
  const portalClient = useMemo(
    () => (account ? clients.filter((c) => c.id === account.clientId).map(toPortalClient)[0] : undefined),
    [account, clients]
  );
  const portalJobs = useMemo(
    () => (account ? projectClientJobs(account.clientId, jobs, workers, roles) : []),
    [account, jobs, workers, roles]
  );
  const portalSites = useMemo(
    () => (account ? projectClientSites(account.clientId, jobs, workers, roles) : []),
    [account, jobs, workers, roles]
  );
  const portalInvoices = useMemo(
    () => (account ? projectClientInvoices(account.clientId, invoices) : []),
    [account, invoices]
  );
  const portalActivity = useMemo(
    () => buildPortalActivity(portalJobs, portalInvoices),
    [portalJobs, portalInvoices]
  );

  const selectedJob: PortalJob | null = jobId ? portalJobs.find((j) => j.id === jobId) ?? null : null;

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
        <PortalJobs jobs={portalJobs} selectedJob={selectedJob} onOpenJob={handleOpenJob} onBack={handleBackToJobs} />
      )}
      {section === "documents" && <PortalDocuments />}
      {section === "invoices" && <PortalInvoices />}
      {section === "requests" && <PortalRequests />}
      {section === "notifications" && <PortalNotifications activity={portalActivity} />}
    </PortalShell>
  );
}
