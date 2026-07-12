import { useState, useEffect } from "react";
import { Button, Card, Input } from "@comandr/ui-kit";
import { useAuth } from "../lib/auth-context";

interface Intent {
  id: string;
  tenantId: string;
  capabilityId: string;
  parameters: Record<string, any>;
  reasoning: string;
  requestedBy: string;
  createdAt: string;
  status: "pending" | "running" | "completed" | "failed";
}

interface ActionResult {
  intentId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const API_BASE = "http://localhost:3000";

export function AgentPage() {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [results, setResults] = useState<Map<string, ActionResult>>(new Map());

  useEffect(() => {
    loadIntents();
    const interval = setInterval(loadIntents, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [session]);

  async function loadIntents() {
    if (!session) return;

    try {
      const response = await fetch(`${API_BASE}/v1/intents?tenantId=${session.userId}`);
      if (response.ok) {
        const data = await response.json();
        setIntents(data);

        // Load results for each intent
        for (const intent of data) {
          loadResult(intent.id);
        }
      }
    } catch (error) {
      console.error("Failed to load intents:", error);
    }
  }

  async function loadResult(intentId: string) {
    try {
      const response = await fetch(`${API_BASE}/v1/intents/${intentId}/result`);
      if (response.ok) {
        const result = await response.json();
        setResults((prev) => new Map(prev).set(intentId, result));
      }
    } catch (error) {
      console.error("Failed to load result:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !session) return;

    setLoading(true);

    try {
      // Step 1: Generate intent using AI
      const aiResponse = await fetch(`${API_BASE}/v1/ai/generate-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: session.userId,
          prompt,
          userId: session.userId,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("Failed to generate intent");
      }

      const intent = await aiResponse.json();

      // Step 2: Create the intent
      const intentResponse = await fetch(`${API_BASE}/v1/intents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: session.userId,
          capabilityId: intent.capabilityId,
          parameters: intent.parameters,
          reasoning: intent.reasoning,
          requestedBy: session.userId,
        }),
      });

      if (!intentResponse.ok) {
        throw new Error("Failed to create intent");
      }

      setPrompt("");
      await loadIntents();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const sortedIntents = [...intents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <a href="/" className="dashboard-logo">
            Comandr
          </a>
          <div className="dashboard-user">
            <span className="dashboard-user-info">Agent Dashboard</span>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2>AI Agent Control</h2>
          <p>Ask your AI agent to perform any task on your computer using natural language.</p>
        </div>

        <Card style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Send Command</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
            <Input
              label="What would you like your agent to do?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Show me my CPU usage, Create a folder called 'projects', Take a screenshot"
              disabled={loading}
              style={{ fontSize: "1rem" }}
            />
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Button type="submit" disabled={loading || !prompt.trim()}>
                {loading ? "Processing..." : "Send Command"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPrompt("Show me my system information")}
              >
                System Info
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPrompt("Show me my CPU and memory usage")}
              >
                Resource Usage
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPrompt("List all running processes")}
              >
                List Processes
              </Button>
            </div>
          </form>
        </Card>

        <h3 style={{ marginBottom: "1rem" }}>Command History</h3>

        {sortedIntents.length === 0 ? (
          <Card>
            <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No commands yet. Try sending a command above!
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sortedIntents.map((intent) => {
              const result = results.get(intent.id);
              const status = result?.status || intent.status;
              const statusColor =
                status === "completed"
                  ? "var(--color-success)"
                  : status === "failed"
                  ? "var(--color-error)"
                  : status === "running"
                  ? "var(--color-warning)"
                  : "var(--color-text-secondary)";

              return (
                <Card key={intent.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <h4 style={{ margin: 0 }}>{intent.capabilityId}</h4>
                        <span
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: statusColor,
                            color: "white",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>{intent.reasoning}</p>
                      {Object.keys(intent.parameters).length > 0 && (
                        <details style={{ marginBottom: "0.5rem" }}>
                          <summary
                            style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}
                          >
                            Parameters
                          </summary>
                          <pre
                            style={{
                              background: "var(--color-bg-tertiary)",
                              padding: "0.5rem",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "0.75rem",
                              overflow: "auto",
                              marginTop: "0.5rem",
                            }}
                          >
                            {JSON.stringify(intent.parameters, null, 2)}
                          </pre>
                        </details>
                      )}
                      {result?.result && (
                        <details>
                          <summary
                            style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--color-success)" }}
                          >
                            Result
                          </summary>
                          <pre
                            style={{
                              background: "var(--color-bg-tertiary)",
                              padding: "0.5rem",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "0.75rem",
                              overflow: "auto",
                              marginTop: "0.5rem",
                              maxHeight: "300px",
                            }}
                          >
                            {JSON.stringify(result.result, null, 2)}
                          </pre>
                        </details>
                      )}
                      {result?.error && (
                        <div
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.5rem",
                            marginTop: "0.5rem",
                          }}
                        >
                          <strong style={{ color: "var(--color-error)" }}>Error:</strong>
                          <pre style={{ fontSize: "0.75rem", margin: "0.25rem 0 0 0" }}>{result.error}</pre>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", textAlign: "right" }}>
                      {new Date(intent.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
