import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", free: false },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", free: true },
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", free: false },
  { id: "qwen/qwen3-32b", name: "Qwen 3 (Preview)", free: true },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", free: true },
];

const LOCAL_MODELS = [
  { id: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf", name: "Qwen 2.5 Coder (Local)", free: true },
  { id: "Phi-4-mini-instruct-Q4_K_M.gguf", name: "Phi-4 Mini (Local)", free: true },
];

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void;
  isLocal?: boolean;
}

export default function ModelSelector({ onModelChange, isLocal = false }: ModelSelectorProps) {
  const models = isLocal ? LOCAL_MODELS : GROQ_MODELS;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);

  // Update selected model when switching between local/remote if necessary
  useEffect(() => {
    setSelectedModel(models[0]);
    onModelChange?.(models[0].id);
  }, [isLocal]);

  const handleModelSelect = (model: (typeof GROQ_MODELS)[0]) => {
    setSelectedModel(model);
    onModelChange?.(model.id);
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "6px",
          padding: "4px 10px",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "500",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        }}
      >
        {selectedModel.name}
        <ChevronDown size={14} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "6px",
              minWidth: "200px",
              zIndex: 10000,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#a1a1aa",
                padding: "6px 10px",
                fontWeight: "500",
              }}
            >
              {isLocal ? "Local Models" : "Free Models"}
            </div>
            {models.filter((m: any) => m.free).map((model: any) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  backgroundColor:
                    selectedModel.id === model.id
                      ? "rgba(59, 130, 246, 0.2)"
                      : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (selectedModel.id !== model.id) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedModel.id !== model.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {model.name}
                {selectedModel.id === model.id && (
                  <span style={{ color: "#3b82f6" }}>✓</span>
                )}
              </button>
            ))}

            {!isLocal && (
              <>
                <div
                  style={{
                    height: "1px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    margin: "6px 0",
                  }}
                />

                <div
                  style={{
                    fontSize: "11px",
                    color: "#a1a1aa",
                    padding: "6px 10px",
                    fontWeight: "500",
                  }}
                >
                  Premium Models
                </div>
                {models.filter((m: any) => !m.free).map((model: any) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      backgroundColor:
                        selectedModel.id === model.id
                          ? "rgba(59, 130, 246, 0.2)"
                          : "transparent",
                      border: "none",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedModel.id !== model.id) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.08)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedModel.id !== model.id) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {model.name}
                    {selectedModel.id === model.id && (
                      <span style={{ color: "#3b82f6" }}>✓</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
