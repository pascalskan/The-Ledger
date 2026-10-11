import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import {
  getAllThreads,
  getMessagesForThread,
  addStaffReply,
  closeThread,
  type ClientCommunicationThread,
} from "@/lib/portalCommunication";

interface StaffConversationsProps {
  /** Job ids this user may see (CEO: all jobs; PM: jobs they manage). */
  visibleProjectIds: string[];
  jobTitle: (projectId: string) => string | undefined;
  staffName: string;
}

const STATUS_CLS: Record<ClientCommunicationThread["status"], string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "Awaiting Response": "bg-amber-50 text-amber-800 border-amber-200",
  Closed: "bg-muted text-muted-foreground border-border",
};

/**
 * Staff inbox for client conversations started in the portal. "Awaiting Response"
 * means the client wrote last and a reply is due from the team.
 */
export function StaffConversations({ visibleProjectIds, jobTitle, staffName }: StaffConversationsProps) {
  const [version, setVersion] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const threads = useMemo(() => {
    void version;
    return getAllThreads().filter((t) => visibleProjectIds.includes(t.projectId));
  }, [visibleProjectIds, version]);

  const awaiting = threads.filter((t) => t.status === "Awaiting Response").length;

  function send(threadId: string) {
    if (!reply.trim()) return;
    addStaffReply({ threadId, message: reply, senderName: staffName });
    setReply("");
    setVersion((v) => v + 1);
  }

  return (
    <Card data-testid="staff-conversations">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> Client conversations
        </CardTitle>
        {awaiting > 0 && (
          <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200" data-testid="staff-conversations-awaiting">
            {awaiting} awaiting your reply
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {threads.length === 0 && (
          <p className="text-sm text-muted-foreground">No client conversations for your jobs yet.</p>
        )}
        {threads.map((t) => {
          const open = openId === t.id;
          const msgs = open ? getMessagesForThread(t.id) : [];
          return (
            <div key={t.id} className="rounded-md border" data-testid={`staff-thread-${t.id}`}>
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left"
                aria-expanded={open}
                onClick={() => { setOpenId(open ? null : t.id); setReply(""); }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.subject}</span>
                  <span className="block text-xs text-muted-foreground">
                    {jobTitle(t.projectId) ?? "Project"} · {t.topic} · updated {formatDateTime(t.updatedAt)}
                  </span>
                </span>
                <Badge variant="outline" className={STATUS_CLS[t.status]}>{t.status}</Badge>
              </button>
              {open && (
                <div className="space-y-3 border-t p-3">
                  <ul className="space-y-2">
                    {msgs.map((m) => (
                      <li key={m.id} className="rounded-md bg-muted/50 p-2 text-sm">
                        <div className="text-xs text-muted-foreground">
                          {m.senderName} ({m.senderType === "Client" ? "client" : m.senderType === "System" ? "system" : "team"}) · {formatDateTime(m.createdAt)}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.message}</p>
                      </li>
                    ))}
                  </ul>
                  {t.status !== "Closed" && (
                    <div className="space-y-2">
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Reply to the client…"
                        aria-label={`Reply to ${t.subject}`}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => send(t.id)} disabled={!reply.trim()}>Send reply</Button>
                        <Button size="sm" variant="outline" onClick={() => { closeThread(t.id); setVersion((v) => v + 1); }}>Close conversation</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
