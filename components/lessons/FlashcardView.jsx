import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function FlashcardView({ flashcards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No flashcards available for this lesson.
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-slate-600">
        <span>Card {currentIndex + 1} of {flashcards.length}</span>
        <span>Click card to flip</span>
      </div>

      <div
        onClick={handleFlip}
        style={{ perspective: '1000px' }}
        className="cursor-pointer w-full h-80"
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Front of card */}
          <div
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            className="absolute inset-0 rounded-xl border bg-white shadow flex items-center justify-center p-8"
          >
            <div className="text-center space-y-4">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Term</span>
              <h3 className="text-3xl font-bold text-slate-900">{currentCard.term}</h3>
            </div>
          </div>

          {/* Back of card */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className="absolute inset-0 rounded-xl border bg-blue-50 border-blue-200 shadow flex items-center justify-center p-8"
          >
            <div className="text-center space-y-4">
              <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Definition</span>
              <p className="text-xl text-slate-800 leading-relaxed">{currentCard.definition}</p>
              {currentCard.example && (
                <div className="mt-4 pt-4 border-t border-blue-300">
                  <span className="text-xs font-semibold text-blue-600 uppercase">Example</span>
                  <p className="text-sm text-slate-700 mt-2 italic">{currentCard.example}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrevious}
          variant="outline"
          disabled={flashcards.length <= 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          variant="ghost"
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart
        </Button>

        <Button
          onClick={handleNext}
          variant="outline"
          disabled={flashcards.length <= 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}