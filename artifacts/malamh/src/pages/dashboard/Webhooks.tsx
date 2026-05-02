import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook, Plus, Trash2, Send, RotateCcw, Copy, CheckCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Pencil, X, AlertTriangle,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = `${BASE_URL}/api`;

const ALL_EVENTS = [
  { value: "face.blocked", label: "Face Blocked", desc: "A consent check returned blocked" },
  { value: "face.allowed", label: "Face Allowed", desc: "A consent check returned open/allowed" },
  { value: "consent.token_issued", label: "Token Issued", desc: "A consent token was created" },
  { value: "consent.approved", label: "Consent Approved", desc: "You approved a consent token" },
  { value: "consent.denied", label: "Consent Denied", desc: "You denied a consent token" },
] as const;

type WebhookEvent = typeof ALL_EVENTS[number]["value"];

interface WebhookRow {
  id: string; url: string; events: WebhookEvent[]; description: string | null;
  active: boolean; lastDeliveredAt: string | null; createdAt: string; secret?: string;
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
    <div className="glass-card-elevated p-5 mb-4 anim-scale-in" style={{ borderColor: "var(--accent-amber)", boxShadow: "0 0 40px rgba(255,176,32,0.15)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-amber)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--accent-amber)" }}>
            Save your signing secret — it won't be shown again
          </p>
        </div>
        <button onClick={onDismiss} style={{ color: "var(--text-muted)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 code-block text-xs break-all" style={{ padding: "10px 14px" }}>{secret}</code>
        <button onClick={copy} className="btn-mh btn-mh-ghost flex-shrink-0" style={{ padding: "10px 14px" }}>
          {copied ? <CheckCircle className="w-4 h-4" style={{ color: "var(--accent-green)" }} /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function EventCheckboxes({ selected, onChange }: { selected: WebhookEvent[]; onChange: (events: WebhookEvent[]) => void }) {
  const toggle = (ev: WebhookEvent) =>
    onChange(selected.includes(ev) ? selected.filter((e) => e !== ev) : [...selected, ev]);
  return (
    <div className="flex flex-col gap-3">
      {ALL_EVENTS.map((ev) => (
        <label key={ev.value} className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-[#4d7cff]" checked={selected.includes(ev.value)} onChange={() => toggle(ev.value)} />
          <div>
            <p className="text-sm font-medium">{ev.label}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.desc}</p>
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
      setUrl(""); setDesc("");
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
      <button onClick={() => setOpen(true)} className="btn-mh btn-mh-primary">
        <Plus className="w-4 h-4" /> Add Endpoint
      </button>
    );
  }

  return (
    <div className="glass-card-elevated p-6 mb-6 anim-scale-in">
      <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--app-font-display)" }}>New webhook</h3>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold mb-2 section-label">Endpoint URL</label>
          <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/webhooks/malamh" className="input-mh" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 section-label">Description (optional)</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Production alert handler" className="input-mh" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-3 section-label">Events to subscribe</label>
          <EventCheckboxes selected={events} onChange={setEvents} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading || !url || events.length === 0} className="btn-mh btn-mh-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-mh btn-mh-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function WebhookCard({ hook, onUpdated, onDeleted }: {
  hook: WebhookRow; onUpdated: (updated: WebhookRow) => void; onDeleted: (id: string) => void;
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
    setTesting(true); setTestResult(null);
    try {
      const result = await apiFetch(`/webhooks/${hook.id}/test`, { method: "POST" });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally { setTesting(false); }
  };

  const toggleActive = async () => {
    try {
      const updated = await apiFetch(`/webhooks/${hook.id}`, { method: "PATCH", body: JSON.stringify({ active: !hook.active }) });
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
      onUpdated(updated); setEditing(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const rotateSecret = async () => {
    if (!confirm("Rotate the signing secret? Your current secret will stop working immediately.")) return;
    setRotating(true);
    try {
      const result = await apiFetch(`/webhooks/${hook.id}/rotate-secret`, { method: "POST" });
      setNewSecret(result.secret); onUpdated({ ...hook });
    } catch (err: any) {
      toast({ title: "Failed to rotate secret", description: err.message, variant: "destructive" });
    } finally { setRotating(false); }
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

  const eventLabels = hook.events.map((ev) => ALL_EVENTS.find((e) => e.value === ev)?.label ?? ev);

  return (
    <div className="glass-card overflow-hidden">
      {newSecret && (
        <div className="px-5 pt-4">
          <SecretBanner secret={newSecret} onDismiss={() => setNewSecret(null)} />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-2 w-2 rounded-full flex-shrink-0" style={{ background: hook.active ? "var(--accent-green)" : "var(--text-muted)", boxShadow: hook.active ? "0 0 8px var(--accent-green)" : undefined }} />
              <p className="font-mono text-sm truncate" style={{ color: "var(--text-primary)" }}>{hook.url}</p>
            </div>
            {hook.description && <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{hook.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {eventLabels.map((label) => (
                <span key={label} className="badge-mh badge-blue text-[0.65rem]" style={{ padding: "2px 8px" }}>{label}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggleActive} title={hook.active ? "Disable" : "Enable"} className="p-2 rounded-md hover:bg-white/5">
              {hook.active ? <CheckCircle className="w-4 h-4" style={{ color: "var(--accent-green)" }} /> : <XCircle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-md hover:bg-white/5">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {hook.lastDeliveredAt && (
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>Last delivered: {new Date(hook.lastDeliveredAt).toLocaleString()}</p>
        )}
      </div>

      {expanded && (
        <div className="px-5 py-4 flex flex-col gap-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 section-label">URL</label>
                <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="input-mh" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 section-label">Description</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input-mh" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-3 section-label">Events</label>
                <EventCheckboxes selected={editEvents} onChange={setEditEvents} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="btn-mh btn-mh-primary text-xs" style={{ padding: "8px 16px" }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
                </button>
                <button onClick={() => setEditing(false)} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 16px" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditing(true)} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 14px" }}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={sendTest} disabled={testing} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 14px", borderColor: "var(--accent-blue)", color: "var(--accent-blue)" }}>
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Test
              </button>
              <button onClick={rotateSecret} disabled={rotating} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 14px", borderColor: "var(--accent-amber)", color: "var(--accent-amber)" }}>
                {rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Rotate Secret
              </button>
              <button onClick={deleteHook} disabled={deleting} className="btn-mh btn-mh-danger text-xs ml-auto" style={{ padding: "8px 14px" }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
              </button>
            </div>
          )}

          {testResult && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: testResult.success ? "var(--accent-green-glow)" : "var(--accent-red-glow)",
                border: `1px solid ${testResult.success ? "var(--accent-green)" : "var(--accent-red)"}`,
                color: testResult.success ? "var(--accent-green)" : "var(--accent-red)",
              }}
            >
              {testResult.success ? `✓ Delivered successfully (HTTP ${testResult.statusCode})` : `✗ Failed — ${testResult.error ?? `HTTP ${testResult.statusCode}`}`}
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
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreated = (hook: WebhookRow) => {
    setHooks((prev) => [hook, ...(prev ?? [])]);
    if (hook.secret) setNewSecret(hook.secret);
  };
  const handleUpdated = (updated: WebhookRow) =>
    setHooks((prev) => prev?.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)) ?? []);
  const handleDeleted = (id: string) => setHooks((prev) => prev?.filter((h) => h.id !== id) ?? []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 anim-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label mb-2">Integrations</div>
            <h1 className="headline-section text-3xl md:text-4xl flex items-center gap-3">
              <Webhook className="w-7 h-7" style={{ color: "var(--accent-blue)" }} /> Webhooks
            </h1>
            <p className="text-base mt-2 max-w-xl" style={{ color: "var(--text-secondary)" }}>
              Receive real-time POST notifications when faces are checked, blocked, or consent tokens are resolved.
            </p>
          </div>
          <CreateForm onCreated={handleCreated} />
        </div>

        {newSecret && <SecretBanner secret={newSecret} onDismiss={() => setNewSecret(null)} />}

        <div className="glass-card p-5">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Verifying signatures</p>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            Each delivery includes an <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-void)", color: "var(--accent-blue)" }}>X-Malamh-Signature</code> header:
          </p>
          <pre className="code-block whitespace-pre-wrap">{`const sig = req.headers["x-malamh-signature"];
const expected = "sha256=" + createHmac("sha256", SECRET)
  .update(JSON.stringify(req.body)).digest("hex");
if (sig !== expected) return res.status(401).end();`}</pre>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent-blue)" }} />
          </div>
        ) : !hooks || hooks.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Webhook className="w-14 h-14 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No webhooks yet. Add one above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {hooks.map((hook) => <WebhookCard key={hook.id} hook={hook} onUpdated={handleUpdated} onDeleted={handleDeleted} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
