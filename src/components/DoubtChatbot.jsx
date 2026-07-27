// src/components/DoubtChatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import { X, Trash2, Send, Bot, User, Sparkles } from "lucide-react";
import { callGemini } from "../utils/aiClient";

const MAX_SESSION_MESSAGES = 40;

function getWelcomeMessage(lecture, cleared = false) {
  if (lecture) {
    return {
      role: "assistant",
      text: cleared
        ? `Conversation cleared. Ask me anything about **${lecture.title}**.`
        : `Hi! I'm your AI tutor for **${lecture.title}**. Ask me anything about this lecture.`,
    };
  }

  return {
    role: "assistant",
    text: cleared
      ? "Conversation cleared. How can I help you?"
      : "Hi! I'm your AI tutor. Ask me any educational question and I'll help you out.",
  };
}

function getStorageKey(lecture) {
  return lecture?.id
    ? `cognitrix-chat:lecture:${lecture.id}`
    : "cognitrix-chat:general";
}

function loadStoredMessages(lecture) {
  if (typeof window === "undefined") {
    return [getWelcomeMessage(lecture)];
  }

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(lecture));
    if (!raw) {
      return [getWelcomeMessage(lecture)];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [getWelcomeMessage(lecture)];
    }

    return parsed.filter(
      (msg) =>
        msg &&
        (msg.role === "assistant" || msg.role === "user") &&
        typeof msg.text === "string"
    );
  } catch {
    return [getWelcomeMessage(lecture)];
  }
}

function persistMessages(lecture, messages) {
  if (typeof window === "undefined") return;

  try {
    const trimmed = messages.slice(-MAX_SESSION_MESSAGES);
    window.sessionStorage.setItem(
      getStorageKey(lecture),
      JSON.stringify(trimmed)
    );
  } catch {
    // Ignore storage failures; chat still works in-memory.
  }
}

/**
 * DoubtChatbot
 * Props:
 *   lecture  – current lecture object (or null when not on lecture page)
 *   onClose  – callback to close the chatbot overlay
 */
export default function DoubtChatbot({ lecture = null, onClose }) {
  const [messages, setMessages] = useState(() => loadStoredMessages(lecture));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const storageKey = getStorageKey(lecture);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages(loadStoredMessages(lecture));
  }, [storageKey, lecture]);

  useEffect(() => {
    persistMessages(lecture, messages);
  }, [lecture, messages]);

  const buildPrompt = (question) => {
    const lectureCtx = lecture
      ? `You are an AI tutor helping a student understand the following lecture.\n\nLecture Title: ${lecture.title}\n${
          lecture.transcript_text
            ? `Transcript excerpt:\n${lecture.transcript_text.slice(0, 3000)}`
            : ""
        }${
          lecture.topic_timestamps?.length
            ? `\nTopics covered: ${lecture.topic_timestamps
                .map((t) => t.label || t.topic)
                .join(", ")}`
            : ""
        }\n\nAnswer the following student question in a clear, concise, educational manner:`
      : "You are a helpful AI tutor. Answer the following educational question clearly and concisely:";

    return `${lectureCtx}\n\n${question}`;
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const raw = await callGemini(buildPrompt(trimmed));
      setMessages((prev) => [...prev, { role: "assistant", text: raw }]);
    } catch (e) {
      const fallback =
        e?.message ||
        "Sorry, I couldn't process that request right now.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: fallback,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () =>
    setMessages([getWelcomeMessage(lecture, true)]);

  // Simple markdown-ish bold renderer
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat panel */}
      <div
        className="fixed bottom-24 right-6 z-50 w-[22rem] sm:w-[26rem] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "rgba(15, 15, 30, 0.82)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          maxHeight: "520px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">AI Tutor</p>
              <p className="text-[10px] text-indigo-300 leading-tight">
                {lecture ? `📖 ${lecture.title}` : "General Education Mode"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  msg.role === "user"
                    ? "bg-indigo-500"
                    : "bg-gradient-to-br from-violet-600 to-indigo-700"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white/10 text-gray-100 rounded-bl-sm"
                }`}
                style={{ wordBreak: "break-word" }}
              >
                {renderText(msg.text)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-3 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-1.5">
            Powered by Gemini 3.5 Flash-Lite
          </p>
        </div>
      </div>
    </>
  );
}
