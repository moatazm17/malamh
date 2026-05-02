import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListApiKeys } from "@workspace/api-client-react";
import { Loader2, Send, ChevronDown } from "lucide-react";

type Endpoint = { label: string; method: "POST"; path: string; defaultBody: string };

const ENDPOINTS: Endpoint[] = [
  { label: "Check consent by face ID", method: "POST", path: "/api/check", defaultBody: JSON.stringify({ face_id: "face_abc123" }, null, 2) },
  { label: "Check consent with image", method: "POST", path: "/api/check-image", defaultBody: JSON.stringify({ image: "data:image/jpeg;base64,...", threshold: 0.85 }, null, 2) },
];

export default function ApiTester() {
  const { data: keysData } = useListApiKeys();
  const keys = keysData ?? [];

  const [selectedKey, setSelectedKey] = useState("");
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
        body, credentials: "include",
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
      <div className="flex flex-col gap-8 anim-fade-up">
        <div>
          <div className="section-label mb-2">API</div>
          <h1 className="headline-section text-3xl md:text-4xl">API Tester</h1>
          <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>Test Malamh API endpoints directly from your dashboard.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT — request */}
          <div className="glass-card-elevated p-6 flex flex-col gap-5">
            <div className="section-label">Request</div>

            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Endpoint</label>
              <div className="relative">
                <select
                  value={selectedEndpoint}
                  onChange={(e) => handleEndpointChange(Number(e.target.value))}
                  className="input-mh appearance-none pr-10"
                >
                  {ENDPOINTS.map((ep, i) => <option key={i} value={i}>{ep.method} {ep.path}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            {keys.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-2 section-label">API Key (optional)</label>
                <div className="relative">
                  <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className="input-mh appearance-none pr-10">
                    <option value="">— None (use session cookie) —</option>
                    {keys.map((k) => <option key={k.id} value={k.keyPreview ?? k.id}>{k.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Request body (JSON)</label>
              <textarea
                value={body} onChange={(e) => setBody(e.target.value)} rows={8}
                className="input-mh font-mono text-xs resize-none"
                style={{ fontFamily: "var(--app-font-mono)" }}
                spellCheck={false}
              />
            </div>

            <button onClick={handleSend} disabled={loading} className="btn-mh btn-mh-primary justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Run Check</>}
            </button>
          </div>

          {/* RIGHT — response */}
          <div className="glass-card-elevated p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="section-label">Response</div>
              {response && (
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: response.status < 300 ? "var(--accent-green)" : response.status < 500 ? "var(--accent-amber)" : "var(--accent-red)" }}
                  >
                    {response.status}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{response.ms}ms</span>
                </div>
              )}
            </div>
            {error ? (
              <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>
            ) : response ? (
              <pre className="code-block whitespace-pre overflow-x-auto flex-1">{JSON.stringify(response.data, null, 2)}</pre>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                Send a request to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
