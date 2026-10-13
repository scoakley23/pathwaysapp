import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, BookA, GraduationCap, Clock, ArrowRight, CheckCircle, Play, Loader2, Sparkles, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DictationCard from '@/components/game/DictationCard';
import CivicsTestCard from '@/components/practice/CivicsTestCard';
import FlashcardGame from '@/components/practice/FlashcardGame';
import MatchingGame from '@/components/practice/MatchingGame';
import ReadingPracticeCard from '@/components/practice/ReadingPracticeCard';
import InterviewPractice from '@/components/practice/InterviewPractice';
import StudyBuddy from '@/components/ai/StudyBuddy';
import RepresentativeFinder from '@/components/civics/RepresentativeFinder';
import PracticePathProgress from '@/components/practice/PracticePathProgress';
import { toast } from "sonner";

export default function Practice() {
  const [mode, setMode] = useState('menu'); // menu, dictation, vocabulary, civics
  const [vocabSubMode, setVocabSubMode] = useState('dictation'); // dictation, flashcards, matching
  const [civicsVersion, setCivicsVersion] = useState('2008');
  const [civicsDifficulty, setCivicsDifficulty] = useState('all'); // all, easy, medium, hard
  const [content, setContent] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [representativeData, setRepresentativeData] = useState(null);
  const hasMounted = React.useRef(false);

  const loadRepresentativeData = async (email) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const profiles = await base44.entities.PublicProfile.filter({ user_email: normalizedEmail }, '-created_date', 1);
      if (profiles.length > 0 && profiles[0].representative_data) {
        setRepresentativeData(profiles[0].representative_data);
      }
    } catch (e) {
      console.error("Error loading representative data", e);
    }
  };

  const loadUserAndAssignments = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const normalizedUser = { ...user, email: normalizedEmail };
          setCurrentUser(normalizedUser);
          loadRepresentativeData(normalizedEmail);
          const myAssignments = await base44.entities.Assignment.filter(
            { student_email: normalizedEmail, status: 'pending' }, null, 100
          );
          setAssignments(myAssignments);
        }
      } catch (e) {
        console.error("Error loading user data:", e);
      }
  };

  // Fetch pending assignments on load
  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  // Refresh when returning to menu (skip on initial mount to avoid double-fetch)
  useEffect(() => {
      if (hasMounted.current && mode === 'menu') {
          loadUserAndAssignments();
      }
      hasMounted.current = true;
  }, [mode]);

  // Seed Reading Data if empty
  useEffect(() => {
    const seedData = async () => {
      try {
      const existing = await base44.entities.ReadingSentence.list();
      if (existing.length === 0) {
         const sentences = [
            { text: "Who was George Washington?", difficulty: "easy" },
            { text: "What is the capital of the United States?", difficulty: "easy" },
            { text: "When is Flag Day?", difficulty: "medium" },
            { text: "Who elects Congress?", difficulty: "hard" },
            { text: "Lincoln was the President during the Civil War.", difficulty: "medium" },
            { text: "What do we pay to the government?", difficulty: "medium" },
            { text: "Who lives in the White House?", difficulty: "easy" },
            { text: "When is Columbus Day?", difficulty: "easy" },
            { text: "Where does Congress meet?", difficulty: "medium" },
            { text: "Who was the first President?", difficulty: "easy" },
            { text: "Why do people come to America?", difficulty: "medium" },
            { text: "What are the colors of the American flag?", difficulty: "easy" },
            { text: "When is Labor Day?", difficulty: "easy" },
            { text: "How many Senators do we have?", difficulty: "hard" },
            { text: "When is Presidents' Day?", difficulty: "easy" },
            { text: "What is the Bill of Rights?", difficulty: "hard" },
            { text: "Who is the Father of Our Country?", difficulty: "medium" },
            { text: "What is the largest city in America?", difficulty: "medium" },
            { text: "When is Independence Day?", difficulty: "easy" },
            { text: "What was the first capital of the United States?", difficulty: "hard" }
         ];
         await base44.entities.ReadingSentence.bulkCreate(sentences);
      }
      } catch (err) {
        console.error("Seeding skipped:", err);
      }
    };
    seedData();
  }, []);

  // Interview Practice Mode
  if (mode === 'interview') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setMode('menu')} className="text-slate-600 hover:text-slate-900">
          &larr; Back to Practice Menu
        </Button>
        <InterviewPractice 
          onComplete={(passed) => {
            if (passed) {
              toast.success('Great job! You\'re ready for the interview!');
            } else {
              toast.info('Keep practicing - you\'re getting better!');
            }
            setMode('menu');
          }}
          onNext={() => {}}
        />
      </div>
    );
  }

  const getSRSContent = async (items, type, options = {}) => {
    if (!currentUser) return items.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    try {
      const progress = await base44.entities.UserProgress.filter({
        user_email: currentUser.email, content_type: type
      });
      
      const progressMap = new Map(progress.map(p => [p.content_id, p]));
      
      // 1. Calculate Category Weakness
      const categoryStats = {};
      progress.forEach(p => {
          // Find corresponding item to get category
          const item = items.find(i => i.id === p.content_id);
          if (item && item.category) {
             if (!categoryStats[item.category]) categoryStats[item.category] = { total: 0, incorrect: 0 };
             categoryStats[item.category].total++;
             if (p.last_result === 'incorrect' || p.status === 'practicing') {
                 categoryStats[item.category].incorrect++;
             }
          }
      });

      const weakCategories = Object.keys(categoryStats).filter(cat => {
          const stats = categoryStats[cat];
          return stats.total > 0 && (stats.incorrect / stats.total) > 0.4; // >40% incorrect/practicing
      });

      // 2. Calculate Priority Score (Modified SM-2 + Adaptive Boost)
      const scoredItems = items.map(item => {
        const p = progressMap.get(item.id);
        let score = 100; // Base score for new/unseen items
        
        // Adaptive Learning: Boost score if in a weak category
        if (item.category && weakCategories.includes(item.category)) {
            score += 300; 
        }

        if (p) {
          const now = new Date().getTime();
          const lastPracticed = new Date(p.last_practiced).getTime();
          const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
          
          const interval = p.interval || 0;
          
          // SRS Logic: Priority is higher when we are past the due date (interval)
          // Score = (Days Since / Interval) * 100. 
          // If Interval is 0 (just started/failed), prioritize heavily.
          
          if (interval === 0) {
             score += 500; // Immediate retry priority
          } else {
             const dueRatio = daysSince / interval;
             score += dueRatio * 100;
          }

          // If mastered and interval is long, push it down unless it's due
          if (p.status === 'mastered' && interval > 20 && daysSince < interval) {
              score -= 500;
          }
        } else {
           // Slightly randomize unseen items so we don't always see them in same order
           score += Math.random() * 50; 
        }
        
        return { ...item, score };
      });
      
      // Sort descending by score
      const sorted = scoredItems.sort((a, b) => b.score - a.score);
      
      // Log adaptive behavior
      if (weakCategories.length > 0) {
          console.log("Adaptive Learning Active: Focusing on weak categories:", weakCategories);
          toast.info(`Adaptive Mode: Focusing on ${weakCategories.join(', ')}`);
      }

      return sorted.slice(0, 10);
    } catch (e) {
      console.error("SRS calculation failed", e);
      return items.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
  };

  const startSession = async (selectedMode, subMode = null) => {
    setIsLoading(true);
    setMode(selectedMode);
    if (subMode) setVocabSubMode(subMode);
    setCurrentIndex(0);
    setSessionComplete(false);
    
    try {
      let data = [];
      if (selectedMode === 'reading') {
         data = await base44.entities.ReadingSentence.list();
         // Reading doesn't use strict SRS yet, simple shuffle
         data = data.sort(() => 0.5 - Math.random()).slice(0, 10);
      } else if (selectedMode === 'dictation') {
        const allSentences = await base44.entities.Sentence.list();
        data = await getSRSContent(allSentences, 'sentence');
      } else if (selectedMode === 'vocabulary') {
        const allVocab = await base44.entities.VocabularyWord.list();
        const transformed = allVocab.map(v => ({ ...v, text: v.word, type: 'vocabulary' }));
        data = await getSRSContent(transformed, 'vocabulary');
      } else if (selectedMode === 'civics') {
        let allQuestions = await base44.entities.CivicsQuestion.list();
        allQuestions = allQuestions.filter(q => q.version === civicsVersion);
        
        // Adaptive Difficulty Handling
        if (civicsDifficulty !== 'all') {
          allQuestions = allQuestions.filter(q => q.difficulty === civicsDifficulty);
          // Simple shuffle if filtering manually
          data = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        } else {
           // Use SRS + Adaptive Logic for 'All' difficulty
           data = await getSRSContent(allQuestions, 'civics_question');
        }
      }
      
      setContent(data);
    } catch (error) {
      console.error("Error starting session", error);
      toast.error("Failed to start practice session");
      setMode('menu');
    } finally {
      setIsLoading(false);
    }
  };

  const startAssignment = async (assignment) => {
  setIsLoading(true);
  let mode = 'dictation';
  if (assignment.content_type === 'vocabulary') mode = 'vocabulary';
  if (assignment.content_type === 'civics_question') mode = 'civics';
  if (assignment.content_type === 'custom') {
    if (assignment.custom_type === 'vocabulary') mode = 'vocabulary';
    else if (assignment.custom_type === 'civics_question') mode = 'civics';
    else mode = 'dictation';
  }
  setMode(mode);
  setCurrentIndex(0);
  setSessionComplete(false);

  try {
    let item;
    
    if (assignment.content_type === 'custom') {
      // Handle custom assignments
      if (assignment.custom_type === 'vocabulary' && assignment.custom_data) {
        item = { 
          text: assignment.custom_data.word, 
          word: assignment.custom_data.word,
          definition: assignment.custom_data.definition,
          type: 'vocabulary', 
          id: 'custom_vocab_' + assignment.id 
        };
        setMode('vocabulary');
        setVocabSubMode('flashcards');
      } else if (assignment.custom_type === 'civics_question' && assignment.custom_data) {
        item = {
          question: assignment.custom_data.question,
          answer: assignment.custom_data.answer,
          type: 'civics_question',
          version: 'custom',
          id: 'custom_civics_' + assignment.id
        };
        setMode('civics');
      } else {
        const text = assignment.custom_content || (assignment.custom_data && assignment.custom_data.text);
        item = { text: text, type: 'sentence', id: 'custom_sentence_' + assignment.id };
      }
    } else {
      // Handle standard content - fetch ALL and filter (Base44 ID query workaround)
      if (assignment.content_type === 'sentence') {
        const all = await base44.entities.Sentence.list('-created_date', 1000);
        item = all.find(s => s.id === assignment.content_id);
      } else if (assignment.content_type === 'vocabulary') {
        const all = await base44.entities.VocabularyWord.list('-created_date', 1000);
        const vocab = all.find(v => v.id === assignment.content_id);
        item = vocab ? { ...vocab, text: vocab.word, type: 'vocabulary' } : null;
      } else if (assignment.content_type === 'civics_question') {
        const all = await base44.entities.CivicsQuestion.list('-created_date', 1000);
        item = all.find(q => q.id === assignment.content_id);
      }
    }

    if (item) {
      setContent([item]);
      item.assignment_id = assignment.id;
    } else {
      toast.error("Content not found");
      setMode('menu');
    }
  } catch (error) {
    console.error("Error loading assignment", error);
    toast.error("Failed to load assignment");
    setMode('menu');
  } finally {
    setIsLoading(false);
  }
};

  const handleComplete = async (isSuccess, score = null) => {
    const currentItem = content[currentIndex];
    
    if (currentUser) {
       try {
          // 1. Fetch existing progress to implement SRS math
          const existing = await base44.entities.UserProgress.filter(
              { user_email: currentUser.email, content_id: currentItem.id }, null, 1
          );
          
          const prevProgress = existing[0] || { 
              ease_factor: 2.5, 
              interval: 0, 
              consecutive_correct: 0 
          };

          // 2. Calculate new SRS values (Simplified SM-2)
          let newEaseFactor = prevProgress.ease_factor;
          let newInterval = prevProgress.interval;
          let newConsecutive = prevProgress.consecutive_correct;

          if (isSuccess) {
              newConsecutive += 1;
              // SM-2 Algorithm: Graduated intervals
              if (newConsecutive === 1) {
                  newInterval = 1; // Review tomorrow
              } else if (newConsecutive === 2) {
                  newInterval = 6; // Review in 6 days
              } else {
                  // Exponential growth based on ease factor
                  newInterval = Math.round(prevProgress.interval * prevProgress.ease_factor);
              }
              // Reward consecutive successes with easier future reviews
              if (newConsecutive >= 2) {
                  newEaseFactor = Math.min(2.5, newEaseFactor + 0.1);
              }
          } else {
              newConsecutive = 0;
              newInterval = 0; // Reset - immediate relearning
              // Penalize ease factor on errors (minimum 1.3)
              newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
          }

          const progressData = {
            user_email: currentUser.email,
            content_id: currentItem.id,
            content_type: mode === 'civics' ? 'civics_question' : (mode === 'vocabulary' ? 'vocabulary' : 'sentence'),
            status: (isSuccess && newConsecutive >= 3) ? 'mastered' : 'practicing',
            last_practiced: new Date().toISOString(),
            assignment_id: currentItem.assignment_id,
            ease_factor: newEaseFactor,
            interval: newInterval,
            consecutive_correct: newConsecutive,
            last_result: isSuccess ? 'correct' : 'incorrect',
            best_score: Math.max(prevProgress.best_score || 0, score || 0),
            last_score: score || 0,
            total_attempts: (prevProgress.total_attempts || 0) + 1
          };

          // Update or Create
          if (existing.length > 0) {
              await base44.entities.UserProgress.update(existing[0].id, progressData);
          } else {
              await base44.entities.UserProgress.create(progressData);
          }

          // Assignment completion logic
          if (currentItem.assignment_id) {
            await base44.entities.Assignment.update(currentItem.assignment_id, {
              status: 'completed',
              completed_date: new Date().toISOString()
            });
            
            // Notify Tutor
            // Find the assignment to get tutor email (we filtered it out of state, so we need it from somewhere or assume we have it)
            const completedAssignment = assignments.find(a => a.id === currentItem.assignment_id);
            if (completedAssignment) {
                 await base44.entities.Notification.create({
                     user_email: completedAssignment.tutor_email,
                     type: 'assignment',
                     title: 'Assignment Completed',
                     message: `${currentUser.email} has completed an assignment.`,
                     link: '/Tutor'
                 });
            }

            // Update local state immediately so it vanishes from list
            setAssignments(prev => prev.filter(a => a.id !== currentItem.assignment_id));
            
            toast.success("Assignment Completed!");
          }

          // Gamification
          if (isSuccess) {
             const newPoints = (currentUser.points || 0) + 10;
             await base44.auth.updateMe({ points: newPoints });
          }
       } catch (e) {
         console.error("Save progress failed", e);
       }
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < content.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionComplete(true);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Practice Dashboard</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose your study mode to prepare for your citizenship test.
          </p>
        </div>

        <PracticePathProgress userEmail={currentUser?.email} />

        {assignments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" /> Assignments from your Tutor
          </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map(a => (
                <Card key={a.id} className="cursor-pointer hover:shadow-md transition-all border-blue-100" onClick={() => startAssignment(a)}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="overflow-hidden mr-2">
                      <p className="font-semibold text-blue-800 text-sm capitalize truncate">
                        {a.content_type === 'custom' ? (a.custom_content || 'Custom Task') : a.content_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        Assigned {new Date(a.assigned_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" className="bg-blue-600 h-8 shrink-0">Start</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          
          {/* 1. Reading Mode */}
          <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 group cursor-pointer" onClick={() => startSession('reading')}>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <BookA className="w-6 h-6" />
              </div>
              <CardTitle>Reading</CardTitle>
              <CardDescription>
                Read official USCIS sentences aloud to practice pronunciation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Start Reading</Button>
            </CardContent>
          </Card>

          {/* 2. Writing Vocab */}
          <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 group">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <CardTitle>Writing Vocab</CardTitle>
              <CardDescription>
                Practice writing official vocabulary words.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => startSession('vocabulary', 'dictation')} className="w-full bg-emerald-600 hover:bg-emerald-700 justify-start">
                <Mic className="w-4 h-4 mr-2" /> Dictation
              </Button>
              <Button onClick={() => startSession('vocabulary', 'flashcards')} variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:text-emerald-700">
                <Sparkles className="w-4 h-4 mr-2" /> Flashcards
              </Button>
              <Button onClick={() => startSession('vocabulary', 'matching')} variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:text-emerald-700">
                <Layers className="w-4 h-4 mr-2" /> Matching
              </Button>
            </CardContent>
          </Card>

          {/* 3. Sentence Dictation */}
          <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 group cursor-pointer" onClick={() => startSession('dictation')}>
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <CardTitle>Sentence Dictation</CardTitle>
              <CardDescription>
                Listen to full sentences and write them down correctly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Start Dictation</Button>
            </CardContent>
          </Card>

          {/* 4. Civics Test */}
          <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 group">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex justify-between items-start">
                 <CardTitle>Civics Test</CardTitle>
                 <Badge variant="outline" className="text-xs">Quiz</Badge>
              </div>
              <CardDescription className="mb-4">
                Practice the 100 civics questions.
              </CardDescription>
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-slate-600">Version:</label>
                   <Select value={civicsVersion} onValueChange={setCivicsVersion}>
                      <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="2008">2008</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-slate-600">Difficulty:</label>
                   <Select value={civicsDifficulty} onValueChange={setCivicsDifficulty}>
                      <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Med</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                   </Select>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => startSession('civics')} className="w-full bg-orange-600 hover:bg-orange-700">Start Quiz</Button>
            </CardContent>
          </Card>
        </div>

        {/* Interview Practice Section */}
        <div className="mt-8">
          <Card className="bg-gradient-to-br from-slate-50 to-indigo-50 border-indigo-200 hover:shadow-xl transition-all cursor-pointer" onClick={() => setMode('interview')}>
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">Mock Interview Practice</h3>
                    <Badge className="bg-indigo-600">NEW</Badge>
                  </div>
                  <p className="text-slate-600 mb-4">
                    Simulate your real citizenship interview with realistic questions from all sections: small talk, personal information, morals & ethics, and oath requirements.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="px-3 py-1 bg-white rounded-full border border-indigo-200">✓ AI-powered feedback</span>
                    <span className="px-3 py-1 bg-white rounded-full border border-indigo-200">✓ Speech practice</span>
                    <span className="px-3 py-1 bg-white rounded-full border border-indigo-200">✓ Real interview format</span>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-indigo-600 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Representative Finder — moved to bottom */}
        <RepresentativeFinder
          userEmail={currentUser?.email}
          onDataLoaded={setRepresentativeData}
        />
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Session Complete!</h2>
        <p className="text-slate-600">You've finished your practice session.</p>
        <Button onClick={() => setMode('menu')} className="min-w-[200px]">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setMode('menu')} className="text-slate-500">
          &larr; Exit Practice
        </Button>
        <Badge variant="outline" className="capitalize">{mode.replace('_', ' ')}</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : content.length > 0 ? (
         mode === 'reading' ? (
            <ReadingPracticeCard 
                sentence={content[currentIndex]}
                onComplete={handleComplete}
                onNext={handleNext}
            />
         ) : mode === 'civics' ? (
            <CivicsTestCard 
                question={content[currentIndex]}
                onComplete={handleComplete}
                onNext={handleNext}
                representativeData={representativeData}
            />
         ) : mode === 'vocabulary' ? (
            vocabSubMode === 'flashcards' ? (
              <FlashcardGame 
                words={content} 
                onComplete={(isSuccess) => {
                  handleComplete(isSuccess);
                  handleNext();
                }}
              />
            ) : vocabSubMode === 'matching' ? (
              <MatchingGame 
                words={content}
                onComplete={() => setSessionComplete(true)}
              />
            ) : (
              // Default to Dictation for vocabulary
              <DictationCard 
                  sentence={content[currentIndex]}
                  onComplete={handleComplete}
                  onNext={handleNext}
              />
            )
         ) : (
            // Dictation (Sentences)
            <DictationCard 
                sentence={content[currentIndex]}
                onComplete={handleComplete}
                onNext={handleNext}
            />
         )
      ) : (
         <div className="text-center py-20">
            <p className="text-slate-500">No content found for this mode.</p>
            <Button onClick={() => setMode('menu')} className="mt-4">Go Back</Button>
         </div>
         )}
         <StudyBuddy />
         </div>
         );
         }