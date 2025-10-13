import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface StoreToDBProps {
  conversationData?: {
    question: string;
    response: string;
    context: string;
    timestamp: string;
    mode: "clipboard" | "screenshot";
  };
}

export default function StoreToDB({ conversationData }: StoreToDBProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isStoring, setIsStoring] = useState(false);

  const storeConversation = async (shouldStore: boolean = true) => {
    console.log("🔄 storeConversation called");
    console.log("📊 conversationData:", conversationData);
    console.log("✅ shouldStore:", shouldStore);

    if (!conversationData || !shouldStore) {
      console.log("❌ Early return - no data or not enabled");
      return;
    }

    setIsStoring(true);
    try {
      // Store in localStorage
      const existingData = JSON.parse(
        localStorage.getItem("tars-conversations") || "[]"
      );
      const newData = [...existingData, conversationData];
      localStorage.setItem("tars-conversations", JSON.stringify(newData));
      console.log("💾 Stored in localStorage:", newData.length, "items");

      // Store in DynamoDB via Tauri command
      console.log("🚀 Calling Tauri store_conversation...");
      const result = await invoke("store_conversation", { conversationData });
      console.log("✅ Tauri result:", result);

      console.log("🎉 Conversation stored successfully");
    } catch (error) {
      console.error("❌ Error storing conversation:", error);
      alert(`Failed to store conversation: ${error}`);
    } finally {
      setIsStoring(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    console.log("🔘 Checkbox changed to:", checked);
    console.log("📊 Available conversationData:", conversationData);
    setIsEnabled(checked);

    if (checked && conversationData) {
      console.log(
        "✅ Checkbox checked and data available, calling storeConversation"
      );
      storeConversation(checked); // Pass the checked state directly
    } else {
      console.log(
        "❌ Cannot store - checked:",
        checked,
        "data available:",
        !!conversationData
      );
    }
  };

  return (
    <div className="flex flex-row items-center gap-1.5">
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={handleCheckboxChange}
        disabled={isStoring}
        style={{
          width: "16px",
          height: "16px",
          cursor: isStoring ? "not-allowed" : "pointer",
          opacity: isStoring ? 0.6 : 1,
        }}
      />
      <span className="text-white text-md">
        {isStoring ? "Storing..." : "Record Conversation"}
      </span>
    </div>
  );
}
