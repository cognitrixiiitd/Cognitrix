/**
 * lectureQuizGenerator.js
 *
 * Generates quiz questions from a lecture's transcript / topic timestamps.
 * Uses Gemini 2.0 Flash when an API key is available, falls back to rule-based
 * generation otherwise.
 */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Build a concise context string from the lecture object.
 */
function buildLectureContext(lecture) {
  const parts = [];

  if (lecture.title) {
    parts.push(`Lecture Title: ${lecture.title}`);
  }

  if (lecture.ai_generated_description) {
    parts.push(`\nDescription:\n${lecture.ai_generated_description}`);
  }

  if (lecture.topic_timestamps && lecture.topic_timestamps.length > 0) {
    const topicLines = lecture.topic_timestamps
      .map((t, i) => `  ${i + 1}. ${t.label || t.topic || "Topic"}`)
      .join("\n");
    parts.push(`\nTopics Covered:\n${topicLines}`);
  }

  if (lecture.transcript_text) {
    // Trim to ~3000 chars to stay within token limits while keeping cost low
    const trimmed = lecture.transcript_text.slice(0, 3000);
    parts.push(`\nTranscript (excerpt):\n${trimmed}`);
  }

  return parts.join("\n");
}

/**
 * Call Gemini API to produce quiz questions.
 * Returns an array of question objects matching the quiz_questions schema.
 */
export async function generateQuizWithAI(lecture, apiKey, numQuestions = 5, allowedTypes = ["multiple_choice", "fill_in_blank", "short_answer"]) {
  if (!apiKey) {
    return generateQuizFallback(lecture, numQuestions, allowedTypes);
  }

  const context = buildLectureContext(lecture);

  if (!context.trim()) {
    return generateQuizFallback(lecture, numQuestions, allowedTypes);
  }

  const typesStr = allowedTypes.join(", ");
  const prompt = `You are an educational quiz generator. Based on the following lecture content, generate exactly ${numQuestions} quiz questions to test student understanding.

Allowed question types to include: ${typesStr}.

${context}

Rules:
- For 'multiple_choice' questions, include exactly 4 choices in the choices array, and correct_index (0 to 3).
- For 'fill_in_blank' questions, choices must be an empty array, and correct_answer must contain the word(s) that fill in the blank. The question_text must include "_______" where the blank is.
- For 'short_answer' questions, choices must be an empty array, correct_index must be null, and correct_answer can be empty.
- Avoid trivial recall questions.

Respond ONLY with a valid JSON array, no markdown wrapper, no extra text:
[
  {
    "question_type": "multiple_choice" | "fill_in_blank" | "short_answer",
    "question_text": "...",
    "choices": ["...", "...", "...", "..."],
    "correct_index": 0,
    "correct_answer": "..."
  },
  ...
]`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip possible markdown code fences
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Unexpected response structure");
    }

    // Normalise to quiz_questions schema
    return parsed.slice(0, numQuestions).map((q) => ({
      question_type: q.question_type || "multiple_choice",
      question_text: q.question_text || "",
      choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : [],
      correct_index: typeof q.correct_index === "number" ? q.correct_index : null,
      correct_answer: q.correct_answer || "",
      source_timestamp: "",
      generated_by_ai: true,
    }));
  } catch (err) {
    console.warn("[lectureQuizGenerator] Gemini call failed:", err.message);
    // Fall back to rule-based on any error
    return generateQuizFallback(lecture, numQuestions, allowedTypes);
  }
}

/**
 * Rule-based fallback: generates simple comprehension questions from
 * the lecture's topic_timestamps labels and title.
 */
export function generateQuizFallback(lecture, numQuestions = 5, allowedTypes = ["multiple_choice"]) {
  const title = lecture.title || "this lecture";
  const topics = (lecture.topic_timestamps || [])
    .map((t) => t.label || t.topic)
    .filter(Boolean);

  const questions = [];
  const typeCycles = allowedTypes.length > 0 ? allowedTypes : ["multiple_choice"];

  for (let idx = 0; idx < numQuestions; idx++) {
    const qType = typeCycles[idx % typeCycles.length];
    
    if (qType === "multiple_choice") {
      questions.push({
        question_type: "multiple_choice",
        question_text: `What is the main subject covered in "${title}"?`,
        choices: [
          title,
          "Database management",
          "Web security principles",
          "Operating system design",
        ],
        correct_index: 0,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false,
      });
    } else if (qType === "fill_in_blank") {
      const topic = topics[idx % topics.length] || "the lecture content";
      questions.push({
        question_type: "fill_in_blank",
        question_text: `In this lecture, the main focus is on _______ and related topics.`,
        choices: [],
        correct_index: null,
        correct_answer: topic,
        source_timestamp: "",
        generated_by_ai: false,
      });
    } else {
      const topic = topics[idx % topics.length] || "key concepts";
      questions.push({
        question_type: "short_answer",
        question_text: `Explain one key learning outcome related to ${topic} from "${title}".`,
        choices: [],
        correct_index: null,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false,
      });
    }
  }

  return questions;
}
