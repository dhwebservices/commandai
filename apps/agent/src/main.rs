mod capabilities;
mod registry;

use registry::CapabilityRegistry;

#[tokio::main]
async fn main() {
    // Phase 1 stub — no gRPC connection to cloud yet (packages/proto codegen
    // not wired in). Just proves the registry boots.
    let registry = CapabilityRegistry::new();
    println!(
        "commandai-agent starting — {} capabilities registered",
        registry.find("system.disk.read_usage").is_some() as u8
    );
}
