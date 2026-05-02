import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListApiKeys, useCreateApiKey, useDeleteApiKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";

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
    deleteKey.mutate(
      { id },
      {
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">Use these keys to authenticate calls to the Malamh API.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary gap-2 h-9 px-4 text-sm">
            <Plus className="h-4 w-4" /> New key
          </button>
        </div>

        {showForm && (
          <div className="surface p-6">
            <h2 className="font-semibold mb-4">Create API Key</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input flex-1"
                placeholder="Key name, e.g. Production App"
                required
              />
              <button type="submit" disabled={createKey.isPending} className="btn btn-primary px-5 gap-2">
                {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </button>
            </form>
          </div>
        )}

        {newKeyValue && (
          <div className="surface p-6 border-green-500/30 bg-green-500/5">
            <p className="text-sm font-semibold text-green-400 mb-2">New key created — copy it now. You won't see it again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-background rounded border border-border/50 px-3 py-2.5 text-foreground break-all">
                {newKeyValue}
              </code>
              <button onClick={() => handleCopy(newKeyValue)} className="btn btn-ghost border border-border/50 h-9 w-9 p-0 flex-shrink-0">
                {copied === newKeyValue ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => setNewKeyValue(null)} className="text-xs text-muted-foreground hover:text-foreground mt-3">
              I've copied it
            </button>
          </div>
        )}

        <div className="surface p-6">
          <h2 className="font-semibold mb-5">Your Keys</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keyList.length === 0 ? (
            <div className="text-center py-10">
              <Key className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {keyList.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border/50 flex-shrink-0">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {k.key?.slice(0, 18)}••••••••
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${k.active ? "badge-open" : "badge-blocked"}`}>
                      {k.active ? "active" : "inactive"}
                    </span>
                    {k.lastUsed && (
                      <span className="text-xs text-muted-foreground hidden md:block">
                        Used {new Date(k.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={() => handleDelete(k.id)} className="btn btn-ghost h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface p-6">
          <h2 className="text-sm font-semibold mb-3">Usage example</h2>
          <pre className="font-mono text-xs bg-background rounded border border-border/50 p-4 overflow-x-auto">
{`curl -X POST /api/check \\
  -H "Authorization: Bearer mk_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"face_id":"face_abc123"}'`}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
