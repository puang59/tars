fn main() {
    // Ensure the C compiler and CMake use the correct macOS deployment target
    println!("cargo:rustc-env=MACOSX_DEPLOYMENT_TARGET=11.0");
    std::env::set_var("MACOSX_DEPLOYMENT_TARGET", "11.0");
    std::env::set_var("CMAKE_OSX_DEPLOYMENT_TARGET", "11.0");

    // Tell Cargo to rerun if Info.plist changes
    println!("cargo:rerun-if-changed=Info.plist");
    tauri_build::build()
}
