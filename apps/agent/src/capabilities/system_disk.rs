use crate::capabilities::{Capability, RiskLevel};
use serde_json::{json, Value};

/// Mirrors "system.disk.read_usage" in packages/testing-utils fixtures.
/// Read-only, no confirmation required.
pub struct ReadDiskUsage;

impl Capability for ReadDiskUsage {
    fn id(&self) -> &'static str {
        "system.disk.read_usage"
    }

    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Read
    }

    fn requires_confirmation(&self) -> bool {
        false
    }

    fn execute(&self, _parameters: &Value) -> Result<Value, String> {
        // Phase 1 stub — real disk-usage query not yet implemented.
        Ok(json!({ "used_bytes": 0, "total_bytes": 0 }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_read_risk_level_and_no_confirmation() {
        let cap = ReadDiskUsage;
        assert_eq!(cap.risk_level(), RiskLevel::Read);
        assert!(!cap.requires_confirmation());
    }

    #[test]
    fn execute_returns_well_formed_json() {
        let cap = ReadDiskUsage;
        let result = cap.execute(&json!({})).unwrap();
        assert!(result.get("used_bytes").is_some());
    }
}
