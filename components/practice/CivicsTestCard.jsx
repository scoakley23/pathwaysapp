import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Eye, ArrowRight, Globe, Loader2, CheckCircle, AlertCircle, Keyboard, MicOff, ChevronRight, Mic } from 'lucide-react';
import { speakText } from "@/components/utils/textToSpeech";
import AIExplanation from '@/components/ai/AIExplanation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';

import { getPersonalizedAnswer } from '@/components/civics/RepresentativeFinder';
import { LANGUAGES } from '@/hooks/useLessonTranslation';

export default function CivicsTestCard({ question, onComplete, onNext, representativeData }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [selfCheckMode, setSelfCheckMode] = useState(false);
  const [inputMode, setInputMode] = useState('type');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const SUPPORTED_LANGUAGES = LANGUAGES.filter(l => l.value !== 'en');

  // Reset state when question changes
  useEffect(() => {
    setIsRevealed(false);
    setIsPlaying(false);
    setTranslation('');
    setUserAnswer('');
    setVerifying(false);
    setVerificationResult(null);
    setSelfCheckMode(false);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    // Keep selected language
  }, [question]);

  // Fetch translation when language is selected or question changes
  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== 'none' && !translation) {
      fetchTranslation();
    }
  }, [selectedLanguage, question]);

  const fetchTranslation = async () => {
    if (!question || !selectedLanguage || selectedLanguage === 'none') return;
    
    setIsTranslating(true);
    try {
      const langName = SUPPORTED_LANGUAGES.find(l => l.value === selectedLanguage)?.label;
      const prompt = `Translate the following Civics Question and Answer into ${langName}.
      
      Question: "${question.question}"
      Answer: "${question.answer}"
      
      Return ONLY the translation in this format:
      Question: [Translated Question]
      Answer: [Translated Answer]`;
      
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

  const personalizedAnswer = getPersonalizedAnswer(question.question, representativeData);

  // Speech recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setUserAnswer(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const checkAnswer = async () => {
    if (!userAnswer.trim()) return;
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setVerifying(true);
    try {
      const correctAnswer = personalizedAnswer || question.answer;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a USCIS citizenship test examiner. Determine if the student's spoken answer is correct.

Question: ${question.question}
Official Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

In the real USCIS interview, answers don't need to be word-for-word — as long as the meaning is correct, it counts. Determine if the student's answer conveys the correct meaning.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean" },
            feedback: { type: "string" }
          }
        }
      });
      setVerificationResult(result);
    } catch (e) {
      console.error('Failed to verify answer:', e);
      setSelfCheckMode(true);
      setIsRevealed(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleResult = (isCorrect) => {
    onComplete(isCorrect);
    onNext();
  };

  const speak = (text) => {
    speakText(text, 'en', {
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
    });
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
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white shadow-xl border-0 overflow-hidden rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600" />
        
        <CardContent className="p-8 md:p-12 flex flex-col items-center text-center min-h-[400px] justify-center">
          
          <div className="mb-8 w-full">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wide mb-4">
              {question.version} Civics Test
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed mb-4">
              {question.question}
            </h3>

             {/* Translation Display for Question */}
             {selectedLanguage && selectedLanguage !== 'none' && (
                <div className="mb-4">
                    {isTranslating ? (
                         <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                        </div>
                    ) : (
                        <p className="text-lg text-indigo-700 font-medium animate-in fade-in bg-indigo-50 p-3 rounded-lg inline-block">
                            {translation.split('Answer:')[0].replace('Question:', '').trim()}
                        </p>
                    )}
                </div>
            )}
          </div>

          <div className="mb-8">
             <Button
              variant="outline"
              size="icon"
              onClick={() => speak(question.question)}
              className={`rounded-full w-12 h-12 ${isPlaying ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : ''}`}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!verificationResult && !isRevealed ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-4"
              >
                {!selfCheckMode ? (
                  <>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mx-auto">
                      <button
                        onClick={() => { if (isListening && recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} } setInputMode('type'); }}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'type' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Keyboard className="w-4 h-4 mr-1.5" /> Type
                      </button>
                      <button
                        onClick={() => {
                          if (!recognitionRef.current) { toast.error('Voice input is not supported in this browser'); return; }
                          setInputMode('speak');
                        }}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'speak' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Mic className="w-4 h-4 mr-1.5" /> Speak
                      </button>
                    </div>

                    {inputMode === 'speak' ? (
                      <div className="space-y-3">
                        <div className="min-h-[48px] p-3 rounded-lg border border-slate-200 bg-slate-50">
                          {userAnswer ? (
                            <p className="text-slate-800">{userAnswer}</p>
                          ) : (
                            <p className="text-slate-400">
                              {isListening ? 'Listening...' : 'Tap the microphone and speak your answer'}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            if (isListening) {
                              recognitionRef.current?.stop();
                            } else {
                              setUserAnswer('');
                              recognitionRef.current?.start();
                            }
                          }}
                          disabled={!recognitionRef.current}
                          className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                        >
                          {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                          {isListening ? 'Stop Listening' : 'Start Speaking'}
                        </Button>
                      </div>
                    ) : (
                      <Input
                        placeholder="Type your answer here..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && userAnswer.trim() && !verifying) {
                            checkAnswer();
                          }
                        }}
                        className="text-base"
                      />
                    )}

                    <div className="space-y-2">
                      <Button
                        onClick={checkAnswer}
                        disabled={!userAnswer.trim() || verifying}
                        className="h-12 px-8 text-lg rounded-xl bg-indigo-600 hover:bg-indigo-700"
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Submit Answer
                          </>
                        )}
                      </Button>
                      <button
                        onClick={() => setSelfCheckMode(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 underline block mx-auto"
                      >
                        Having trouble? Show answer to self-check
                      </button>
                    </div>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsRevealed(true)}
                    className="h-12 px-8 text-lg rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Eye className="mr-2 w-5 h-5" /> Show Answer
                  </Button>
                )}
              </motion.div>
            ) : verificationResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-6"
              >
                {verificationResult.is_correct ? (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-green-800 mb-2">Correct!</h3>
                      <p className="text-green-900 text-sm">{verificationResult.feedback}</p>
                    </div>
                    <div className="flex justify-center">
                      <Button onClick={() => handleResult(true)} className="bg-green-600 hover:bg-green-700 px-8">
                        Next Question
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        <span className="font-bold text-red-800 text-lg">Not quite right</span>
                      </div>
                      <p className="text-red-900 text-sm mb-4">{verificationResult.feedback}</p>
                      <div className="pt-4 border-t border-red-200">
                        <p className="text-sm text-slate-500 mb-1">Official answer:</p>
                        {personalizedAnswer ? (
                          <>
                            <p className="text-lg font-bold text-green-800">{personalizedAnswer}</p>
                            <p className="text-sm text-slate-500 mt-1">Sample: {question.answer}</p>
                          </>
                        ) : (
                          <p className="text-lg font-medium text-slate-800">{question.answer}</p>
                        )}
                      </div>
                    </div>
                    <AIExplanation
                      question={question.question}
                      answer={personalizedAnswer || question.answer}
                    />
                    <div className="flex justify-center">
                      <Button onClick={() => handleResult(false)} className="bg-indigo-600 hover:bg-indigo-700 px-8">
                        Continue
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-8"
              >
                <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 w-full">
                  {personalizedAnswer ? (
                    <>
                      <p className="text-sm text-green-600 uppercase tracking-wider font-bold mb-2">Correct Answer for You</p>
                      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xl font-bold text-green-800">{personalizedAnswer}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Official Sample Answer</p>
                        <p className="text-base text-slate-500">{question.answer}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Answer</p>
                      <p className="text-xl font-medium text-slate-800 leading-relaxed">
                        {question.answer}
                      </p>
                    </>
                  )}

                   {/* Translation Display for Answer */}
                    {selectedLanguage && selectedLanguage !== 'none' && !isTranslating && translation.includes('Answer:') && (
                       <p className="text-lg text-indigo-700 font-medium mt-2 animate-in fade-in">
                           {translation.split('Answer:')[1].trim()}
                       </p>
                    )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(personalizedAnswer || question.answer)}
                    className="mt-4 text-slate-500 hover:text-indigo-600"
                  >
                    <Volume2 className="w-4 h-4 mr-1" /> Listen to answer
                    </Button>

                    <AIExplanation 
                    question={question.question} 
                    answer={personalizedAnswer || question.answer} 
                    />
                    </div>

                <div className="flex flex-col items-center space-y-4">
                  <p className="text-slate-600 font-medium">How did you do?</p>
                  <div className="flex gap-4">
                     <Button 
                        variant="outline" 
                        className="border-orange-200 hover:bg-orange-50 text-orange-700 min-w-[120px]"
                        onClick={() => handleResult(false)}
                     >
                        Hard / Missed
                     </Button>
                     <Button 
                        className="bg-green-600 hover:bg-green-700 min-w-[120px]"
                        onClick={() => handleResult(true)}
                     >
                        Easy / Got it
                     </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>
       {!verificationResult && !isRevealed && (
         <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onNext} className="text-slate-500 hover:text-slate-800">
                Skip to next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
         </div>
       )}
    </div>
  );
}