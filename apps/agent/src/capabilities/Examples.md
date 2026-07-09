# Examples

```rust
let registry = CapabilityRegistry::new();
if let Some(cap) = registry.find("system.disk.read_usage") {
    let result = cap.execute(&serde_json::json!({}))?;
}
```
