import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Play, FileText, Video, ExternalLink, TrendingUp } from "lucide-react";

const typeIcons = {
  video: Video,
  youtube: Play,
  pdf: FileText,
  slides: FileText,
  notes: FileText,
  external_link: ExternalLink,
};

const STOP_WORDS = new Set([
  // standard English stop words
  "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "could",
  "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has",
  "have", "having", "he", "her", "here", "hers", "him", "his", "how", "if", "in", "into", "is", "it",
  "its", "just", "like", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "our", "ours", "out", "over", "own", "same", "she", "should", "so", "some",
  "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where",
  "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself",
  "yourselves", "think", "know", "going", "actually", "basically", "something", "things", "really",
  "people", "wouldn't", "couldn't", "shouldn't", "didn't", "doesn't", "don't", "isn't", "aren't",
  "wasn't", "weren't", "haven't", "hasn't", "hadn't",

  // spoken conversation fillers and generic verbs
  "will", "okay", "also", "give", "take", "make", "hello", "welcome", "today", "want", "tell", "look",
  "see", "come", "good", "great", "well", "sure", "start", "next", "previous", "first", "second", "third",
  "essentially", "probably", "maybe", "definitely", "absolutely", "anything", "everything", "nothing",
  "someone", "anyone", "everyone", "somebody", "anybody", "everybody", "somewhere", "anywhere", "everywhere",
  "sometimes", "always", "never", "often", "usually", "frequently", "many", "much", "few", "several",
  "lot", "lots", "little", "bit", "point", "points", "example", "examples", "question", "questions",
  "answer", "answers", "different", "same", "similar", "another", "thing", "way", "ways", "case", "cases",
  "fact", "facts", "let", "lets", "us", "get", "got", "go", "went", "say", "said", "saying", "tell", "told",
  "find", "found", "work", "working", "use", "using", "used", "call", "called", "mean", "means", "meant",
  "try", "trying", "tried", "need", "needs", "needed", "keep", "keeping", "kept", "put", "putting",
  "take", "taken", "took", "give", "given", "gave", "show", "shown", "showed", "talk", "talking", "talked",
  "discuss", "discussing", "discussed", "explain", "explaining", "explained", "learn", "learning", "learned",
  "understand", "understanding", "understood", "know", "knowing", "knew", "think", "thinking", "thought",

  // video and channel boilerplate
  "subscribe", "channel", "video", "videos", "youtube", "watch", "watching", "viewer", "viewers",
  "like", "comment", "share", "bell", "notification", "notifications", "link", "links", "click",
  "below", "description", "details", "website", "online", "screen", "button", "buttons",

  // educational structural terms
  "lecture", "lectures", "study", "studying", "introduction", "intro", "course", "courses", "class",
  "classes", "student", "students", "professor", "professors", "teacher", "teachers", "school",
  "university", "college", "module", "modules", "topic", "topics", "week", "weeks", "part", "parts",
  "logistics", "syllabus", "outline", "chapter", "chapters", "session", "sessions", "essential",
  "essentials", "overview", "basics", "basic", "concept", "concepts", "term", "terms", "definition",
  "definitions", "exam", "exams", "test", "tests", "quiz", "quizzes", "grade", "grades", "grading",
  "assignment", "assignments", "project", "projects", "homework"
]);

// Academic vocabulary mapping — replace mundane keywords with domain-appropriate descriptors
const ACADEMIC_LABELS = {
  // Design & Creativity
  design: "Design Methodology", creative: "Creative Cognition", idea: "Ideation Methods",
  ideas: "Ideation Methods", brainstorm: "Brainstorming Heuristics", prototype: "Prototyping Paradigms",
  sketch: "Conceptual Sketching", user: "User-Centred Design", product: "Product Architecture",
  innovation: "Innovation Frameworks", solution: "Solution Synthesis", problem: "Problem Formulation",

  // Computer Science
  algorithm: "Algorithmic Complexity", data: "Data Structures", function: "Functional Abstraction",
  code: "Code Composition", programming: "Programming Paradigms", software: "Software Engineering",
  system: "Systems Architecture", network: "Network Topology", database: "Database Schema Design",
  model: "Modelling Constructs", memory: "Memory Management", process: "Process Orchestration",
  recursion: "Recursive Decomposition", tree: "Tree Traversal Algorithms", graph: "Graph Theoretic Models",
  array: "Array-Based Structures", search: "Search Heuristics", sort: "Sorting Strategies",
  complexity: "Computational Complexity", machine: "Machine Learning Paradigms",
  neural: "Neural Architectures", deep: "Deep Learning Constructs", training: "Training Methodology",

  // Mathematics & Science
  equation: "Differential Equations", matrix: "Matrix Algebra", vector: "Vector Calculus",
  probability: "Probabilistic Inference", statistics: "Statistical Modelling",
  distribution: "Statistical Distributions", hypothesis: "Hypothesis Testing",
  regression: "Regression Analysis", analysis: "Analytical Frameworks",
  theorem: "Theoretical Proofs", proof: "Mathematical Induction",

  // General Academic
  structure: "Structural Decomposition", pattern: "Pattern Recognition",
  theory: "Theoretical Constructs", principle: "Governing Principles",
  framework: "Conceptual Frameworks", methodology: "Research Methodology",
  implementation: "Implementation Strategy", evaluation: "Evaluation Metrics",
  optimization: "Optimization Techniques", performance: "Performance Benchmarking",
  abstraction: "Abstraction Hierarchies", interface: "Interface Contracts",
  object: "Object-Oriented Paradigms", class: "Class Hierarchies",
};

// Helper to extract YouTube 11-char video ID
const extractVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Helper to tokenize and clean text
const tokenizeText = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
};

// Build TF-IDF vector for a document given all doc frequencies
const buildTfidfVector = (tokens, df, N) => {
  const termCounts = {};
  tokens.forEach(w => { termCounts[w] = (termCounts[w] || 0) + 1; });
  const vector = {};
  const totalTokens = tokens.length || 1;
  Object.keys(termCounts).forEach(w => {
    const tf = termCounts[w] / totalTokens;
    const idf = Math.log(N / (df[w] || 1)) + 1;
    vector[w] = tf * idf;
  });
  return vector;
};

// Cosine similarity between two TF-IDF vectors
const cosineSimilarity = (vecA, vecB) => {
  const keysA = Object.keys(vecA);
  if (!keysA.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  keysA.forEach(k => {
    dot += (vecA[k] || 0) * (vecB[k] || 0);
    normA += vecA[k] ** 2;
  });
  Object.values(vecB).forEach(v => { normB += v ** 2; });
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Map raw keyword to a more academic label
const toAcademicLabel = (word) => {
  return ACADEMIC_LABELS[word] || (word.charAt(0).toUpperCase() + word.slice(1));
};

// Get the top shared TF-IDF keywords expressed with academic vocabulary
const getSharedConcepts = (vecA, vecB, topN = 3) => {
  const sharedKeys = Object.keys(vecA).filter(k => vecB[k] > 0);
  // rank by combined TF-IDF weight
  sharedKeys.sort((a, b) => (vecA[b] + vecB[b]) - (vecA[a] + vecB[a]));
  return sharedKeys.slice(0, topN).map(toAcademicLabel);
};

// Circular arc SVG for the similarity gauge
function SimilarityArc({ percent }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  const color =
    percent >= 70 ? "#00a98d" :
    percent >= 40 ? "#f59e0b" :
    "#94a3b8";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
      <text x="28" y="32" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

export default function LectureRecommendations({ currentLecture, allLectures, onSelectLecture }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Cache fetched transcripts so we do not refetch them on every lecture change
  const transcriptCacheRef = useRef({});

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!currentLecture || allLectures.length < 2) {
        setRecommendations([]);
        setGenerated(false);
        return;
      }

      setLoading(true);
      setGenerated(false);

      const N = allLectures.length;

      // 1. Resolve transcripts for all lectures (either cached, stored, or fetched in real-time)
      const docsWithTranscripts = await Promise.all(
        allLectures.map(async (l) => {
          let transcript = l.transcript_text || "";

          if (!transcript.trim() && l.type === "youtube" && l.source_url) {
            const videoId = extractVideoId(l.source_url);
            if (videoId) {
              if (transcriptCacheRef.current[videoId]) {
                transcript = transcriptCacheRef.current[videoId];
              } else {
                try {
                  const res = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
                  if (res.ok) {
                    const fetchedText = await res.text();
                    transcript = fetchedText;
                    transcriptCacheRef.current[videoId] = fetchedText;
                  }
                } catch (err) {
                  console.warn("Failed to fetch transcript dynamically for video ID", videoId, err);
                }
              }
            }
          }

          return { ...l, resolved_transcript: transcript };
        })
      );

      // 2. Tokenize all documents
      const lectureDocs = docsWithTranscripts.map(l => {
        let text = l.resolved_transcript || "";
        if (!text.trim()) {
          text = (l.title || "") + " " + (l.ai_generated_description || "");
        }
        const tokens = tokenizeText(text);
        const uniqueTokens = new Set(tokens);
        return { id: l.id, tokens, uniqueTokens, lectureObj: l };
      });

      // 3. Build document frequency map
      const df = {};
      lectureDocs.forEach(d => {
        d.uniqueTokens.forEach(w => { df[w] = (df[w] || 0) + 1; });
      });

      // 4. Build TF-IDF vectors for all lectures
      const tfidfVectors = {};
      lectureDocs.forEach(d => {
        tfidfVectors[d.id] = buildTfidfVector(d.tokens, df, N);
      });

      const currentVec = tfidfVectors[currentLecture.id] || {};

      // 5. Score all other lectures by cosine similarity to current lecture
      const scored = lectureDocs
        .filter(d => d.id !== currentLecture.id)
        .map(d => {
          const otherVec = tfidfVectors[d.id] || {};
          const sim = cosineSimilarity(currentVec, otherVec);
          const simPercent = Math.round(sim * 100);

          // Build an academic-vocabulary explanation
          const sharedConcepts = getSharedConcepts(currentVec, otherVec, 3);
          const conceptStr = sharedConcepts.length > 0
            ? sharedConcepts.join(" · ")
            : "Thematic Overlap";

          return {
            ...d.lectureObj,
            simPercent,
            conceptStr,
          };
        })
        .filter(l => l.simPercent > 0)
        .sort((a, b) => b.simPercent - a.simPercent)
        .slice(0, 3);

      // Simulate brief transition delay for visual feedback
      await new Promise(r => setTimeout(r, 500));

      setRecommendations(scored);
      setGenerated(true);
      setLoading(false);
    };

    generateRecommendations();
  }, [currentLecture?.id, allLectures]);

  if (allLectures.length < 2) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#00a98d]" />
        <h3 className="text-sm font-semibold text-black">Semantically Related Lectures</h3>
        <span className="ml-auto text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cosine Similarity</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 justify-center text-xs text-gray-500">
          <div className="w-3.5 h-3.5 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" />
          <span>Computing semantic similarity vectors…</span>
        </div>
      )}

      {generated && !loading && recommendations.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No semantically correlated lectures detected in this corpus.</p>
      )}

      {generated && !loading && recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((lecture) => {
            const Icon = typeIcons[lecture.type] || FileText;
            return (
              <button
                key={lecture.id}
                onClick={() => {
                  const idx = allLectures.findIndex(l => l.id === lecture.id);
                  if (idx !== -1) onSelectLecture(idx);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#00a98d]/5 border border-gray-100 hover:border-[#00a98d]/20 transition-all text-left group"
              >
                {/* Similarity Arc Gauge */}
                <SimilarityArc percent={lecture.simPercent} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black group-hover:text-[#00a98d] transition-colors truncate">
                    {lecture.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate" title={lecture.conceptStr}>
                    {lecture.conceptStr}
                  </p>
                </div>

                <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#00a98d]/10">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#00a98d]" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
