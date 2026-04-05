use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::env;
use lazy_static::lazy_static;
use screenshots::Screen;
use base64::Engine;
use aws_sdk_dynamodb::{Client as DynamoDbClient, types::AttributeValue};
use uuid::Uuid;
use std::sync::{Mutex, Arc};
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::{LlamaModel, Special};
use llama_cpp_2::llama_batch::LlamaBatch;
use dirs;

#[derive(Serialize, Deserialize)]
struct GroqMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct GroqRequest {
    model: String,
    messages: Vec<GroqMessage>,
}

#[derive(Serialize, Deserialize)]
struct GroqResponse {
    choices: Vec<Choice>,
}

#[derive(Serialize, Deserialize)]
struct Choice {
    message: GroqMessageResponse,
}

#[derive(Serialize, Deserialize)]
struct GroqMessageResponse {
    content: String,
}

#[derive(Serialize, Deserialize)]
struct ConversationData {
    question: String,
    response: String,
    context: String,
    timestamp: String,
    mode: String,
}

#[tauri::command]
async fn send_message_to_groq(model: String, messages: Vec<GroqMessage>) -> Result<String, String> {
    // Get API key from environment variable
    let api_key = env::var("GROQ_API_KEY")
        .map_err(|_| "GROQ_API_KEY environment variable not set".to_string())?;
    
    let client = reqwest::Client::new();
    
    let request_body = GroqRequest {
        model,
        messages,
    };
    
    let url = "https://api.groq.com/openai/v1/chat/completions";
    
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
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
    
    let groq_response: GroqResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}. Response was: {}", e, response_text))?;
    
    groq_response
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| format!("No response from Groq. Full response: {}", response_text))
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
async fn send_screenshot_to_groq(prompt: String) -> Result<String, String> {
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
    let api_key = env::var("GROQ_API_KEY")
        .map_err(|_| "GROQ_API_KEY environment variable not set".to_string())?;
    
    // Create message with text and image
    let message = GroqMessage {
        role: "user".to_string(),
        content: serde_json::json!([
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": format!("data:image/png;base64,{}", base64_image)
                }
            }
        ]),
    };
    
    let request_body = GroqRequest {
        model: "meta-llama/llama-4-scout-17b-16e-instruct".to_string(),
        messages: vec![message],
    };
    
    let client = reqwest::Client::new();
    let url = "https://api.groq.com/openai/v1/chat/completions";
    
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
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
    
    let groq_response: GroqResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}. Response was: {}", e, response_text))?;
    
    groq_response
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| format!("No response from Groq. Full response: {}", response_text))
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

lazy_static! {
    static ref LLAMA_BACKEND: LlamaBackend = LlamaBackend::init().expect("Failed to initialize llama backend");
    static ref CURRENT_MODEL: Mutex<Option<(String, Arc<LlamaModel>)>> = Mutex::new(None);
}

#[tauri::command]
async fn send_message_locally(model_name: String, prompt: String) -> Result<String, String> {
    let mut model_path = dirs::home_dir().ok_or("Home directory not found")?;
    model_path.push("tars/models");
    model_path.push(&model_name);

    if !model_path.exists() {
        return Err(format!("Model file not found at: {:?}", model_path));
    }

    let model = {
        let mut current = CURRENT_MODEL.lock().map_err(|e| e.to_string())?;
        if let Some((name, m)) = current.as_ref() {
            if name == &model_name {
                m.clone()
            } else {
                let mut params = LlamaModelParams::default();
                // Use GPU if possible (optional, but good for performance)
                // params.set_n_gpu_layers(100); 
                let m = LlamaModel::load_from_file(&LLAMA_BACKEND, &model_path, &params)
                    .map_err(|e| format!("Failed to load model: {}", e))?;
                let arc_m = Arc::new(m);
                *current = Some((model_name.clone(), arc_m.clone()));
                arc_m
            }
        } else {
            let mut params = LlamaModelParams::default();
            let m = LlamaModel::load_from_file(&LLAMA_BACKEND, &model_path, &params)
                .map_err(|e| format!("Failed to load model: {}", e))?;
            let arc_m = Arc::new(m);
            *current = Some((model_name.clone(), arc_m.clone()));
            arc_m
        }
    };

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(std::num::NonZeroU32::new(2048));
    
    let mut ctx = model
        .new_context(&LLAMA_BACKEND, ctx_params)
        .map_err(|e| format!("Failed to create context: {}", e))?;

    let tokens = model
        .str_to_token(&prompt, llama_cpp_2::model::AddBos::Always)
        .map_err(|e| format!("Failed to tokenize prompt: {}", e))?;

    let n_ctx = ctx.n_ctx() as usize;
    if tokens.len() >= n_ctx {
        return Err(format!("Prompt is too long ({} tokens, limit is {})", tokens.len(), n_ctx));
    }

    let mut batch = LlamaBatch::new(2048, 1);
    let last_token_index = tokens.len() as i32 - 1;
    for (i, token) in tokens.into_iter().enumerate() {
        batch.add(token, i as i32, &[0], i as i32 == last_token_index)
            .map_err(|_| "Failed to add token to batch")?;
    }

    ctx.decode(&mut batch).map_err(|e| format!("Decode failed: {}", e))?;

    let mut response_bytes = Vec::new();
    let mut n_cur = batch.n_tokens();
    let mut sampler = llama_cpp_2::sampling::LlamaSampler::chain_simple([
        llama_cpp_2::sampling::LlamaSampler::dist(42),
        llama_cpp_2::sampling::LlamaSampler::temp(0.7),
        // Add a small repetition penalty to prevent loops
        // repeat_last_n: 64, repeat_penalty: 1.1, frequency_penalty: 0.0, presence_penalty: 0.0
        llama_cpp_2::sampling::LlamaSampler::penalties(64, 1.1, 0.0, 0.0),
    ]);

    let stop_sequences = [
        "<|im_end|>",
        "<|im_start|>",
        "\nUser:",
        "\nAssistant:",
    ];

    while n_cur < 2048 {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        if let Ok(output) = model.token_to_str(token, Special::Plaintext) {
            response_bytes.extend_from_slice(output.as_bytes());
        }

        // Check for stop sequences
        let current_text = String::from_utf8_lossy(&response_bytes);
        let mut should_stop = false;
        for stop_seq in &stop_sequences {
            if current_text.contains(stop_seq) {
                should_stop = true;
                // Trim the stop sequence from the final output
                if let Some(idx) = current_text.find(stop_seq) {
                    response_bytes.truncate(idx);
                }
                break;
            }
        }

        if should_stop {
            break;
        }

        batch.clear();
        batch.add(token, n_cur, &[0], true).map_err(|_| "Failed to add token to batch")?;
        ctx.decode(&mut batch).map_err(|e| format!("Decode failed at {}: {}", n_cur, e))?;
        n_cur += 1;
    }

    let response = String::from_utf8_lossy(&response_bytes).into_owned();
    Ok(response)
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
            send_message_to_groq,
            take_screenshot,
            screenshot_and_show_window,
            send_screenshot_to_groq,
            store_conversation,
            send_message_locally
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
