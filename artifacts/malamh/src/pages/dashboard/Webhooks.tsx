import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook,
  Plus,
  Trash2,
  Send,
  RotateCcw,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = `${BASE_URL}/api`;

const ALL_EVENTS = [
  { value: "face.blocked", label: "Face Blocked", desc: "A consent check returned blocked for a registered face" },
  { value: "face.allowed", label: "Face Allowed", desc: "A consent check returned open/allowed" },
  { value: "consent.token_issued", label: "Token Issued", desc: "A consent token was created (TOKEN_REQUIRED face)" },
  { value: "consent.approved", label: "Consent Approved", desc: "You approved a consent token request" },
  { value: "consent.denied", label: "Consent Denied", desc: "You denied a consent token request" },
] as const;

type WebhookEvent = typeof ALL_EVENTS[number]["value"];

interface WebhookRow {
  id: string;
  url: string;
  events: WebhookEvent[];
  description: string | null;
  active: boolean;
  lastDeliveredAt: string | null;
  createdAt: string;
  secret?: string; // only present on create/rotate-secret
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function SecretBanner({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-yellow-400">Save your signing secret — it won't be shown again</p>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs bg-background border border-border/50 px-3 py-2 rounded break-all">
          {secret}
        </code>
        <button
          onClick={copy}
          className="flex-shrink-0 btn btn-ghost border border-border/50 h-8 px-3 text-xs gap-1.5"
        >
          {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function EventCheckboxes({
  selected,
  onChange,
}: {
  selected: WebhookEvent[];
  onChange: (events: WebhookEvent[]) => void;
}) {
  const toggle = (ev: WebhookEvent) => {
    onChange(
      selected.includes(ev) ? selected.filter((e) => e !== ev) : [...selected, ev],
    );
  };
  return (
    <div className="flex flex-col gap-2">
      {ALL_EVENTS.map((ev) => (
        <label key={ev.value} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={selected.includes(ev.value)}
            onChange={() => toggle(ev.value)}
          />
          <div>
            <p className="text-sm font-medium">{ev.label}</p>
            <p className="text-xs text-muted-foreground">{ev.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: (hook: WebhookRow) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["face.blocked", "face.allowed", "consent.token_issued"]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || events.length === 0) return;
    setLoading(true);
    try {
      const hook = await apiFetch("/webhooks", {
        method: "POST",
        body: JSON.stringify({ url, events, description: desc || undefined }),
      });
      onCreated(hook);
      setUrl("");
      setDesc("");
      setEvents(["face.blocked", "face.allowed", "consent.token_issued"]);
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to create webhook", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary h-9 px-4 gap-2 text-sm">
        <Plus className="h-4 w-4" /> Add webhook
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 mb-6">
      <h3 className="font-semibold mb-4">New webhook</h3>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Endpoint URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/malamh"
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Production alert handler"
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-3">Events to subscribe</label>
          <EventCheckboxes selected={events} onChange={setEvents} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading || !url || events.length === 0} className="btn btn-primary h-9 px-5 gap-2 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost border border-border/50 h-9 px-4 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function WebhookCard({
  hook,
  onUpdated,
  onDeleted,
}: {
  hook: WebhookRow;
  onUpdated: (updated: WebhookRow) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(hook.url);
  const [editDesc, setEditDesc] = useState(hook.description ?? "");
  const [editEvents, setEditEvents] = useState<WebhookEvent[]>(hook.events);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; statusCode?: number; error?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiFetch(`/webhooks/${hook.id}/test`, { method: "POST" });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const toggleActive = async () => {
    try {
      const updated = await apiFetch(`/webhooks/${hook.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !hook.active }),
      });
      onUpdated(updated);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/webhooks/${hook.id}`, {
        method: "PATCH",
        body: JSON.stringify({ url: editUrl, events: editEvents, description: editDesc || null }),
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const rotateSecret = async () => {
    if (!confirm("Rotate the signing secret? Your current secret will stop working immediately.")) return;
    setRotating(true);
    try {
      const result = await apiFetch(`/webhooks/${hook.id}/rotate-secret`, { method: "POST" });
      setNewSecret(result.secret);
      onUpdated({ ...hook });
    } catch (err: any) {
      toast({ title: "Failed to rotate secret", description: err.message, variant: "destructive" });
    } finally {
      setRotating(false);
    }
  };

  const deleteHook = async () => {
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/webhooks/${hook.id}`, { method: "DELETE" });
      onDeleted(hook.id);
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  const eventLabels = hook.events.map(
    (ev) => ALL_EVENTS.find((e) => e.value === ev)?.label ?? ev,
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
      {newSecret && (
        <div className="px-5 pt-4">
          <SecretBanner secret={newSecret} onDismiss={() => setNewSecret(null)} />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex h-2 w-2 rounded-full flex-shrink-0 ${hook.active ? "bg-green-400" : "bg-muted-foreground"}`} />
              <p className="font-mono text-sm truncate text-foreground">{hook.url}</p>
            </div>
            {hook.description && (
              <p className="text-xs text-muted-foreground mb-2">{hook.description}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {eventLabels.map((label) => (
                <span key={label} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleActive}
              title={hook.active ? "Disable" : "Enable"}
              className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {hook.active ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {hook.lastDeliveredAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Last delivered: {new Date(hook.lastDeliveredAt).toLocaleString()}
          </p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-5 py-4 flex flex-col gap-4">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">URL</label>
                <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input w-full" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Events</label>
                <EventCheckboxes selected={editEvents} onChange={setEditEvents} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="btn btn-primary h-8 px-4 text-sm gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-ghost border border-border/50 h-8 px-3 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditing(true)} className="btn btn-ghost border border-border/50 h-8 px-3 text-sm gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={sendTest} disabled={testing} className="btn btn-ghost border border-border/50 h-8 px-3 text-sm gap-1.5">
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send test
              </button>
              <button onClick={rotateSecret} disabled={rotating} className="btn btn-ghost border border-border/50 h-8 px-3 text-sm gap-1.5">
                {rotating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Rotate secret
              </button>
              <button onClick={deleteHook} disabled={deleting} className="btn btn-ghost border border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3 text-sm gap-1.5 ml-auto">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
              </button>
            </div>
          )}

          {testResult && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${testResult.success ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-red-500/30 bg-red-500/5 text-red-400"}`}>
              {testResult.success
                ? `✓ Delivered successfully (HTTP ${testResult.statusCode})`
                : `✗ Failed — ${testResult.error ?? `HTTP ${testResult.statusCode}`}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Webhooks() {
  const [hooks, setHooks] = useState<WebhookRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await apiFetch("/webhooks");
      setHooks(data);
    } catch (err: any) {
      toast({ title: "Failed to load webhooks", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => { load(); }, []);

  const handleCreated = (hook: WebhookRow) => {
    setHooks((prev) => [hook, ...(prev ?? [])]);
    if (hook.secret) setNewSecret(hook.secret);
  };

  const handleUpdated = (updated: WebhookRow) => {
    setHooks((prev) => prev?.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)) ?? []);
  };

  const handleDeleted = (id: string) => {
    setHooks((prev) => prev?.filter((h) => h.id !== id) ?? []);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook className="h-6 w-6 text-primary" /> Webhooks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Receive real-time HTTP POST notifications when your face is checked, blocked, or a consent token is issued or resolved.
            </p>
          </div>
          <CreateForm onCreated={handleCreated} />
        </div>

        {newSecret && (
          <SecretBanner secret={newSecret} onDismiss={() => setNewSecret(null)} />
        )}

        {/* Signing instructions */}
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 mb-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Verifying signatures</p>
          <p className="mb-2">Each delivery includes a <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">X-Malamh-Signature</code> header:</p>
          <pre className="font-mono text-xs bg-background border border-border/50 rounded p-3 overflow-x-auto whitespace-pre-wrap">{`const sig = req.headers["x-malamh-signature"];
const expected = "sha256=" + createHmac("sha256", SECRET)
  .update(JSON.stringify(req.body)).digest("hex");
if (sig !== expected) return res.status(401).end();`}</pre>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hooks || hooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground border border-dashed border-border/40 rounded-xl">
            <Webhook className="h-10 w-10 opacity-30" />
            <p className="text-sm">No webhooks yet. Add one above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hooks.map((hook) => (
              <WebhookCard
                key={hook.id}
                hook={hook}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
