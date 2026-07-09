use crate::capabilities::system_disk::ReadDiskUsage;
use crate::capabilities::Capability;

/// The only way to obtain a runnable Capability. No code path constructs
/// or dispatches a Capability outside this registry — this is what makes
/// "no arbitrary command execution" enforceable rather than aspirational
/// on the agent side.
pub struct CapabilityRegistry {
    capabilities: Vec<Box<dyn Capability>>,
}

impl CapabilityRegistry {
    pub fn new() -> Self {
        Self {
            capabilities: vec![Box::new(ReadDiskUsage)],
        }
    }

    pub fn find(&self, id: &str) -> Option<&dyn Capability> {
        self.capabilities
            .iter()
            .find(|c| c.id() == id)
            .map(|c| c.as_ref())
    }
}

impl Default for CapabilityRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_registered_capability() {
        let registry = CapabilityRegistry::new();
        assert!(registry.find("system.disk.read_usage").is_some());
    }

    #[test]
    fn returns_none_for_unregistered_id() {
        let registry = CapabilityRegistry::new();
        assert!(registry.find("nonexistent.capability").is_none());
    }
}
