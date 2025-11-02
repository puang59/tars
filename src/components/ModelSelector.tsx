import { ChevronDown } from "lucide-react";
import { useState } from "react";

const MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", free: true },
  { id: "grok-4-fast", name: "Grok 4 Fast", free: true },
  { id: "grok-3-mini", name: "Grok 3 Mini", free: true },
  { id: "qwen-3-32b", name: "Qwen 3 32B", free: false },
  { id: "qwen-3-vl-8b", name: "Qwen 3 VL 8B", free: false },
  { id: "qwen-3-4b", name: "Qwen 3 4B", free: true },
];

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void;
}

export default function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  const handleModelSelect = (model: (typeof MODELS)[0]) => {
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
              zIndex: 999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "6px",
              minWidth: "200px",
              zIndex: 1000,
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
              Free Models
            </div>
            {MODELS.filter((m) => m.free).map((model) => (
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
            {MODELS.filter((m) => !m.free).map((model) => (
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
          </div>
        </>
      )}
    </div>
  );
}
