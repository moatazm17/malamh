import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListApiKeys, useCreateApiKey, useDeleteApiKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";

export default function ApiKeys() {
  const { data: keys, isLoading } = useListApiKeys();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const keyList = keys ?? [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createKey.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: (res) => {
          setNewKeyValue(res.key);
          setName("");
          setShowForm(false);
          toast({ title: "API key created" });
        },
        onError: () => toast({ title: "Failed to create key", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this API key? Any integrations using it will stop working.")) return;
    deleteKey.mutate({ id }, { onError: () => toast({ title: "Delete failed", variant: "destructive" }) });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 anim-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label mb-2">API</div>
            <h1 className="headline-section text-3xl md:text-4xl">API Keys</h1>
            <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>
              Use these keys to authenticate calls to the Malamh API.
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-mh btn-mh-primary">
            <Plus className="w-4 h-4" /> Generate New Key
          </button>
        </div>

        {showForm && (
          <div className="glass-card-elevated p-6 anim-scale-in">
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--app-font-display)" }}>Create API Key</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-mh flex-1" placeholder="Key name, e.g. Production App" required />
              <button type="submit" disabled={createKey.isPending} className="btn-mh btn-mh-primary">
                {createKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
              </button>
            </form>
          </div>
        )}

        {newKeyValue && (
          <div className="glass-card-elevated p-6 anim-scale-in" style={{ borderColor: "var(--accent-amber)", boxShadow: "0 0 60px rgba(255,176,32,0.15)" }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-amber)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--accent-amber)" }}>Copy your new key now — it won't be shown again.</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Store it securely on your server.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 code-block text-xs break-all" style={{ padding: "10px 14px" }}>{newKeyValue}</code>
              <button onClick={() => handleCopy(newKeyValue)} className="btn-mh btn-mh-ghost flex-shrink-0" style={{ padding: "10px 14px" }}>
                {copied === newKeyValue ? <Check className="w-4 h-4" style={{ color: "var(--accent-green)" }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setNewKeyValue(null)} className="text-xs mt-3 hover:underline" style={{ color: "var(--text-muted)" }}>I've copied it →</button>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent-blue)" }} />
            </div>
          ) : keyList.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No API keys yet. Generate one to start using the API.</p>
            </div>
          ) : (
            <table className="table-mh">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Last used</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keyList.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.name}</td>
                    <td className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{k.key?.slice(0, 18)}••••••••</td>
                    <td>
                      <span className={`badge-mh ${k.active ? "badge-open" : "badge-blocked"}`}>
                        {k.active ? "active" : "revoked"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "—"}</td>
                    <td className="text-right">
                      <button onClick={() => handleDelete(k.id)} className="btn-mh btn-mh-danger text-xs" style={{ padding: "6px 12px" }}>
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="section-label mb-3">Usage example</div>
          <pre className="code-block whitespace-pre overflow-x-auto">
{`curl -X POST /api/check \\
  -H "Authorization: Bearer mlm_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"face_id":"face_abc123"}'`}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
