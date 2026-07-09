# API

```rust
trait Capability {
    fn id(&self) -> &'static str;
    fn risk_level(&self) -> RiskLevel;
    fn requires_confirmation(&self) -> bool;
    fn execute(&self, parameters: &Value) -> Result<Value, String>;
}

impl CapabilityRegistry {
    fn find(&self, id: &str) -> Option<&dyn Capability>;
}
```
