import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Play, CheckCircle, RotateCcw, AlertCircle, Eye, EyeOff, Mic, MicOff, Keyboard, ChevronLeft, ChevronRight, Lightbulb, BookOpen } from 'lucide-react';
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import FlashcardView from '@/components/lessons/FlashcardView';
import KeyPointsDisplay from '@/components/lessons/KeyPointsDisplay';
import QuizExplanationPanel from '@/components/lessons/QuizExplanationPanel';
import GlossaryText from '@/components/lessons/GlossaryText';
import { toast } from "sonner";
import { useLessonTranslation } from '@/hooks/useLessonTranslation';
import LanguageSelector from '@/components/lessons/LanguageSelector';

export default function LessonDetail({ lesson, onBack, onComplete, lessons, onNavigateLesson }) {
  const [user, setUser] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lessonProgress, setLessonProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [flashcardsViewed, setFlashcardsViewed] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [inputMode, setInputMode] = useState('type');
  const [isListening, setIsListening] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [selfCheckMode, setSelfCheckMode] = useState(false);
  const recognitionRef = useRef(null);

  const {
    language,
    setLanguage,
    translating,
    displayLesson,
    displayFlashcards,
    displayQuizzes,
  } = useLessonTranslation({ lesson, flashcards, quizzes });

  const questionVersion = displayQuizzes.length > 0 ? quizzes[0].version : '2008';

  useEffect(() => {
    loadData();
  }, [lesson?.id]);

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
      setTypedAnswer(transcript);
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

  const cleanQuestionText = (text) => {
    if (!text) return text;
    return text.replace(/\s*\([^)]*(?:2008|2025)[^)]*\)\s*$/i, '').trim();
  };

  const currentIndex = lessons ? lessons.findIndex(l => l.id === lesson?.id) : -1;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < (lessons?.length || 0) - 1 ? lessons[currentIndex + 1] : null;

  const relatedLessons = lessons ? lessons.filter(l => l.topic === lesson?.topic && l.id !== lesson?.id) : [];

  const handleNavigate = (newLesson) => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setTypedAnswer('');
    setShowAnswer(false);
    setScore(0);
    setAnsweredCount(0);
    setFlashcardsViewed(false);
    setQuizCompleted(false);
    setShowExplanation(false);
    setExplanation(null);
    setVerifying(false);
    setVerificationResult(null);
    setSelfCheckMode(false);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onNavigateLesson) onNavigateLesson(newLesson);
  };

  const loadData = async () => {
    if (!lesson?.id) return;
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [lessonFlashcards, civics2025, civics2008, progressList] = await Promise.all([
        base44.entities.LessonFlashcard.filter({ lesson_id: lesson.id }, null, 200),
        base44.entities.CivicsQuestion.filter({ version: '2025', category: lesson.topic }, null, 100),
        base44.entities.CivicsQuestion.filter({ version: '2008', category: lesson.topic }, null, 100),
        currentUser?.email ? base44.entities.LessonProgress.filter(
          { user_email: currentUser.email, lesson_id: lesson.id }, null, 1
        ) : Promise.resolve([])
      ]);

      setFlashcards(lessonFlashcards);
      // Use 2025 questions, fall back to 2008 if none available
      setQuizzes(civics2025.length > 0 ? civics2025 : civics2008);
      if (progressList.length > 0) {
        setLessonProgress(progressList[0]);
        setQuizCompleted(progressList[0].quiz_attempts > 0);
      } else if (currentUser?.email) {
        // Mark as "in progress" the moment they open the lesson
        try {
          const newProgress = await base44.entities.LessonProgress.create({
            user_email: currentUser.email,
            lesson_id: lesson.id,
            topic: lesson.topic,
            completed: false,
            quiz_attempts: 0,
            best_score: 0,
            last_score: 0,
            total_questions: civics2025.length || civics2008.length,
            last_attempt_date: new Date().toISOString(),
            needs_review: false
          });
          setLessonProgress(newProgress);
        } catch (e) {
          console.error('Failed to create initial progress:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load lesson data:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&]+)/,
      /(?:youtu\.be\/)([^?]+)/,
      /(?:youtube\.com\/embed\/)([^/?]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setTypedAnswer('');
    setShowAnswer(false);
    setScore(0);
    setAnsweredCount(0);
    setShowExplanation(false);
    setExplanation(null);
    setVerifying(false);
    setVerificationResult(null);
    setSelfCheckMode(false);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const checkAnswer = async () => {
    if (!typedAnswer.trim()) return;
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (selfCheckMode) {
      setShowAnswer(true);
      setAnsweredCount(answeredCount + 1);
      return;
    }

    setVerifying(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a USCIS citizenship test examiner. Determine if the student's spoken answer is correct.

Question: ${displayQuizzes[currentQuestion].question}
Official Answer: ${displayQuizzes[currentQuestion].answer}
Student's Answer: ${typedAnswer}

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
      setShowAnswer(true);
      setAnsweredCount(answeredCount + 1);

      if (!result.is_correct) {
        setShowExplanation(true);
        fetchExplanation(displayQuizzes[currentQuestion]);
      }
    } catch (e) {
      console.error('Failed to verify answer:', e);
      setSelfCheckMode(true);
      setShowAnswer(true);
      setAnsweredCount(answeredCount + 1);
    } finally {
      setVerifying(false);
    }
  };

  const advanceQuestion = (newScore) => {
    const totalAnswered = answeredCount;
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (currentQuestion + 1 < displayQuizzes.length) {
      setCurrentQuestion(currentQuestion + 1);
      setTypedAnswer('');
      setShowAnswer(false);
      setShowExplanation(false);
      setExplanation(null);
      setVerificationResult(null);
      setSelfCheckMode(false);
    } else {
      finishQuiz(totalAnswered > 0 ? (newScore / displayQuizzes.length) * 100 : 0);
    }
  };

  const markCorrect = () => {
    const newScore = score + 1;
    setScore(newScore);
    advanceQuestion(newScore);
  };

  const markIncorrect = () => {
    setShowExplanation(true);
    fetchExplanation(displayQuizzes[currentQuestion]);
  };

  const fetchExplanation = async (quizItem) => {
    setLoadingExplanation(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A student studying for the US citizenship test got this question wrong:

Question: ${quizItem.question}
Correct Answer: ${quizItem.answer}

Please provide a brief, simple explanation (2-3 sentences) of this concept in plain English that a non-native English speaker can easily understand. Explain WHY this is the correct answer and include any helpful context.`,
      });
      setExplanation(result);
    } catch (e) {
      console.error('Failed to fetch explanation:', e);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleContinueFromExplanation = () => {
    setShowExplanation(false);
    setExplanation(null);
    advanceQuestion(score);
  };

  const finishQuiz = async (finalScore) => {
    if (!user?.email) return;
    
    try {
      const existing = await base44.entities.LessonProgress.filter(
        { user_email: user.email, lesson_id: lesson.id }, null, 1
      );

      const progressData = {
        user_email: user.email,
        lesson_id: lesson.id,
        topic: lesson.topic,
        completed: true,
        quiz_attempts: (lessonProgress?.quiz_attempts || 0) + 1,
        best_score: Math.max(lessonProgress?.best_score || 0, finalScore),
        last_score: finalScore,
        total_questions: displayQuizzes.length,
        last_attempt_date: new Date().toISOString(),
        needs_review: finalScore < 60
      };

      if (existing.length > 0) {
        await base44.entities.LessonProgress.update(existing[0].id, progressData);
      } else {
        await base44.entities.LessonProgress.create(progressData);
      }

      toast.success(`Quiz completed! Score: ${Math.round(finalScore)}%`);
      setQuizCompleted(true);
      setLessonProgress(prev => ({ ...prev, completed: true, quiz_attempts: (prev?.quiz_attempts || 0) + 1, best_score: Math.max(prev?.best_score || 0, finalScore), last_score: finalScore }));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const handleMarkComplete = async () => {
    if (!user?.email) return;
    
    try {
      const existing = await base44.entities.LessonProgress.filter(
        { user_email: user.email, lesson_id: lesson.id }, null, 1
      );

      const data = {
        user_email: user.email,
        lesson_id: lesson.id,
        topic: lesson.topic,
        completed: true,
        quiz_attempts: lessonProgress?.quiz_attempts || 0,
        best_score: lessonProgress?.best_score || 0,
        last_score: lessonProgress?.last_score || 0,
        total_questions: displayQuizzes.length,
        last_attempt_date: new Date().toISOString(),
        needs_review: lessonProgress?.needs_review || false
      };

      if (existing.length > 0) {
        await base44.entities.LessonProgress.update(existing[0].id, data);
      } else {
        await base44.entities.LessonProgress.create(data);
      }
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
    if (onComplete) onComplete();
  };

  const videoId = extractYouTubeId(lesson.video_url);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} className="text-slate-600">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lessons
        </Button>
        <div className="flex items-center gap-3">
          <LanguageSelector
            language={language}
            onLanguageChange={setLanguage}
            translating={translating}
          />
          {translating ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-blue-700 text-sm">Translating...</span>
            </div>
          ) : lessonProgress?.completed && lessonProgress?.quiz_attempts > 0 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Lesson Completed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-500 text-sm">Complete the flashcards and quiz to finish</span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{displayLesson.title}</h1>
        {displayLesson.description && (
          <p className="text-slate-600 mt-2">{displayLesson.description}</p>
        )}
      </div>

      {/* Video */}
      {videoId ? (
        <div className="w-full rounded-xl overflow-hidden shadow-lg bg-black">
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}`}
              title="Lesson video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        lesson.video_url && (
          <div className="w-full rounded-xl bg-slate-100 p-8 text-center text-slate-500">
            Video not available
          </div>
        )
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="content" className="flex items-center gap-1.5">
            Lesson
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex items-center gap-1.5" onClick={() => setFlashcardsViewed(true)}>
            Flashcards
            {flashcardsViewed && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-1.5">
            Quiz
            {quizCompleted && lessonProgress?.best_score > 0 && (
              <span className="text-xs text-green-600 font-medium ml-0.5">{Math.round(lessonProgress.best_score)}%</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6 mt-4">
          {displayLesson.key_points && displayLesson.key_points.length > 0 && (
            <KeyPointsDisplay keyPoints={displayLesson.key_points} />
          )}

          {displayLesson.content && (
            <Card className="p-6">
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p><GlossaryText>{children}</GlossaryText></p>,
                    li: ({ children }) => <li><GlossaryText>{children}</GlossaryText></li>,
                  }}
                >
                  {displayLesson.content}
                </ReactMarkdown>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards" className="mt-4">
          <Card className="p-6">
            <FlashcardView flashcards={displayFlashcards} />
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-4">
          <Card className="p-6">
            {displayQuizzes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No USCIS civics questions available for this topic yet.
              </div>
            ) : !quizStarted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Oral Civics Practice</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Just like the real USCIS interview — read the question, then speak or type your answer.
                  Your response will be verified automatically, just like a real officer would assess it.
                </p>
                <p className="text-sm text-slate-500">
                  {displayQuizzes.length} questions from the {questionVersion} civics test
                </p>
                {lessonProgress && lessonProgress.quiz_attempts > 0 && (
                  <p className="text-sm text-slate-500">
                    Previous best: {Math.round(lessonProgress.best_score)}% ({lessonProgress.quiz_attempts} attempt{lessonProgress.quiz_attempts > 1 ? 's' : ''})
                  </p>
                )}
                <Button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700">
                  Start Practice
                </Button>
              </div>
            ) : currentQuestion < displayQuizzes.length ? (
              <div className="space-y-6">
                {/* Progress */}
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Question {currentQuestion + 1} of {displayQuizzes.length}</span>
                  <span>Score: {score}/{answeredCount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentQuestion + (showAnswer ? 1 : 0)) / displayQuizzes.length) * 100}%` }}
                  />
                </div>

                {/* Question */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {cleanQuestionText(displayQuizzes[currentQuestion].question)}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {displayQuizzes[currentQuestion].version} Civics Test
                  </p>
                  
                  {/* Answer input area */}
                  <div className="space-y-3">
                    {/* Mode toggle */}
                    {!showAnswer && (
                      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                        <button
                          onClick={() => { if (isListening && recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} } setInputMode('type'); }}
                          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'type' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Keyboard className="w-4 h-4 mr-1.5" /> Type
                        </button>
                        <button
                          onClick={() => {
                            if (!recognitionRef.current) { toast.error('Voice input is not supported in this browser'); return; }
                            setInputMode('speak');
                          }}
                          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'speak' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Mic className="w-4 h-4 mr-1.5" /> Speak
                        </button>
                      </div>
                    )}

                    {inputMode === 'speak' && !showAnswer ? (
                      <div className="space-y-3">
                        <div className="min-h-[48px] p-3 rounded-lg border border-slate-200 bg-slate-50">
                          {typedAnswer ? (
                            <p className="text-slate-800">{typedAnswer}</p>
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
                              setTypedAnswer('');
                              recognitionRef.current?.start();
                            }
                          }}
                          disabled={!recognitionRef.current}
                          className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}
                        >
                          {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                          {isListening ? 'Stop Listening' : 'Start Speaking'}
                        </Button>
                      </div>
                    ) : !showAnswer ? (
                      <Input
                        placeholder="Type your answer here..."
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !showAnswer && typedAnswer.trim()) {
                            checkAnswer();
                          }
                        }}
                        className="text-base"
                      />
                    ) : null}

                    {!showAnswer ? (
                      <div className="space-y-2">
                        <Button
                          onClick={checkAnswer}
                          disabled={!typedAnswer.trim() || verifying}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Submit Answer
                            </>
                          )}
                        </Button>
                        {!selfCheckMode && (
                          <button
                            onClick={() => setSelfCheckMode(true)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline block"
                          >
                            Having trouble? Reveal answer to self-check
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!selfCheckMode && verificationResult ? (
                          verificationResult.is_correct ? (
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <span className="font-semibold text-green-800">Correct!</span>
                                </div>
                                <p className="text-green-900 text-sm">{verificationResult.feedback}</p>
                              </div>
                              <div className="flex justify-center">
                                <Button onClick={markCorrect} className="bg-green-600 hover:bg-green-700">
                                  Next Question
                                  <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-5 h-5 text-red-600" />
                                  <span className="font-semibold text-red-800">Not quite right</span>
                                </div>
                                <p className="text-red-900 text-sm mb-3">{verificationResult.feedback}</p>
                                <div className="pt-3 border-t border-red-200">
                                  <p className="text-sm text-slate-500 mb-1">Official answer:</p>
                                  <p className="text-slate-800 font-medium">{displayQuizzes[currentQuestion].answer}</p>
                                </div>
                              </div>
                              <QuizExplanationPanel
                                loadingExplanation={loadingExplanation}
                                explanation={explanation}
                                relatedLessons={relatedLessons}
                                onNavigate={handleNavigate}
                                onContinue={handleContinueFromExplanation}
                              />
                            </div>
                          )
                        ) : (
                          <>
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                              <div className="flex items-center gap-2 mb-1">
                                <EyeOff className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-semibold text-blue-800">Official Answer:</span>
                              </div>
                              <p className="text-blue-900 font-medium">{displayQuizzes[currentQuestion].answer}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-sm text-slate-500 mb-1">Your answer:</p>
                              <p className="text-slate-800">{typedAnswer}</p>
                            </div>
                            {showExplanation ? (
                              <QuizExplanationPanel
                                loadingExplanation={loadingExplanation}
                                explanation={explanation}
                                relatedLessons={relatedLessons}
                                onNavigate={handleNavigate}
                                onContinue={handleContinueFromExplanation}
                              />
                            ) : (
                              <div className="flex gap-3 justify-center">
                                <Button onClick={markCorrect} className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  I got it right
                                </Button>
                                <Button onClick={markIncorrect} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  I need to practice this
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Quiz Results */
              <div className="text-center py-8 space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  (score / displayQuizzes.length) * 100 >= 80 ? 'bg-green-100' :
                  (score / displayQuizzes.length) * 100 >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className="text-2xl font-bold">{Math.round((score / displayQuizzes.length) * 100)}%</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Practice Complete!</h3>
                <p className="text-slate-600">
                  You got {score} out of {displayQuizzes.length} correct
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                  <p className="text-sm text-blue-800">
                    <strong>Remember:</strong> In the real USCIS interview, an officer will ask you these questions 
                    verbally. Your answers don't need to be word-for-word — as long as you convey the correct 
                    meaning, you'll pass!
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  {!flashcardsViewed && displayFlashcards.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2 max-w-md mx-auto">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Review the flashcards tab before marking this lesson complete.
                    </div>
                  )}
                  <div className="flex justify-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={startQuiz}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Practice
                    </Button>
                    <Button 
                      onClick={handleMarkComplete} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!flashcardsViewed && displayFlashcards.length > 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                    {nextLesson && (
                      <Button onClick={() => handleNavigate(nextLesson)} className="bg-blue-600 hover:bg-blue-700">
                        Next Lesson
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

      </Tabs>

      {/* Lesson Navigation */}
      {lessons && lessons.length > 1 && (
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200">
          {prevLesson ? (
            <Button variant="outline" onClick={() => handleNavigate(prevLesson)} className="flex items-center gap-2 max-w-[40%]">
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <div className="text-left overflow-hidden">
                <div className="text-xs text-slate-400">Previous</div>
                <div className="text-sm font-medium truncate">{prevLesson.title}</div>
              </div>
            </Button>
          ) : <div className="max-w-[40%]" />}
          
          <Button variant="ghost" onClick={onBack} className="text-slate-500 shrink-0">
            All Lessons
          </Button>
          
          {nextLesson ? (
            <Button onClick={() => handleNavigate(nextLesson)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 max-w-[40%]">
              <div className="text-right overflow-hidden">
                <div className="text-xs text-blue-200">Next</div>
                <div className="text-sm font-medium truncate">{nextLesson.title}</div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Button>
          ) : <div className="max-w-[40%]" />}
        </div>
      )}
    </div>
  );
}