import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Volume2, ArrowRight, Check, X, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { speakText } from "@/components/utils/textToSpeech";
import { toast } from "sonner";
import InterviewReport from './InterviewReport';
import VirtualInterviewer, { AVATAR_URL } from './VirtualInterviewer';

export default function InterviewPractice({ onComplete, onNext }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [sessionResults, setSessionResults] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  // Conversational UI state
  const [interviewerState, setInterviewerState] = useState('idle');
  const [conversation, setConversation] = useState([]);
  const [showTyping, setShowTyping] = useState(false);

  const recognitionRef = useRef(null);
  const responseRef = useRef('');
  const analyzerRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    loadQuestions();
    initializeSpeechRecognition();
    return () => {
      stopAudioAnalysis();
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [conversation, showTyping, isListening, isAnalyzing]);

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      const all = await base44.entities.InterviewQuestion.list('-order', 100);
      const smallTalk = all.filter(q => q.section === 'small_talk').slice(0, 2);
      const personalInfo = all.filter(q => q.section === 'personal_info').slice(0, 3);
      const morals = all.filter(q => q.section === 'morals_ethics').slice(0, 4);
      const oath = all.filter(q => q.section === 'oath_requirements').slice(0, 3);
      setQuestions([...smallTalk, ...personalInfo, ...morals, ...oath]);
    } catch (e) {
      toast.error('Failed to load questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const initializeSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    const resetSilenceTimer = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      }, 12000);
    };

    recognitionRef.current.onstart = () => { setIsListening(true); startTimer(); resetSilenceTimer(); };
    recognitionRef.current.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setUserResponse(t);
      responseRef.current = t;
      resetSilenceTimer();
    };
    recognitionRef.current.onerror = () => {
      setIsListening(false); stopTimer(); stopAudioAnalysis();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
    recognitionRef.current.onend = () => {
      setIsListening(false); stopTimer(); stopAudioAnalysis();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  };

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      src.connect(analyzer);
      analyzerRef.current = analyzer;
      const data = new Uint8Array(analyzer.frequencyBinCount);
      const tick = () => {
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { /* mic denied */ }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setAudioLevel(0);
  };

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) { toast.error('Speech recognition not supported in this browser'); return; }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      setInterviewerState('listening');
      setUserResponse('');
      responseRef.current = '';
      setFeedback(null);
      await startAudioAnalysis();
      recognitionRef.current.start();
    }
  };

  const presentQuestion = (index) => {
    const q = questions[index];
    if (!q) return;

    setUserResponse('');
    setFeedback(null);
    responseRef.current = '';
    setShowTyping(true);
    setInterviewerState('idle');

    setTimeout(() => {
      setShowTyping(false);
      setConversation(prev => [...prev, { role: 'interviewer', text: q.question, id: `q_${index}` }]);
      setInterviewerState('speaking');
      speakText(q.question, 'en', {
        onStart: () => setInterviewerState('speaking'),
        onEnd: () => setInterviewerState('listening')
      });
      // Fallback in case TTS doesn't fire onEnd
      setTimeout(() => setInterviewerState(prev => prev === 'speaking' ? 'listening' : prev), 15000);
    }, 800);
  };

  const startInterview = () => {
    setSessionStarted(true);
    const greeting = "Good morning! Welcome to your citizenship interview. Let's get started.";
    setConversation([{ role: 'interviewer', text: greeting, id: 'greeting' }]);
    setInterviewerState('speaking');
    speakText(greeting, 'en', {
      onStart: () => setInterviewerState('speaking'),
      onEnd: () => {
        setInterviewerState('idle');
        setTimeout(() => presentQuestion(0), 400);
      }
    });
    setTimeout(() => {
      setInterviewerState(prev => {
        if (prev === 'speaking') {
          setTimeout(() => presentQuestion(0), 400);
          return 'idle';
        }
        return prev;
      });
    }, 15000);
  };

  const speakQuestion = () => {
    const q = questions[currentIndex];
    if (!q) return;
    setInterviewerState('speaking');
    speakText(q.question, 'en', {
      onStart: () => setInterviewerState('speaking'),
      onEnd: () => setInterviewerState('listening')
    });
  };

  const analyzeResponse = async () => {
    const response = responseRef.current || userResponse;
    if (!response.trim()) { toast.error('Please record a response first'); return; }

    setConversation(prev => [...prev, { role: 'user', text: response, id: `u_${currentIndex}` }]);
    setInterviewerState('thinking');
    setIsAnalyzing(true);

    const q = questions[currentIndex];
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an experienced USCIS citizenship interview officer and ESL instructor evaluating a naturalization candidate.

INTERVIEW QUESTION: "${q.question}"
EXPECTED RESPONSE: "${q.expected_response}"
CANDIDATE'S SPOKEN RESPONSE: "${response}"
RESPONSE TYPE: ${q.response_type}

Evaluate on 4 dimensions. Be honest but encouraging.

CONTENT (0-100): Does the answer address the question correctly and completely?
GRAMMAR (0-100): Are sentences grammatically correct? Note specific errors.
FLUENCY (0-100): Does it sound natural and conversational?
PRONUNCIATION NOTES: Based on the transcribed text, note any likely pronunciation issues for non-native speakers.

Also provide:
- A corrected/improved version of their response
- 2-3 specific, actionable improvement tips
- Whether this answer would pass the actual interview`,
        response_json_schema: {
          type: "object",
          properties: {
            content_score: { type: "number" },
            grammar_score: { type: "number" },
            fluency_score: { type: "number" },
            overall_score: { type: "number" },
            is_acceptable: { type: "boolean" },
            content_feedback: { type: "string" },
            grammar_feedback: { type: "string" },
            fluency_feedback: { type: "string" },
            pronunciation_notes: { type: "string" },
            corrected_version: { type: "string" },
            improvement_tips: { type: "string" }
          },
          required: ["content_score", "grammar_score", "fluency_score", "overall_score", "is_acceptable", "content_feedback", "grammar_feedback", "fluency_feedback", "corrected_version", "improvement_tips"]
        }
      });
      setFeedback(result);
      setInterviewerState('idle');
      setSessionResults(prev => [...prev, {
        question: q.question,
        section: q.section,
        response,
        expected: q.expected_response,
        ...result
      }]);
    } catch (e) {
      toast.error('Failed to analyze response');
      setInterviewerState('listening');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      presentQuestion(nextIndex);
    } else {
      setShowReport(true);
      if (onComplete) onComplete(sessionResults.filter(r => r.is_acceptable).length >= questions.length * 0.7);
    }
  };

  const handleSkip = () => {
    setSessionResults(prev => [...prev, {
      question: questions[currentIndex].question,
      section: questions[currentIndex].section,
      response: '(skipped)',
      expected: questions[currentIndex].expected_response,
      content_score: 0, grammar_score: 0, fluency_score: 0, overall_score: 0,
      is_acceptable: false,
      content_feedback: 'Question was skipped.',
      grammar_feedback: '', fluency_feedback: '',
      corrected_version: questions[currentIndex].expected_response,
      improvement_tips: 'Practice answering every question during the interview.'
    }]);
    handleNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserResponse('');
    setFeedback(null);
    setSessionResults([]);
    setShowReport(false);
    setSessionStarted(false);
    setConversation([]);
    setInterviewerState('idle');
    responseRef.current = '';
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (isLoadingQuestions) return (
    <Card className="p-12 text-center">
      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-600" />
      <p className="text-slate-600 font-medium">Loading interview questions...</p>
    </Card>
  );

  if (questions.length === 0) return (
    <Card className="p-12 text-center">
      <p className="text-slate-600 mb-4">No interview questions found.</p>
      <Button onClick={() => window.location.reload()} variant="outline">Reload</Button>
    </Card>
  );

  if (showReport) return (
    <InterviewReport
      results={sessionResults}
      questions={questions}
      onRestart={handleRestart}
    />
  );

  if (!sessionStarted) return <InterviewIntro questions={questions} onStart={startInterview} />;

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const sectionLabel = { small_talk: 'Small Talk', personal_info: 'Personal Info', morals_ethics: 'Morals & Ethics', oath_requirements: 'Oath Requirements' }[current.section] || current.section;

  const statusText = {
    speaking: 'Officer Martinez is speaking...',
    listening: 'Your turn — tap the microphone to answer',
    thinking: 'Officer Martinez is evaluating your response...',
    idle: feedback ? 'Review your feedback below' : 'Ready when you are',
  }[interviewerState];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-2 text-sm font-medium text-slate-600">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{sessionResults.filter(r => r.is_acceptable).length} passed so far</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex gap-1 mt-2">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < sessionResults.length
                ? (sessionResults[i]?.is_acceptable ? 'bg-green-500' : 'bg-red-400')
                : i === currentIndex ? 'bg-indigo-400' : 'bg-slate-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Interview Card */}
      <Card className="bg-white shadow-xl border-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <CardContent className="p-6 md:p-8 space-y-5">

          {/* Virtual Interviewer */}
          <div className="flex flex-col items-center pt-2">
            <VirtualInterviewer state={interviewerState} />
          </div>

          {/* Section badge + repeat */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wide">
              {sectionLabel}
            </span>
            <Button variant="ghost" size="sm" onClick={speakQuestion} className="text-indigo-500 hover:text-indigo-700 gap-1.5" disabled={interviewerState === 'speaking'}>
              <Volume2 className="w-4 h-4" /> Repeat Question
            </Button>
          </div>

          {/* Conversation Transcript */}
          <div
            ref={transcriptRef}
            className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3 max-h-[280px] overflow-y-auto"
          >
            {conversation.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} text={msg.text} />
            ))}
            {showTyping && <TypingIndicator />}

            {/* Live recording bubble */}
            {isListening && (
              <div className="flex justify-end">
                <div className="bg-indigo-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%]">
                  <div className="flex items-center gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(6, Math.random() * audioLevel * 0.5 + audioLevel * 0.5)}px`, opacity: 0.6 + Math.random() * 0.4 }}
                      />
                    ))}
                  </div>
                  {userResponse && <p className="text-sm text-slate-700 italic mt-1">"{userResponse}"</p>}
                  <p className="text-xs text-indigo-500 font-medium mt-1">Recording... {formatTime(recordingTime)}</p>
                </div>
              </div>
            )}

            {/* Thinking bubble */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <img src={AVATAR_URL} className="w-8 h-8 rounded-full object-cover mr-2 shrink-0 border-2 border-white shadow-sm" alt="" />
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 shadow-sm">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-indigo-400 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <p className="text-center text-sm font-medium text-slate-500">{statusText}</p>

          {/* Controls */}
          {!feedback ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3 items-center">
                <Button
                  onClick={toggleListening}
                  size="lg"
                  className={`h-14 w-14 rounded-full shadow-lg transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'
                  }`}
                  disabled={isAnalyzing}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                {userResponse && !isListening && (
                  <Button
                    onClick={analyzeResponse}
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl"
                    disabled={isAnalyzing}
                  >
                    Evaluate Answer
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-slate-400 hover:text-slate-600 text-xs">
                Skip this question
              </Button>
            </div>
          ) : (
            <>
              <FeedbackPanel feedback={feedback} response={userResponse} expected={current.expected_response} />
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 w-full rounded-xl h-12 text-base"
              >
                {currentIndex < questions.length - 1 ? (
                  <><ArrowRight className="w-5 h-5 mr-2" /> Next Question</>
                ) : (
                  <><FileText className="w-5 h-5 mr-2" /> See Full Report</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({ role, text }) {
  const isInterviewer = role === 'interviewer';
  return (
    <div className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      {isInterviewer && (
        <img src={AVATAR_URL} className="w-8 h-8 rounded-full object-cover mr-2 shrink-0 border-2 border-white shadow-sm" alt="" />
      )}
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isInterviewer
          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
          : 'bg-indigo-600 text-white rounded-tr-sm'
      }`}>
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <img src={AVATAR_URL} className="w-8 h-8 rounded-full object-cover mr-2 shrink-0 border-2 border-white shadow-sm" alt="" />
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 shadow-sm">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback, response, expected }) {
  const [expanded, setExpanded] = useState(false);
  const passed = feedback.is_acceptable;

  const scoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-500';
  const barColor = (s) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
          {passed ? <Check className="w-7 h-7 text-green-600" /> : <X className="w-7 h-7 text-orange-500" />}
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg text-slate-900">{passed ? 'Good Answer!' : 'Needs Practice'}</p>
          <p className="text-sm text-slate-500">{passed ? 'This would pass in a real interview.' : 'Review the feedback below.'}</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${scoreColor(feedback.overall_score)}`}>{feedback.overall_score}</p>
          <p className="text-xs text-slate-400">/ 100</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Content', score: feedback.content_score },
          { label: 'Grammar', score: feedback.grammar_score },
          { label: 'Fluency', score: feedback.fluency_score },
        ].map(({ label, score }) => (
          <div key={label} className="bg-white rounded-xl p-3 border border-slate-100 text-center">
            <p className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 my-1.5">
              <div className={`h-1.5 rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {feedback.corrected_version && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Better Way to Say It</p>
          <p className="text-slate-800 italic">"{feedback.corrected_version}"</p>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl transition-colors text-sm font-semibold text-slate-700"
      >
        <span>Detailed Feedback</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          {[
            { color: 'border-blue-400', title: 'Content', text: feedback.content_feedback },
            { color: 'border-indigo-400', title: 'Grammar', text: feedback.grammar_feedback },
            { color: 'border-purple-400', title: 'Fluency', text: feedback.fluency_feedback },
            feedback.pronunciation_notes && { color: 'border-teal-400', title: 'Pronunciation Notes', text: feedback.pronunciation_notes },
            { color: 'border-amber-400', title: 'Tips to Improve', text: feedback.improvement_tips },
          ].filter(Boolean).map(({ color, title, text }) => (
            <div key={title} className={`bg-white p-4 rounded-xl border-l-4 ${color} shadow-sm`}>
              <p className="text-sm font-bold text-slate-700 mb-1">{title}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InterviewIntro({ questions, onStart }) {
  const sections = [...new Set(questions.map(q => q.section))];
  const sectionNames = { small_talk: 'Small Talk', personal_info: 'Personal Information', morals_ethics: 'Morals & Ethics', oath_requirements: 'Oath Requirements' };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-0 shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <CardContent className="p-10 text-center space-y-6">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <motion.div
                className="absolute -inset-1.5 rounded-full ring-4 ring-indigo-300"
                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src={AVATAR_URL}
                alt="Officer Martinez"
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg relative z-10"
              />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-800">Officer Martinez</p>
              <p className="text-sm text-slate-500">Your USCIS Interviewer</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Mock Interview</h2>
            <p className="text-lg text-slate-500 max-w-md mx-auto">
              Have a conversation with Officer Martinez. She'll ask you real interview questions and evaluate your responses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
            {[
              { icon: '🎤', text: `${questions.length} questions across ${sections.length} sections` },
              { icon: '🗣️', text: 'Officer speaks questions aloud' },
              { icon: '🤖', text: 'Real-time AI evaluation' },
              { icon: '📊', text: 'Content, grammar & fluency scores' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-lg">{icon}</span>
                <p className="text-sm text-slate-700 font-medium">{text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-100 text-left max-w-sm mx-auto">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sections Covered</p>
            <div className="space-y-1">
              {sections.map(s => (
                <div key={s} className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {sectionNames[s] || s}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onStart} size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-14 px-12 text-lg rounded-2xl shadow-lg shadow-indigo-200">
            Start Interview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}