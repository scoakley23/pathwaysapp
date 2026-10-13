import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MatchingGame({ words, onComplete }) {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Initialize game board
    // Take max 6 pairs to fit screen
    const gameWords = words.slice(0, 6);
    const cards = [];
    
    gameWords.forEach((w) => {
      // Add word card
      cards.push({
        id: `word-${w.id}`,
        content: w.word,
        type: 'word',
        pairId: w.id
      });
      // Add definition card
      cards.push({
        id: `def-${w.id}`,
        content: w.definition,
        type: 'def',
        pairId: w.id
      });
    });

    // Shuffle
    setItems(cards.sort(() => Math.random() - 0.5));
  }, [words]);

  useEffect(() => {
    if (matchedIds.length > 0 && matchedIds.length === items.length) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => onComplete(true), 1500);
    }
  }, [matchedIds, items]);

  const handleCardClick = (item) => {
    if (isChecking || matchedIds.includes(item.id) || selectedIds.includes(item.id)) return;

    const newSelected = [...selectedIds, item.id];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = newSelected;
      const firstItem = items.find(i => i.id === firstId);
      const secondItem = items.find(i => i.id === secondId);

      if (firstItem.pairId === secondItem.pairId) {
        // Match!
        setTimeout(() => {
          setMatchedIds(prev => [...prev, firstId, secondId]);
          setSelectedIds([]);
          setIsChecking(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setSelectedIds([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isMatched = matchedIds.includes(item.id);
          const isError = isSelected && selectedIds.length === 2 && !isMatched && isChecking;
          
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={!isMatched && !isChecking ? { scale: 1.05 } : {}}
              whileTap={!isMatched && !isChecking ? { scale: 0.95 } : {}}
            >
              <Card
                onClick={() => handleCardClick(item)}
                className={`
                  h-32 p-4 flex items-center justify-center text-center cursor-pointer transition-all duration-300 border-2
                  ${isMatched 
                    ? 'bg-green-50 border-green-500 opacity-50' 
                    : isSelected 
                      ? isError 
                        ? 'bg-red-50 border-red-500 animate-shake'
                        : 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-200' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }
                `}
              >
                {isMatched && <Check className="w-6 h-6 text-green-600 absolute top-2 right-2" />}
                <span className={`text-sm md:text-base font-medium ${isMatched ? 'text-green-800' : 'text-slate-700'}`}>
                  {item.content}
                </span>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-8 text-center">
        <p className="text-slate-500">
          Match the words with their definitions. {matchedIds.length / 2} / {items.length / 2} pairs found.
        </p>
      </div>
    </div>
  );
}