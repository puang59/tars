fn main() {
    // Tell Cargo to rerun if Info.plist changes
    println!("cargo:rerun-if-changed=Info.plist");
    tauri_build::build()
}
