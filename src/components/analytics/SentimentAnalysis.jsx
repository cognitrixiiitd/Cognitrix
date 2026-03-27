import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smile, Frown, Meh, Sparkles } from "lucide-react";

export default function SentimentAnalysis({ questions }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState(null);

  const analyzeSentiment = async () => {
    if (questions.length === 0) return;
    setAnalyzing(true);

    // Stub: Simple keyword-based sentiment analysis instead of AI LLM call
    await new Promise(r => setTimeout(r, 800));

    const positiveWords = ["great", "good", "love", "helpful", "amazing", "excellent", "thanks", "understand", "clear"];
    const negativeWords = ["confused", "stuck", "hard", "difficult", "unclear", "wrong", "broken", "help", "lost", "frustrated"];

    let positive = 0, negative = 0, neutral = 0;
    const themes = {};

    questions.slice(0, 20).forEach(q => {
      const text = (q.text || "").toLowerCase();
      const posHits = positiveWords.filter(w => text.includes(w)).length;
      const negHits = negativeWords.filter(w => text.includes(w)).length;
      if (posHits > negHits) positive++;
      else if (negHits > posHits) negative++;
      else neutral++;
      // Extract common words as themes
      text.split(/\W+/).filter(w => w.length > 4).forEach(w => { themes[w] = (themes[w] || 0) + 1; });
    });

    const total = positive + negative + neutral;
    const overallSentiment = positive >= negative && positive >= neutral ? "positive" : negative >= positive && negative >= neutral ? "negative" : "neutral";
    const topThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

    setSentiment({
      overall_sentiment: overallSentiment,
      confidence: Math.round((Math.max(positive, negative, neutral) / Math.max(total, 1)) * 100),
      themes: topThemes.length > 0 ? topThemes : ["general questions"],
      sentiment_breakdown: { positive, neutral, negative },
    });
    setAnalyzing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-black">Student Sentiment Analysis</h3>
        {!sentiment && (
          <Button onClick={analyzeSentiment} disabled={analyzing || questions.length === 0} size="sm" className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1">
            {analyzing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Analyze
          </Button>
        )}
      </div>
      {!sentiment ? (
        <p className="text-sm text-gray-400 text-center py-8">{questions.length === 0 ? "No questions to analyze" : "Click Analyze to get sentiment insights"}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
            {sentiment.overall_sentiment === "positive" && <><Smile className="w-8 h-8 text-emerald-500" /><div><p className="text-sm font-semibold text-emerald-700">Positive Sentiment</p><p className="text-xs text-gray-500">{sentiment.confidence}% confidence</p></div></>}
            {sentiment.overall_sentiment === "neutral" && <><Meh className="w-8 h-8 text-yellow-500" /><div><p className="text-sm font-semibold text-yellow-700">Neutral Sentiment</p><p className="text-xs text-gray-500">{sentiment.confidence}% confidence</p></div></>}
            {sentiment.overall_sentiment === "negative" && <><Frown className="w-8 h-8 text-red-500" /><div><p className="text-sm font-semibold text-red-700">Negative Sentiment</p><p className="text-xs text-gray-500">{sentiment.confidence}% confidence</p></div></>}
          </div>
          {sentiment.sentiment_breakdown && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-center"><p className="text-xs text-emerald-600 font-medium">{sentiment.sentiment_breakdown.positive || 0}</p><p className="text-[10px] text-gray-500">Positive</p></div>
              <div className="p-2 bg-yellow-50 rounded-lg text-center"><p className="text-xs text-yellow-600 font-medium">{sentiment.sentiment_breakdown.neutral || 0}</p><p className="text-[10px] text-gray-500">Neutral</p></div>
              <div className="p-2 bg-red-50 rounded-lg text-center"><p className="text-xs text-red-600 font-medium">{sentiment.sentiment_breakdown.negative || 0}</p><p className="text-[10px] text-gray-500">Negative</p></div>
            </div>
          )}
          {sentiment.themes?.length > 0 && (<div><p className="text-xs text-gray-500 mb-2">Common Themes</p><div className="flex flex-wrap gap-2">{sentiment.themes.map((theme, i) => (<Badge key={i} variant="secondary" className="text-xs">{theme}</Badge>))}</div></div>)}
          <Button onClick={() => setSentiment(null)} variant="outline" size="sm" className="w-full rounded-xl text-xs">Reanalyze</Button>
        </div>
      )}
    </div>
  );
}
