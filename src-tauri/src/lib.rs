// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs::File;
use std::io::Read;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, calculate_book_hash])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
