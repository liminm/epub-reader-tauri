// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs::File;
use std::io::Read;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use epub::doc::EpubDoc;
use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
fn calculate_book_hash(file_path: String) -> Result<String, String> {
    let mut file = File::open(&file_path).map_err(|e| e.to_string())?;
    let file_size = file.metadata().map_err(|e| e.to_string())?.len();
    
    let mut buffer = [0u8; 8192];
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    
    let mut data = Vec::with_capacity(bytes_read + 8);
    data.extend_from_slice(&buffer[0..bytes_read]);
    data.extend_from_slice(&file_size.to_le_bytes());
    
    let digest = md5::compute(&data);
    Ok(format!("{:x}", digest))
}

#[derive(serde::Serialize)]
struct EpubMetadata {
    title: Option<String>,
    creator: Option<String>,
    cover_base64: Option<String>,
}

#[tauri::command]
fn parse_epub_metadata(file_path: String) -> Result<EpubMetadata, String> {
    let mut doc = EpubDoc::new(&file_path).map_err(|e| e.to_string())?;
    
    // mdata returns Option<String> in some versions, but error suggests Option<&MetadataItem>
    // We convert to string to be safe.
    let title = doc.mdata("title").map(|s| s.value.to_string());
    let creator = doc.mdata("creator").map(|s| s.value.to_string());
    
    let cover_base64 = doc.get_cover().map(|(data, mime)| {
        let base64 = general_purpose::STANDARD.encode(data);
        format!("data:{};base64,{}", mime, base64)
    });

    Ok(EpubMetadata {
        title,
        creator,
        cover_base64,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("epubstream", |_app, request| {
            let path = request.uri().path();
            let path = urlencoding::decode(path).unwrap_or(std::borrow::Cow::Borrowed(path));
            let path = path.to_string();
            
            // On Linux, the path from the URI might be something like "/home/user/..."
            // We need to ensure it's treated as an absolute path.
            let file_path = std::path::PathBuf::from(&path);

            if !file_path.exists() {
                return tauri::http::Response::builder()
                    .status(404)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap();
            }

            let content = std::fs::read(&file_path).unwrap_or_default();
            
            tauri::http::Response::builder()
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", "application/epub+zip")
                .body(content)
                .unwrap()
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, calculate_book_hash, parse_epub_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
