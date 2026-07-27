// src/utils/aiClient.js
/** Centralised Gemini client used by all AI-powered features. */
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY;
}

function normaliseGeminiError(status, apiError) {
  const message = apiError?.message || `HTTP ${status}`;
  const quotaExceeded =
    status === 429 || apiError?.status === "RESOURCE_EXHAUSTED";

  if (quotaExceeded) {
    return new Error(
      "Gemini quota exceeded for this project. Add billing, wait for quota reset, or switch to a key/project with available quota."
    );
  }

  if (status === 401 || status === 403) {
    return new Error(
      "Gemini rejected the request. Verify the API key, project permissions, and Gemini API access for this key."
    );
  }

  return new Error(message);
}

export async function callGemini(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set VITE_GEMINI_API_KEY or VITE_AI_API_KEY in your env file."
    );
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1500 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw normaliseGeminiError(response.status, err?.error);
  }

  const result = await response.json();
  const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!raw.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}
