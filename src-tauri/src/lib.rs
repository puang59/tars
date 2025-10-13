use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::env;
use screenshots::Screen;
use base64::Engine;
use aws_sdk_dynamodb::{Client as DynamoDbClient, types::AttributeValue};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    parts: Vec<MessagePart>,
}

#[derive(Serialize, Deserialize)]
struct MessagePart {
    text: Option<String>,
    inline_data: Option<InlineData>,
}

#[derive(Serialize, Deserialize)]
struct InlineData {
    mime_type: String,
    data: String,
}

#[derive(Serialize, Deserialize)]
struct ConversationData {
    question: String,
    response: String,
    context: String,
    timestamp: String,
    mode: String,
}

#[derive(Serialize, Deserialize)]
struct GeminiRequest {
    contents: Vec<Message>,
}

#[derive(Serialize, Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Serialize, Deserialize)]
struct Candidate {
    content: Content,
}

#[derive(Serialize, Deserialize)]
struct Content {
    parts: Vec<MessagePart>,
}

#[tauri::command]
async fn send_message_to_gemini(messages: Vec<Message>) -> Result<String, String> {
    // Get API key from environment variable
    let api_key = env::var("GOOGLE_API_KEY")
        .map_err(|_| "GOOGLE_API_KEY environment variable not set".to_string())?;
    
    let client = reqwest::Client::new();
    
    let request_body = GeminiRequest {
        contents: messages,
    };
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key={}",
        api_key
    );
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    // Log the response status and body for debugging
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    if !status.is_success() {
        return Err(format!("API returned error {}: {}", status, response_text));
    }
    
    let gemini_response: GeminiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}. Response was: {}", e, response_text))?;
    
    gemini_response
        .candidates
        .first()
        .and_then(|c| c.content.parts.first())
        .and_then(|p| p.text.clone())
        .ok_or_else(|| format!("No response from Gemini. Full response: {}", response_text))
}

#[tauri::command]
async fn take_screenshot() -> Result<Vec<u8>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if let Some(screen) = screens.first() {
        let image = screen.capture().map_err(|e| format!("Failed to capture screen: {}", e))?;
        Ok(image.into_raw())
    } else {
        Err("No screens found".to_string())
    }
}

#[tauri::command]
async fn toggle_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
async fn screenshot_and_show_window(app: tauri::AppHandle) -> Result<Vec<u8>, String> {
    // Take screenshot first
    let screenshot_data = take_screenshot().await?;
    
    // Show the window
    toggle_window(app).await?;
    
    Ok(screenshot_data)
}

#[tauri::command]
async fn send_screenshot_to_gemini(prompt: String) -> Result<String, String> {
    // Take screenshot and convert to PNG format
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    let screen = screens.first().ok_or("No screens found")?;
    let image = screen.capture().map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    // Convert image to PNG bytes
    let mut png_bytes = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, image.width(), image.height());
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|e| format!("Failed to create PNG encoder: {}", e))?;
        writer.write_image_data(&image.into_raw()).map_err(|e| format!("Failed to write PNG data: {}", e))?;
    }
    
    // Convert PNG to base64
    let base64_image = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    
    // Debug logging
    println!("📸 PNG size: {} bytes", png_bytes.len());
    println!("📸 Base64 size: {} chars", base64_image.len());
    
    // Get API key
    let api_key = env::var("GOOGLE_API_KEY")
        .map_err(|_| "GOOGLE_API_KEY environment variable not set".to_string())?;
    
    // Create message with text and image
    let message = Message {
        role: "user".to_string(),
        parts: vec![
            MessagePart {
                text: Some(prompt),
                inline_data: None,
            },
            MessagePart {
                text: None,
                inline_data: Some(InlineData {
                    mime_type: "image/png".to_string(),
                    data: base64_image,
                }),
            },
        ],
    };
    
    let request_body = GeminiRequest {
        contents: vec![message],
    };
    
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key={}",
        api_key
    );
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    if !status.is_success() {
        return Err(format!("API returned error {}: {}", status, response_text));
    }
    
    let gemini_response: GeminiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}. Response was: {}", e, response_text))?;
    
    gemini_response
        .candidates
        .first()
        .and_then(|c| c.content.parts.first())
        .and_then(|p| p.text.clone())
        .ok_or_else(|| format!("No response from Gemini. Full response: {}", response_text))
}

#[tauri::command]
async fn store_conversation(conversation_data: ConversationData) -> Result<String, String> {
    println!("📝 Storing conversation:");
    println!("  Question: {}", conversation_data.question);
    println!("  Response: {}", conversation_data.response);
    println!("  Context: {}", conversation_data.context);
    println!("  Timestamp: {}", conversation_data.timestamp);
    println!("  Mode: {}", conversation_data.mode);
    
    // Initialize AWS DynamoDB client with explicit region
    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let dynamodb_config = aws_sdk_dynamodb::config::Builder::from(&config)
        .region(aws_sdk_dynamodb::config::Region::new("us-east-1"))
        .build();
    let client = DynamoDbClient::from_conf(dynamodb_config);
    
    let id = Uuid::new_v4().to_string();
    
    // Prepare item for DynamoDB
    let mut item = std::collections::HashMap::new();
    item.insert("id".to_string(), AttributeValue::S(id.clone()));
    item.insert("question".to_string(), AttributeValue::S(conversation_data.question));
    item.insert("response".to_string(), AttributeValue::S(conversation_data.response));
    item.insert("context".to_string(), AttributeValue::S(conversation_data.context));
    item.insert("timestamp".to_string(), AttributeValue::S(conversation_data.timestamp));
    item.insert("mode".to_string(), AttributeValue::S(conversation_data.mode));
    
    // Store in DynamoDB
    let request = client
        .put_item()
        .table_name("tars-conversations")
        .set_item(Some(item));
    
    match request.send().await {
        Ok(response) => {
            println!("✅ Conversation stored in DynamoDB with ID: {}", id);
            println!("📊 DynamoDB Response: {:?}", response);
            Ok(format!("Conversation stored with ID: {}", id))
        }
        Err(e) => {
            println!("❌ Error storing in DynamoDB: {}", e);
            println!("🔍 Error details: {:?}", e);
            Err(format!("Failed to store in DynamoDB: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            toggle_window, 
            send_message_to_gemini,
            take_screenshot,
            screenshot_and_show_window,
            send_screenshot_to_gemini,
            store_conversation
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
