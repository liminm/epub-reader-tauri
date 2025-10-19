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
            let uri_path = request.uri().path();
            let decoded_path = urlencoding::decode(uri_path).unwrap_or(std::borrow::Cow::Borrowed(uri_path));
            let full_path = decoded_path.to_string();
            
            println!("epubstream request: {}", full_path);

            // Split into file path and internal zip path
            // We look for ".epub" to find the split point
            let split_index = full_path.rfind(".epub");
            
            if split_index.is_none() {
                 println!("Error: No .epub extension found in path");
                 return tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .unwrap();
            }

            let split_idx = split_index.unwrap() + 5; // +5 for ".epub"
            let file_path_str = &full_path[..split_idx];
            let internal_path = if split_idx < full_path.len() {
                &full_path[split_idx..]
            } else {
                ""
            };

            // Remove leading slash from internal path if present (zip doesn't use them)
            // Also remove "_unpacked" suffix if present (used to trick epub.js)
            let internal_path = internal_path.strip_prefix('/').unwrap_or(internal_path);
            let internal_path = internal_path.strip_prefix("_unpacked").unwrap_or(internal_path);
            let internal_path = internal_path.strip_prefix('/').unwrap_or(internal_path);
            
            println!("File path: {}", file_path_str);
            println!("Internal path: {}", internal_path);

            // If internal path is empty, it means the client is requesting the root directory.
            // Return 200 OK to signal existence.
            if internal_path.is_empty() {
                 return tauri::http::Response::builder()
                    .status(200)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap();
            }

            let file_path = std::path::PathBuf::from(file_path_str);

            if !file_path.exists() {
                println!("Error: File not found at {}", file_path_str);
                return tauri::http::Response::builder()
                    .status(404)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap();
            }

            let file = std::fs::File::open(&file_path).unwrap();
            let mut archive = zip::ZipArchive::new(file).unwrap();

            // If internal path is empty or just slash, we might want to return something else,
            // but usually epub.js asks for specific files.
            
            let mut zip_file = match archive.by_name(internal_path) {
                Ok(file) => file,
                Err(e) => {
                     println!("Error: Could not find {} in zip: {:?}", internal_path, e);
                     return tauri::http::Response::builder()
                        .status(404)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(Vec::new())
                        .unwrap();
                }
            };

            let mut content = Vec::new();
            std::io::Read::read_to_end(&mut zip_file, &mut content).unwrap();

            let mime_type = mime_guess::from_path(internal_path).first_or_octet_stream();

            tauri::http::Response::builder()
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", mime_type.as_ref())
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
