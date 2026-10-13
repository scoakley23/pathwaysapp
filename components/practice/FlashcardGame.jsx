import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import { speakText } from "@/components/utils/textToSpeech";

export default function FlashcardGame({ words, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  const currentWord = words[currentIndex];
  const isLast = currentIndex === words.length - 1;

  const handleNext = (known) => {
    if (known) setMasteredCount(prev => prev + 1);
    
    // Report performance to parent (for SRS tracking)
    if (onComplete) {
      onComplete(known);
    }
    
    if (isLast) {
      // Session complete
    } else {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    }
  };

  const speak = (text, e) => {
    e.stopPropagation();
    speakText(text);
  };

  return (
    <div className="max-w-md mx-auto h-[500px] flex flex-col">
      <div className="text-center mb-4 text-slate-500">
        Card {currentIndex + 1} of {words.length}
      </div>

      <div className="flex-1 relative perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <motion.div
          className="w-full h-full relative transition-all duration-500"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <Card 
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 bg-white border-2 border-indigo-100 shadow-xl rounded-3xl backface-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
          >
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Word</span>
            <h2 className="text-4xl font-bold text-slate-800 text-center">{currentWord.word}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="mt-6 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
              onClick={(e) => speak(currentWord.word, e)}
            >
              <Volume2 className="w-6 h-6" />
            </Button>
            <p className="absolute bottom-8 text-slate-400 text-sm animate-pulse">Click to flip</p>
          </Card>

          {/* Back */}
          <Card 
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 bg-indigo-600 text-white shadow-xl rounded-3xl"
            style={{ 
              transform: 'rotateY(180deg)', 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden' 
            }}
          >
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Definition</span>
            <p className="text-2xl font-medium text-center leading-relaxed">{currentWord.definition}</p>
            {currentWord.category && (
               <span className="mt-6 px-3 py-1 bg-white/20 rounded-full text-xs">{currentWord.category}</span>
            )}
          </Card>
        </motion.div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => handleNext(false)}
          className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw className="mr-2 w-4 h-4" /> Study Again
        </Button>
        <Button 
          size="lg"
          onClick={() => handleNext(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          I Know It <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}