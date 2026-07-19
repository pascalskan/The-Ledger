import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagesSquare, ArrowLeft, Plus, Send, User, UserCog, Settings2 } from "lucide-react";
import type { PortalThread, PortalMessage, PortalJob } from "@/lib/portalProjections";
import { THREAD_TOPICS, type ClientThreadTopic, type ClientThreadStatus } from "@/lib/portalCommunication";

const STATUS_CLS: Record<ClientThreadStatus, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "Awaiting Response": "bg-amber-50 text-amber-700 border-amber-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
};

interface PortalMessagesProps {
  threads: PortalThread[];
  selectedThread: PortalThread | null;
  messages: PortalMessage[];
  jobs: PortalJob[];
  onOpenThread: (thread: PortalThread) => void;
  onBack: () => void;
  onCreateThread: (input: { projectId: string; subject: string; topic: ClientThreadTopic; message: string }) => void;
  onReply: (threadId: string, message: string) => void;
}

export function PortalMessages({
  threads,
  selectedThread,
  messages,
  jobs,
  onOpenThread,
  onBack,
  onCreateThread,
  onReply,
}: PortalMessagesProps) {
  if (selectedThread) {
    return (
      <ThreadDetail
        thread={selectedThread}
        messages={messages}
        onBack={onBack}
        onReply={onReply}
      />
    );
  }
  return <ThreadList threads={threads} jobs={jobs} onOpenThread={onOpenThread} onCreateThread={onCreateThread} />;
}

function ThreadList({
  threads,
  jobs,
  onOpenThread,
  onCreateThread,
}: {
  threads: PortalThread[];
  jobs: PortalJob[];
  onOpenThread: (t: PortalThread) => void;
  onCreateThread: PortalMessagesProps["onCreateThread"];
}) {
  const [composing, setComposing] = useState(false);
  const [projectId, setProjectId] = useState(jobs[0]?.id ?? "");
  const [topic, setTopic] = useState<ClientThreadTopic>("General enquiry");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!subject.trim() || !message.trim() || !projectId) {
      setError("Please choose a project and complete both the subject and message.");
      return;
    }
    setError(null);
    onCreateThread({ projectId, subject, topic, message });
    setSubject("");
    setMessage("");
    setComposing(false);
  };

  return (
    <div className="space-y-6" data-testid="portal-messages">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Messages</h1>
          <p className="text-slate-500 mt-1">Project conversations with your delivery team.</p>
        </div>
        <Button onClick={() => setComposing((c) => !c)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="portal-thread-new">
          <Plus className="h-4 w-4 mr-2" /> New conversation
        </Button>
      </div>

      {composing && (
        <Card className="border-slate-200" data-testid="portal-thread-compose">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg">Start a conversation</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="portal-thread-error" role="alert">
                {error}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-thread-project-select" className="text-xs">Project</Label>
                <select
                  id="portal-thread-project-select"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  data-testid="portal-thread-project"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-thread-topic-select" className="text-xs">Topic</Label>
                <select
                  id="portal-thread-topic-select"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as ClientThreadTopic)}
                  data-testid="portal-thread-topic"
                >
                  {THREAD_TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-thread-subject-input" className="text-xs">Subject</Label>
              <Input
                id="portal-thread-subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Access window for filter replacement"
                data-testid="portal-thread-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-thread-message-input" className="text-xs">Message</Label>
              <textarea
                id="portal-thread-message-input"
                className="min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or request..."
                data-testid="portal-thread-message"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
              <Button onClick={submit} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="portal-thread-submit">
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {threads.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white" data-testid="portal-messages-empty">
          <MessagesSquare className="h-8 w-8 mx-auto text-slate-500 mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No conversations yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            Start a conversation with your project team and it will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100" data-testid="portal-thread-list">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenThread(t)}
              className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors"
              data-testid={`portal-thread-${t.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{t.subject}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span>{t.projectTitle}</span>
                    <span>·</span>
                    <span>{t.topic}</span>
                    <span>·</span>
                    <span>{t.messageCount} message{t.messageCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={STATUS_CLS[t.status]} data-testid={`portal-thread-status-${t.id}`}>
                    {t.status}
                  </Badge>
                  <span className="text-[11px] text-slate-500">{new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SENDER_META = {
  Client: { icon: User, label: "You", cls: "bg-slate-900 text-white" },
  ProjectManager: { icon: UserCog, label: "Project Manager", cls: "bg-slate-100 text-slate-600" },
  System: { icon: Settings2, label: "System", cls: "bg-slate-50 text-slate-500" },
} as const;

function ThreadDetail({
  thread,
  messages,
  onBack,
  onReply,
}: {
  thread: PortalThread;
  messages: PortalMessage[];
  onBack: () => void;
  onReply: (threadId: string, message: string) => void;
}) {
  const [reply, setReply] = useState("");

  const send = () => {
    if (!reply.trim()) return;
    onReply(thread.id, reply);
    setReply("");
  };

  return (
    <div className="space-y-6" data-testid="portal-thread-detail">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-slate-500 hover:text-slate-900" data-testid="portal-thread-back">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Messages
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Badge variant="outline" className={STATUS_CLS[thread.status]} data-testid="portal-thread-detail-status">
            {thread.status}
          </Badge>
          <span className="text-xs text-slate-500">{thread.topic}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="portal-thread-detail-subject">
          {thread.subject}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{thread.projectTitle}</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg">Conversation history</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ol className="divide-y divide-slate-100" data-testid="portal-thread-messages">
            {messages.map((m) => {
              const meta = SENDER_META[m.senderType];
              const Icon = meta.icon;
              return (
                <li key={m.id} className="py-4 flex gap-3" data-testid={`portal-message-${m.id}`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 ${meta.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800" data-testid={`portal-message-sender-${m.id}`}>
                        {m.senderType === "Client" ? m.senderName : meta.label}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{m.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {thread.status === "Closed" ? (
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500 italic" data-testid="portal-thread-closed-note">
              This conversation is closed. Start a new conversation if you need further help.
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <Label htmlFor="portal-thread-reply-input" className="text-xs">Add a reply</Label>
              <div className="flex gap-2">
                <textarea
                  id="portal-thread-reply-input"
                  className="min-h-[72px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  data-testid="portal-thread-reply"
                />
                <Button onClick={send} className="shrink-0 self-end bg-slate-900 hover:bg-slate-800 text-white" data-testid="portal-thread-reply-send">
                  <Send className="h-4 w-4 mr-2" /> Send
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
