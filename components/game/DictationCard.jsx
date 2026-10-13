import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Eye, Check, X, ArrowRight, RefreshCw, Edit3, Globe, Languages, Loader2 } from 'lucide-react';
import { speakText } from "@/components/utils/textToSpeech";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';

export default function DictationCard({ sentence, onComplete, onNext }) {
  const [stage, setStage] = useState('listen'); // listen, check, result
  const [userInput, setUserInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null); // correct, incorrect
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'ar', name: 'Arabic' },
    { code: 'am', name: 'Amharic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'fr', name: 'French' }
  ];

  // Reset state when sentence changes
  useEffect(() => {
    setStage('listen');
    setUserInput('');
    setFeedback(null);
    setIsPlaying(false);
    setTranslation('');
    // Keep selected language
  }, [sentence]);

  // Fetch translation when entering result stage if language is selected
  useEffect(() => {
    if (stage === 'result' && selectedLanguage && !translation) {
      fetchTranslation();
    }
  }, [stage, selectedLanguage]);

  const fetchTranslation = async () => {
    if (!sentence || !selectedLanguage) return;
    
    setIsTranslating(true);
    try {
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name;
      const prompt = `Translate the following text (which could be a word or a sentence) into ${langName}: "${sentence.text}". Return ONLY the translated text, nothing else.`;
      
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });
      
      setTranslation(res);
    } catch (error) {
      console.error("Translation error", error);
      setTranslation("Translation unavailable");
    } finally {
      setIsTranslating(false);
    }
  };

  const speak = () => {
    if (!sentence) return;
    speakText(sentence.text, 'en', {
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false)
    });
  };

  // Clean text for comparison (remove punctuation, case insensitive)
  const normalize = (text) => {
    return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  };

  const checkAnswer = () => {
    const isCorrect = normalize(userInput) === normalize(sentence.text);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setStage('result');
    
    if (isCorrect) {
      // Success animation handled by UI
      onComplete(true);
    } else {
      onComplete(false);
    }
  };

  const handleStageTransition = () => {
    if (stage === 'listen') {
      setStage('check');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-slate-200">
          <Globe className="w-4 h-4 text-slate-500 ml-2" />
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent focus:ring-0">
              <SelectValue placeholder="Translate to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Translation</SelectItem>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white shadow-xl border-0 overflow-hidden rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-blue-600 via-red-500 to-blue-600" />
        
        <CardContent className="p-8 md:p-12 flex flex-col items-center text-center">
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-8 uppercase tracking-wider">
            <span className={stage === 'listen' ? "text-blue-600" : ""}>1. Listen</span>
            <span className="text-slate-300">→</span>
            <span className={stage === 'check' ? "text-blue-600" : ""}>2. Write</span>
            <span className="text-slate-300">→</span>
            <span className={stage === 'result' ? "text-blue-600" : ""}>3. Check</span>
          </div>

          {/* Audio Section */}
          <div className="mb-8 relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={speak}
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                ${isPlaying ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'}`}
            >
              <Volume2 className={`w-12 h-12 ${isPlaying ? 'animate-pulse' : ''}`} />
            </motion.button>
            <p className="mt-4 text-slate-600 font-medium">Click to listen</p>
            <p className="text-sm text-slate-400">Write what you hear on your paper</p>
          </div>

          <AnimatePresence mode="wait">
            {stage === 'listen' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <Button 
                  onClick={() => setStage('check')} 
                  className="w-full max-w-sm bg-slate-900 text-white hover:bg-slate-800 h-12 text-lg rounded-xl"
                >
                  I wrote it down <Edit3 className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {stage === 'check' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full space-y-6"
              >
                <div className="text-left w-full max-w-lg mx-auto bg-slate-50 p-6 rounded-xl border border-slate-200">
                   <p className="text-sm text-slate-500 mb-2 font-medium">Optional: Type here to auto-check</p>
                   <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type sentence here..."
                    className="text-lg p-6 bg-white shadow-sm border-slate-300 focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    autoFocus
                   />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={checkAnswer} 
                    className="bg-green-600 hover:bg-green-700 h-12 px-8 text-lg rounded-xl"
                    disabled={!userInput.trim()}
                  >
                    Check My Answer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => { setFeedback('manual'); setStage('result'); }} 
                    className="h-12 px-8 text-lg rounded-xl border-slate-300"
                  >
                    Just Reveal Answer
                  </Button>
                </div>
              </motion.div>
            )}

            {stage === 'result' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-8"
              >
                <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 w-full relative overflow-hidden">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Correct Sentence</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed mb-2">
                    {sentence.text}
                  </h3>
                  
                  {selectedLanguage && selectedLanguage !== 'none' && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      {isTranslating ? (
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" /> Translating...
                        </div>
                      ) : (
                        <div className="text-lg text-blue-700 font-medium bg-blue-50 p-3 rounded-lg inline-block animate-in fade-in">
                          <span className="mr-2 opacity-75 text-sm uppercase tracking-wide">{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}:</span>
                          {translation}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {feedback === 'correct' && (
                  <div className="flex flex-col items-center text-green-600 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-xl font-bold">Excellent work!</p>
                  </div>
                )}

                {feedback === 'incorrect' && (
                  <div className="flex flex-col items-center text-red-500 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                      <X className="w-6 h-6" />
                    </div>
                    <p className="text-xl font-bold">Keep practicing!</p>
                    <div className="mt-2 text-slate-600">
                      <p className="text-sm">You wrote:</p>
                      <p className="italic line-through opacity-75">{userInput}</p>
                    </div>
                  </div>
                )}

                 {feedback === 'manual' && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                    <p className="text-lg font-medium text-slate-700 mb-4">Did you write it correctly?</p>
                    <div className="flex gap-4">
                      <Button onClick={() => onComplete(false)} variant="outline" className="border-red-200 hover:bg-red-50 text-red-700">
                        <X className="w-4 h-4 mr-2" /> No, I made a mistake
                      </Button>
                      <Button onClick={() => {
                        onComplete(true);
                      }} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" /> Yes, it matches
                      </Button>
                    </div>
                  </div>
                )}

                {(feedback === 'correct' || feedback === 'incorrect') && (
                  <Button onClick={onNext} className="w-full max-w-xs h-12 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                    Next Sentence <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>
    </div>
  );
}