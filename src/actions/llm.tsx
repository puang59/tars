import { invoke } from "@tauri-apps/api/core";
import { ConversationManager } from "../utils/conversationManager";
import { textPrompt } from "../utils/prompts";

const conversationManager = new ConversationManager();

// Note: UI allows model selection, we will pass model down if needed. Defaulting to llama-3.1-8b-instant.
export async function sendMessage(model: string, context: string, userInput: string, isLocal: boolean = false) {
  conversationManager.addMessage("user", userInput);

  const history = conversationManager.getHistory();

  const messages = history.map((msg) => ({
    role: msg.role === "tars" ? "assistant" : "user",
    content: msg.parts.map(p => p.text).join(""),
  }));

  const systemInstruction = {
    role: "system",
    content: textPrompt(context),
  };

  const finalMessages = [systemInstruction, ...messages];

  try {
    let response: string;
    
    if (isLocal) {
      console.log("🤖 Sending message to local model:", model);
      // Construct prompt for local model (simplified)
      // Use ChatML format for better instruction following and turn-taking
      const localPrompt = `<|im_start|>system\n${systemInstruction.content}<|im_end|>\n<|im_start|>user\n${userInput}<|im_end|>\n<|im_start|>assistant\n`;
      response = await invoke("send_message_locally", {
        modelName: model, // This should be the filename
        prompt: localPrompt,
      });
    } else {
      console.log("🌐 Sending message to Groq:", model);
      response = await invoke("send_message_to_groq", {
        model: model || "llama-3.1-8b-instant",
        messages: finalMessages,
      });
    }

    conversationManager.addMessage("tars", response as string);

    return response as string;
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}
