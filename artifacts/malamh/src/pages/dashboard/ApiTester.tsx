import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListApiKeys } from "@workspace/api-client-react";
import { Loader2, Terminal, Send, ChevronDown } from "lucide-react";

type Method = "POST";
type Endpoint = {
  label: string;
  method: Method;
  path: string;
  defaultBody: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    label: "Check consent by face ID",
    method: "POST",
    path: "/api/check",
    defaultBody: JSON.stringify({ face_id: "face_abc123" }, null, 2),
  },
  {
    label: "Check consent with image",
    method: "POST",
    path: "/api/check-image",
    defaultBody: JSON.stringify({ image: "data:image/jpeg;base64,...", threshold: 0.85 }, null, 2),
  },
];

export default function ApiTester() {
  const { data: keysData } = useListApiKeys();
  const keys = keysData ?? [];

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [body, setBody] = useState(ENDPOINTS[0].defaultBody);
  const [response, setResponse] = useState<{ status: number; data: unknown; ms: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const endpoint = ENDPOINTS[selectedEndpoint];

  const handleEndpointChange = (i: number) => {
    setSelectedEndpoint(i);
    setBody(ENDPOINTS[i].defaultBody);
    setResponse(null);
    setError("");
  };

  const handleSend = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    const start = Date.now();
    try {
      const res = await fetch(endpoint.path, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
          ...(selectedKey ? { Authorization: `Bearer ${selectedKey}` } : {}),
        },
        body,
        credentials: "include",
      });
      const data = await res.json();
      setResponse({ status: res.status, data, ms: Date.now() - start });
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">API Tester</h1>
          <p className="text-sm text-muted-foreground mt-1">Test Malamh API endpoints directly from your dashboard.</p>
        </div>

        <div className="surface p-6 flex flex-col gap-5">
          {/* Endpoint selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Endpoint</label>
            <div className="relative">
              <select
                value={selectedEndpoint}
                onChange={(e) => handleEndpointChange(Number(e.target.value))}
                className="input w-full appearance-none pr-8"
              >
                {ENDPOINTS.map((ep, i) => (
                  <option key={i} value={i}>{ep.method} {ep.path} — {ep.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* API key selector */}
          {keys.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">API Key <span className="text-muted-foreground font-normal">(optional)</span></label>
              <div className="relative">
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="input w-full appearance-none pr-8"
                >
                  <option value="">— None (use session cookie) —</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.keyPreview ?? k.id}>{k.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Request body */}
          <div>
            <label className="block text-sm font-medium mb-2">Request body (JSON)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="input w-full font-mono text-xs resize-none"
              spellCheck={false}
            />
          </div>

          <button onClick={handleSend} disabled={loading} className="btn btn-primary h-11 gap-2 self-start px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send request</>}
          </button>
        </div>

        {/* Response */}
        {(response || error) && (
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" /> Response
              </h2>
              {response && (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono font-bold ${response.status < 300 ? "text-green-400" : response.status < 500 ? "text-yellow-400" : "text-destructive"}`}>
                    {response.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{response.ms}ms</span>
                </div>
              )}
            </div>
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : (
              <pre className="font-mono text-xs bg-background rounded border border-border/50 p-4 overflow-x-auto text-foreground">
                {JSON.stringify(response?.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
