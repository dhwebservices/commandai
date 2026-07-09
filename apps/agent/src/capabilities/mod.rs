use serde_json::Value;

pub mod system_disk;

/// Risk level mirrors packages/schema CapabilityRiskLevel. Kept in sync
/// manually until shared codegen exists (see orchestrator/app/intents/models.py
/// for the same note on the Python side).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RiskLevel {
    Read,
    Mutate,
    Destructive,
}

/// Every capability the agent can perform implements this trait. The
/// agent's dispatcher (not yet built in Phase 1) will only ever invoke
/// capabilities through this interface — there is no path from a received
/// Intent to raw command execution. See Non-Negotiable #2 and ADR-002.
pub trait Capability {
    fn id(&self) -> &'static str;
    fn risk_level(&self) -> RiskLevel;
    fn requires_confirmation(&self) -> bool;

    /// Executes the capability with validated parameters. Implementations
    /// must not accept or interpret raw shell strings — parameters are
    /// structured, typed values only.
    fn execute(&self, parameters: &Value) -> Result<Value, String>;
}
