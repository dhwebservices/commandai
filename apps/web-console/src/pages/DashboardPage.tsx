import { useAuth } from "../lib/auth-context";
import { Button, Card } from "@comandr/ui-kit";

export function DashboardPage() {
  const { session, setSession } = useAuth();

  if (!session) return null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <a href="/" className="dashboard-logo">
            Comandr
          </a>
          <div className="dashboard-user">
            <span className="dashboard-user-info">User ID: {session.userId}</span>
            <Button size="sm" variant="secondary" onClick={() => setSession(null)}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2>Welcome to Comandr</h2>
          <p>Your intelligent automation platform for managing and orchestrating AI agents.</p>
        </div>

        <div className="dashboard-grid">
          <div onClick={() => (window.location.href = "/agent")} style={{ cursor: "pointer" }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <h3>AI Agent</h3>
                <span className="card-badge" style={{ background: "var(--color-success)", color: "white" }}>
                  ACTIVE
                </span>
              </div>
              <p>Control your desktop AI agent with natural language commands. Click to open agent dashboard.</p>
            </Card>
          </div>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3>Intents</h3>
              <span className="card-badge">Coming soon</span>
            </div>
            <p>Track and monitor intent execution, status updates, and action results.</p>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3>Policies</h3>
              <span className="card-badge">Coming soon</span>
            </div>
            <p>Configure security policies, capability restrictions, and tenant permissions.</p>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3>Audit Logs</h3>
              <span className="card-badge">Coming soon</span>
            </div>
            <p>Review audit events, compliance records, and system activity logs.</p>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3>Enrollment</h3>
              <span className="card-badge">Coming soon</span>
            </div>
            <p>Generate enrollment tokens for onboarding new agents to your tenant.</p>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3>Settings</h3>
              <span className="card-badge">Coming soon</span>
            </div>
            <p>Manage tenant settings, team members, and billing configuration.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
