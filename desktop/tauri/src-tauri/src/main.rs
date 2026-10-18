// Voz de la Novia para Windows: ventana propia + servidor local escondido (vdn-server.exe)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_opener::OpenerExt;

const PORT: u16 = 4747;
const INIT: &str = include_str!("init.js");

struct Server(Mutex<Option<Child>>);

fn server_up() -> bool {
    let addr = format!("127.0.0.1:{PORT}").parse().unwrap();
    TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
}

fn data_dir() -> std::path::PathBuf {
    let base = std::env::var("LOCALAPPDATA").or_else(|_| std::env::var("HOME")).unwrap_or_else(|_| ".".into());
    let d = std::path::Path::new(&base).join("VozDeLaNovia");
    let _ = std::fs::create_dir_all(&d);
    d
}

fn start_server() -> Result<Option<Child>, String> {
    if server_up() { return Ok(None); }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("sin carpeta")?;
    let srv = dir.join(if cfg!(windows) { "vdn-server.exe" } else { "vdn-server" });
    let mut c = Command::new(&srv);
    c.env("VDN_NO_OPEN", "1").env("VDN_NATIVE", "1").env("VDN_PARENT_PID", std::process::id().to_string()).env("VDN_VERSION", env!("CARGO_PKG_VERSION"));
    if let Ok(log) = std::fs::File::create(data_dir().join("servidor.log")) {
        if let Ok(l2) = log.try_clone() { c.stdout(log).stderr(l2); }
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000); // sin ventana de consola
    }
    c.spawn().map(Some).map_err(|e| format!("No se pudo iniciar {}: {e}", srv.display()))
}

fn app_url(path: &str) -> Url { Url::parse(&format!("http://localhost:{PORT}{path}")).unwrap() }

#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) {
    let _ = app.opener().open_url(url, None::<&str>);
}

#[tauri::command]
fn open_projector(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("proyector") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    let monitors = app.available_monitors().unwrap_or_default();
    let primary = app.primary_monitor().ok().flatten();
    let second = monitors.iter().find(|m| match &primary { Some(p) => p.position() != m.position(), None => false });
    let mut b = WebviewWindowBuilder::new(&app, "proyector", WebviewUrl::External(app_url("/proyector")))
        .title("Voz de la Novia — Proyector")
        .initialization_script(INIT)
        .background_color(tauri::window::Color(0, 0, 0, 255));
    if let Some(m) = second {
        let sf = m.scale_factor();
        let p = m.position().to_logical::<f64>(sf);
        let s = m.size().to_logical::<f64>(sf);
        b = b.position(p.x, p.y).inner_size(s.width, s.height).decorations(false);
    } else {
        b = b.inner_size(1280.0, 720.0);
    }
    let w = b.build().map_err(|e| e.to_string())?;
    if second.is_some() {
        let _ = w.set_fullscreen(true);
        if let Some(main) = app.get_webview_window("main") { let _ = main.set_focus(); }
    }
    Ok(())
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) {
    let fs = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!fs);
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(Server(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![open_external, open_projector, toggle_fullscreen])
        .setup(|app| {
            let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Voz de la Novia")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .maximized(true)
                .initialization_script(INIT)
                .background_color(tauri::window::Color(0, 0, 0, 255))
                .build()?;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let started = start_server();
                match started {
                    Ok(child) => { *handle.state::<Server>().0.lock().unwrap() = child; }
                    Err(e) => {
                        let msg = e.replace('\\', "\\\\").replace('\'', "\\'");
                        let _ = main.eval(&format!("var e=document.getElementById('e');e.style.display='block';e.textContent='{msg}'"));
                        return;
                    }
                }
                let t0 = Instant::now();
                while !server_up() && t0.elapsed() < Duration::from_secs(60) { std::thread::sleep(Duration::from_millis(250)); }
                if server_up() { let _ = main.navigate(app_url("/")); }
                else { let _ = main.eval("var e=document.getElementById('e');e.style.display='block';e.textContent='El servidor no respondió. Cierra y vuelve a abrir el programa.'"); }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { .. } = event { window.app_handle().exit(0); }
            }
        })
        .build(tauri::generate_context!())
        .expect("no se pudo iniciar Voz de la Novia");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut c) = handle.state::<Server>().0.lock().unwrap().take() { let _ = c.kill(); }
        }
    });
}
