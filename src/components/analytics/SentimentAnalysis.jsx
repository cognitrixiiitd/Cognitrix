import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smile, Frown, Meh, Sparkles } from "lucide-react";

export default function SentimentAnalysis({ questions }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState(null);

  const analyzeSentiment = async () => {
    if (questions.length === 0) return;
    setAnalyzing(true);

    const sampleQuestions = questions
      .slice(0, 20)
      .map((q) => q.text)
      .join("\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the sentiment of these student questions and feedback:

${sampleQuestions}

Return a JSON object with:
- overall_sentiment: "positive", "neutral", or "negative"
- confidence: number between 0-100
- themes: array of top 3 themes/concerns mentioned
- sentiment_breakdown: { positive: count, neutral: count, negative: count }`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_sentiment: { type: "string" },
          confidence: { type: "number" },
          themes: { type: "array", items: { type: "string" } },
          sentiment_breakdown: {
            type: "object",
            properties: {
              positive: { type: "number" },
              neutral: { type: "number" },
              negative: { type: "number" },
            },
          },
        },
      },
    });

    setSentiment(result);
    setAnalyzing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-black">
          Student Sentiment Analysis
        </h3>
        {!sentiment && (
          <Button
            onClick={analyzeSentiment}
            disabled={analyzing || questions.length === 0}
            size="sm"
            className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1"
          >
            {analyzing ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Analyze
          </Button>
        )}
      </div>

      {!sentiment ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {questions.length === 0
            ? "No questions to analyze"
            : "Click Analyze to get AI-powered sentiment insights"}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
            {sentiment.overall_sentiment === "positive" && (
              <>
                <Smile className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    Positive Sentiment
                  </p>
                  <p className="text-xs text-gray-500">
                    {sentiment.confidence}% confidence
                  </p>
                </div>
              </>
            )}
            {sentiment.overall_sentiment === "neutral" && (
              <>
                <Meh className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm font-semibold text-yellow-700">
                    Neutral Sentiment
                  </p>
                  <p className="text-xs text-gray-500">
                    {sentiment.confidence}% confidence
                  </p>
                </div>
              </>
            )}
            {sentiment.overall_sentiment === "negative" && (
              <>
                <Frown className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Negative Sentiment
                  </p>
                  <p className="text-xs text-gray-500">
                    {sentiment.confidence}% confidence
                  </p>
                </div>
              </>
            )}
          </div>

          {sentiment.sentiment_breakdown && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-center">
                <p className="text-xs text-emerald-600 font-medium">
                  {sentiment.sentiment_breakdown.positive || 0}
                </p>
                <p className="text-[10px] text-gray-500">Positive</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg text-center">
                <p className="text-xs text-yellow-600 font-medium">
                  {sentiment.sentiment_breakdown.neutral || 0}
                </p>
                <p className="text-[10px] text-gray-500">Neutral</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg text-center">
                <p className="text-xs text-red-600 font-medium">
                  {sentiment.sentiment_breakdown.negative || 0}
                </p>
                <p className="text-[10px] text-gray-500">Negative</p>
              </div>
            </div>
          )}

          {sentiment.themes?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Common Themes</p>
              <div className="flex flex-wrap gap-2">
                {sentiment.themes.map((theme, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => setSentiment(null)}
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-xs"
          >
            Reanalyze
          </Button>
        </div>
      )}
    </div>
  );
}
