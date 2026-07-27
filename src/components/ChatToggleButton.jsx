// src/components/ChatToggleButton.jsx
import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useCurrentLecture } from "../contexts/CurrentLectureContext";
import DoubtChatbot from "./DoubtChatbot.jsx";

/**
 * GlobalChatToggleButton
 * Renders a fixed floating button (bottom-right) on every page.
 * When on a lecture page the CurrentLectureContext provides the lecture object
 * so the chatbot answers lecture-specific questions.
 */
export default function ChatToggleButton() {
  const [open, setOpen] = useState(false);
  const lecture = useCurrentLecture(); // null on non-lecture pages

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Tutor" : "Open AI Tutor"}
        title={open ? "Close AI Tutor" : "Ask AI Tutor"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: open
            ? "linear-gradient(135deg, #6d28d9, #4f46e5)"
            : "linear-gradient(135deg, #7c3aed, #6366f1)",
          boxShadow: open
            ? "0 8px 32px rgba(99,102,241,0.5)"
            : "0 8px 24px rgba(124,58,237,0.45)",
        }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "rgba(124,58,237,0.3)" }}
          />
        )}
      </button>

      {/* Chatbot panel */}
      {open && <DoubtChatbot lecture={lecture} onClose={() => setOpen(false)} />}
    </>
  );
}
