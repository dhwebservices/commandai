// Minimal desktop shell — hosts the web-console UI (login/signup/dashboard).
// No native capabilities wired in yet (that's the agent's job, ADR-002);
// this is purely a lightweight native window around the same UI that
// otherwise runs in a browser, per the founder's request for a
// downloadable app during Phase 1 UI review.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running CommandAI desktop shell");
}
