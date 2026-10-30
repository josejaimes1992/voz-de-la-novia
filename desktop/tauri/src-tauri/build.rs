fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["open_external", "open_projector", "toggle_fullscreen", "list_screens", "close_projector"]),
        ),
    )
    .expect("tauri build");
}
