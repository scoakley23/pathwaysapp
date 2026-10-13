import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, BookOpen, ChevronRight } from 'lucide-react';

export default function QuizExplanationPanel({ loadingExplanation, explanation, relatedLessons, onNavigate, onContinue }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-800">Concept Explanation</span>
        </div>
        {loadingExplanation ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-blue-600 text-sm">Generating explanation...</span>
          </div>
        ) : (
          <p className="text-blue-900 text-sm leading-relaxed">{explanation || 'Review the lesson content above for more details on this topic.'}</p>
        )}
      </div>

      {relatedLessons.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-500" />
            Related lessons to review:
          </p>
          <div className="space-y-1">
            {relatedLessons.map(rl => (
              <button key={rl.id} onClick={() => onNavigate(rl)} className="block w-full text-left p-2 rounded-md hover:bg-blue-50 transition-colors">
                <span className="text-blue-700 text-sm font-medium">{rl.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700">
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}