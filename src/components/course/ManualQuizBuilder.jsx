import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STOP_WORDS = new Set([
  "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into",
  "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs",
  "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
  "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves"
]);

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomQuizFromTranscript(transcript, title = "this lecture", numQuestions = 5, allowedTypes = ["multiple_choice", "fill_in_blank", "short_answer"]) {
  if (!transcript || transcript.trim().length < 50) {
    return [];
  }

  // 1. Clean transcript lines (strip headers, metadata, and timestamps)
  const lines = transcript.split('\n');
  const cleanedLines = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out API metadata headers and advertisements
    const lower = trimmed.toLowerCase();
    if (
      trimmed.startsWith('#') ||
      lower.startsWith('source video:') ||
      lower.startsWith('language:') ||
      lower.startsWith('other available languages:') ||
      lower.startsWith('to request a') ||
      trimmed.includes('http://') ||
      trimmed.includes('https://') ||
      lower.includes('youtube-transcript')
    ) {
      continue;
    }

    // Strip timestamps like [00:12], [01:23:45], (0:12), 0:12, 12:34
    trimmed = trimmed.replace(/\[\d{1,2}:?\d{0,2}:?\d{0,2}\]/g, '');
    trimmed = trimmed.replace(/\(\d{1,2}:?\d{0,2}:?\d{0,2}\)/g, '');
    trimmed = trimmed.replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/, '');
    
    trimmed = trimmed.trim();
    if (trimmed.length > 3) {
      cleanedLines.push(trimmed);
    }
  }

  if (cleanedLines.length === 0) return [];

  // 2. Rebuild sentences by combining consecutive short lines
  const sentences = [];
  let currentSentence = "";

  for (const line of cleanedLines) {
    if (currentSentence) {
      currentSentence += " " + line;
    } else {
      currentSentence = line;
    }

    const wordCount = currentSentence.split(/\s+/).length;
    // Save sentence if it ends with punctuation or is long enough
    if (/[.!?]$/.test(line) || wordCount >= 10) {
      sentences.push(currentSentence.trim());
      currentSentence = "";
    }
  }

  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  // Filter sentences to ensure proper lengths and clean content
  const filteredSentences = sentences.filter(s => {
    const wc = s.split(/\s+/).length;
    return wc >= 5 && wc <= 35 && !s.includes('http') && !s.includes('www.');
  });

  if (filteredSentences.length === 0) return [];

  // Get a pool of distractors from the transcript words
  const allWords = cleanedLines
    .join(" ")
    .split(/[\s,.:;?!"'()]+/)
    .map(w => w.trim().replace(/[^a-zA-Z]/g, ""))
    .filter(w => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));

  const uniqueWords = Array.from(new Set(allWords));

  // Shuffle sentences to pick random ones
  const shuffledSentences = shuffleArray(filteredSentences);
  const questions = [];
  const typeCycles = allowedTypes.length > 0 ? allowedTypes : ["multiple_choice"];

  for (let idx = 0; idx < shuffledSentences.length; idx++) {
    if (questions.length >= numQuestions) break;

    const sentence = shuffledSentences[idx];
    const qType = typeCycles[questions.length % typeCycles.length];

    const sentenceWords = sentence
      .split(/[\s,.:;?!"'()]+/)
      .map(w => w.trim().replace(/[^a-zA-Z]/g, ""))
      .filter(w => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));

    if (sentenceWords.length === 0) continue;

    // Prefer capitalized words (proper nouns)
    const capitalizedWords = sentenceWords.filter(w => w[0] === w[0].toUpperCase());
    const candidates = capitalizedWords.length > 0 ? capitalizedWords : sentenceWords;
    const blankWord = candidates[Math.floor(Math.random() * candidates.length)];

    const regex = new RegExp(`\\b${blankWord}\\b`, 'i');
    if (!regex.test(sentence)) continue;

    if (qType === "multiple_choice") {
      const questionText = sentence.replace(regex, "_______");
      const otherWords = uniqueWords.filter(w => w.toLowerCase() !== blankWord.toLowerCase());
      const distractors = shuffleArray(otherWords).slice(0, 3);
      const fallbackDistractors = ["concept", "process", "variable", "element", "module", "system"];
      while (distractors.length < 3) {
        const fb = fallbackDistractors[Math.floor(Math.random() * fallbackDistractors.length)];
        if (!distractors.includes(fb) && fb.toLowerCase() !== blankWord.toLowerCase()) {
          distractors.push(fb);
        }
      }
      const choices = shuffleArray([blankWord, ...distractors]);
      const correctIndex = choices.indexOf(blankWord);

      questions.push({
        question_type: "multiple_choice",
        question_text: questionText,
        choices: choices.slice(0, 4),
        correct_index: correctIndex,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false
      });
    } else if (qType === "fill_in_blank") {
      const questionText = sentence.replace(regex, "_______");
      questions.push({
        question_type: "fill_in_blank",
        question_text: questionText,
        choices: [],
        correct_index: null,
        correct_answer: blankWord,
        source_timestamp: "",
        generated_by_ai: false
      });
    } else if (qType === "short_answer") {
      const questionText = `Based on the lecture discussion, explain the significance or context of: "${sentence}"`;
      questions.push({
        question_type: "short_answer",
        question_text: questionText,
        choices: [],
        correct_index: null,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false
      });
    }
  }

  // If we couldn't generate the requested amount, fill with fallback topic questions
  const topics = title ? [title] : ["this lecture"];
  while (questions.length < numQuestions) {
    const qType = typeCycles[questions.length % typeCycles.length];
    const topic = topics[questions.length % topics.length];

    if (qType === "multiple_choice") {
      questions.push({
        question_type: "multiple_choice",
        question_text: `Which concept is most essential for understanding "${topic}"?`,
        choices: ["Main principles", "Secondary features", "Basic setup", "Advanced settings"],
        correct_index: 0,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false
      });
    } else if (qType === "fill_in_blank") {
      questions.push({
        question_type: "fill_in_blank",
        question_text: `The primary objective of learning "${topic}" is to master the _______ concept.`,
        choices: [],
        correct_index: null,
        correct_answer: "core",
        source_timestamp: "",
        generated_by_ai: false
      });
    } else {
      questions.push({
        question_type: "short_answer",
        question_text: `Briefly summarize your key learnings or questions about: "${topic}".`,
        choices: [],
        correct_index: null,
        correct_answer: "",
        source_timestamp: "",
        generated_by_ai: false
      });
    }
  }

  return questions.slice(0, numQuestions);
}

export default function ManualQuizBuilder({ questions, onChange, transcript, lectureTitle, onAutoGenerate, isGenerating }) {
  const { toast } = useToast();
  const [numQuestions, setNumQuestions] = React.useState(5);
  const [allowedTypes, setAllowedTypes] = React.useState({
    multiple_choice: true,
    fill_in_blank: true,
    short_answer: true,
  });

  const getSelectedTypes = () => {
    return Object.entries(allowedTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);
  };

  const handleGenerateRandomQuiz = () => {
    if (!transcript || transcript.trim().length < 50) {
      toast({
        title: "No transcript found",
        description: "Please fetch or add a lecture transcript first to generate a random quiz.",
        variant: "destructive"
      });
      return;
    }
    const selectedTypes = getSelectedTypes();
    if (selectedTypes.length === 0) {
      toast({
        title: "No question types selected",
        description: "Please select at least one question type (Multiple Choice, Fill in Blank, or Short Answer).",
        variant: "destructive"
      });
      return;
    }
    const generated = generateRandomQuizFromTranscript(transcript, lectureTitle, numQuestions, selectedTypes);
    if (generated && generated.length > 0) {
      onChange(generated);
      toast({
        title: "Random Quiz Generated!",
        description: `Successfully created ${generated.length} questions from the transcript.`
      });
    } else {
      toast({
        title: "Generation failed",
        description: "Could not extract clear sentences from the transcript. Ensure it contains complete sentences.",
        variant: "destructive"
      });
    }
  };

  const handleAutoGenerateClick = () => {
    const selectedTypes = getSelectedTypes();
    if (selectedTypes.length === 0) {
      toast({
        title: "No question types selected",
        description: "Please select at least one question type (Multiple Choice, Fill in Blank, or Short Answer).",
        variant: "destructive"
      });
      return;
    }
    onAutoGenerate(numQuestions, selectedTypes);
  };

  const addQuestion = () => {
    onChange([...questions, { question_type: "multiple_choice", question_text: "", choices: ["", "", "", ""], correct_index: 0, correct_answer: "", source_timestamp: "" }]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    // When question type changes, reset type-specific fields
    if (field === "question_type") {
      if (value === "multiple_choice") {
        updated[index].choices = ["", "", "", ""];
        updated[index].correct_index = 0;
        updated[index].correct_answer = "";
      } else if (value === "fill_in_blank") {
        updated[index].choices = [];
        updated[index].correct_index = null;
        updated[index].correct_answer = "";
      } else if (value === "short_answer") {
        updated[index].choices = [];
        updated[index].correct_index = null;
        updated[index].correct_answer = null;
      }
    }
    onChange(updated);
  };
  const updateChoice = (qIndex, cIndex, value) => { const updated = [...questions]; updated[qIndex].choices[cIndex] = value; onChange(updated); };
  const deleteQuestion = (index) => onChange(questions.filter((_, i) => i !== index));

  const hasAiQuestions = questions.some(q => q.generated_by_ai);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-700">Quiz Questions ({questions.length})</Label>
      </div>

      <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-250 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-700">Questions:</span>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a98d] font-medium text-sm"
              >
                {[5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-gray-700 font-medium">
              <span className="font-semibold">Types:</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowedTypes.multiple_choice}
                  onChange={(e) => setAllowedTypes(prev => ({ ...prev, multiple_choice: e.target.checked }))}
                  className="rounded text-[#00a98d] focus:ring-[#00a98d]/20 w-3.5 h-3.5"
                />
                Multiple Choice
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowedTypes.fill_in_blank}
                  onChange={(e) => setAllowedTypes(prev => ({ ...prev, fill_in_blank: e.target.checked }))}
                  className="rounded text-[#00a98d] focus:ring-[#00a98d]/20 w-3.5 h-3.5"
                />
                Fill in Blank
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowedTypes.short_answer}
                  onChange={(e) => setAllowedTypes(prev => ({ ...prev, short_answer: e.target.checked }))}
                  className="rounded text-[#00a98d] focus:ring-[#00a98d]/20 w-3.5 h-3.5"
                />
                Short Answer
              </label>
            </div>
          </div>

          <div className="flex gap-1.5 ml-auto sm:ml-0">
            {onAutoGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoGenerateClick}
                disabled={isGenerating}
                className="h-8 text-xs gap-1.5 rounded-lg border-[#00a98d]/40 text-[#00a98d] hover:bg-[#00a98d]/5 bg-white font-medium"
              >
                {isGenerating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                  : <><Sparkles className="w-3.5 h-3.5" />Auto-Generate</>
                }
              </Button>
            )}
            {transcript && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateRandomQuiz}
                className="h-8 text-xs gap-1.5 rounded-lg border-blue-500/40 text-blue-600 hover:bg-blue-50 bg-white font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />Random Quiz
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="h-8 text-xs gap-1 rounded-lg bg-white font-medium">
              <Plus className="w-3.5 h-3.5" />Add Question
            </Button>
          </div>
        </div>
      </div>

      {hasAiQuestions && (
        <div className="flex items-center gap-2 p-2.5 bg-[#00a98d]/5 rounded-xl border border-[#00a98d]/20">
          <Sparkles className="w-3.5 h-3.5 text-[#00a98d] flex-shrink-0" />
          <p className="text-xs text-[#00a98d]">Questions were AI-generated. Review and edit before saving.</p>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={q.question_type} onValueChange={(val) => updateQuestion(qIdx, "question_type", val)}>
                    <SelectTrigger className="text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="multiple_choice">Multiple Choice</SelectItem><SelectItem value="fill_in_blank">Fill in Blank</SelectItem><SelectItem value="short_answer">Short Answer</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="Timestamp (e.g., 5:30)" value={q.source_timestamp || ""} onChange={(e) => updateQuestion(qIdx, "source_timestamp", e.target.value)} className="text-xs rounded-lg" />
                </div>
                <Textarea placeholder="Question text..." value={q.question_text} onChange={(e) => updateQuestion(qIdx, "question_text", e.target.value)} className="text-sm rounded-lg resize-none h-16" />
                {q.question_type === "multiple_choice" && (
                  <div className="space-y-2"><Label className="text-xs text-gray-500">Choices</Label>
                    {q.choices?.map((choice, cIdx) => (<div key={cIdx} className="flex gap-2 items-center"><input type="radio" checked={q.correct_index === cIdx} onChange={() => updateQuestion(qIdx, "correct_index", cIdx)} className="w-4 h-4 text-[#00a98d]" /><Input placeholder={`Choice ${cIdx + 1}`} value={choice} onChange={(e) => updateChoice(qIdx, cIdx, e.target.value)} className="text-xs rounded-lg" /></div>))}
                  </div>
                )}
                {q.question_type === "fill_in_blank" && (
                  <div>
                    <Label className="text-xs text-gray-500">Correct Answer</Label>
                    <Input placeholder="Enter the correct answer" value={q.correct_answer || ""} onChange={(e) => updateQuestion(qIdx, "correct_answer", e.target.value)} className="text-sm rounded-lg" />
                  </div>
                )}
                {q.question_type === "short_answer" && (
                  <p className="text-xs text-gray-400 italic bg-gray-100 p-2 rounded-lg">Open-ended question — no correct answer required. Will be reviewed manually.</p>
                )}
              </div>
              <button type="button" onClick={() => deleteQuestion(qIdx)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
      </div>
      {questions.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No questions yet. Click <strong>Auto-Generate</strong> or add manually.</p>}
    </div>
  );
}
