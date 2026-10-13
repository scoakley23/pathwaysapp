import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, CheckCircle, ArrowRight, Award, Star } from 'lucide-react';
import LessonDetail from '@/components/lessons/LessonDetail.jsx';
import RecommendationsPanel from '@/components/lessons/RecommendationsPanel';
import { toast } from "sonner";

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        // Not logged in — lessons still load
      }
      
      const [allLessons, userProgress] = await Promise.all([
        base44.entities.Lesson.list('order', 100),
        currentUser?.email 
          ? base44.entities.LessonProgress.filter({ user_email: currentUser.email }, null, 1000)
          : Promise.resolve([])
      ]);
      
      setLessons(allLessons);
      setProgress(userProgress);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProgress = async () => {
    if (!user?.email) return;
    const userProgress = await base44.entities.LessonProgress.filter(
      { user_email: user.email }, null, 1000
    );
    setProgress(userProgress);
  };

  const topics = [
    { 
      name: 'Principles of American Democracy', 
      icon: '📜',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      name: 'System of Government', 
      icon: '⚖️',
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      name: 'Rights and Responsibilities', 
      icon: '✊',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      name: 'U.S. History', 
      icon: '🏛️',
      color: 'from-red-500 to-red-600'
    },
    { 
      name: 'Geography and Symbols', 
      icon: '🗺️',
      color: 'from-green-500 to-green-600'
    }
  ];

  const getLessonProgress = (lessonId) => {
    return progress.find(p => p.lesson_id === lessonId);
  };

  if (selectedLesson) {
    return (
      <LessonDetail 
        lesson={selectedLesson} 
        lessons={lessons}
        onNavigateLesson={setSelectedLesson}
        onBack={() => {
          setSelectedLesson(null);
          refreshProgress();
        }}
        onComplete={() => {
          toast.success('Lesson marked complete! Great job!');
          refreshProgress();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
          <BookOpen className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900">Civics Lessons</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Learn the key concepts you need to know for your U.S. citizenship test with video lessons, detailed content, and practice quizzes.
        </p>
      </div>

      {/* Recommendations */}
      {user && (
        <RecommendationsPanel 
          userEmail={user.email} 
          onSelectLesson={setSelectedLesson}
        />
      )}

      {/* Topics */}
      {topics.map((topic) => {
        const topicLessons = lessons.filter(l => l.topic === topic.name);
        
        if (topicLessons.length === 0) return null;

        return (
          <div key={topic.name} className="space-y-4">
            {/* Topic Header */}
            <div className={`bg-gradient-to-r ${topic.color} text-white p-6 rounded-xl shadow-md`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{topic.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{topic.name}</h2>
                  <p className="text-white/90 text-sm">{topicLessons.length} lessons available</p>
                </div>
              </div>
            </div>

            {/* Lesson Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topicLessons.map((lesson) => {
                const lessonProgress = getLessonProgress(lesson.id);
                const hasProgress = !!lessonProgress;
                const isCompleted = lessonProgress?.completed && lessonProgress?.quiz_attempts > 0;
                const needsReview = lessonProgress?.needs_review;

                return (
                  <Card 
                    key={lesson.id}
                    className={`hover:shadow-lg transition-all cursor-pointer border-2 relative ${
                      isCompleted 
                        ? 'border-green-300 hover:border-green-400 bg-green-50/30' 
                        : hasProgress
                          ? 'border-amber-200 hover:border-amber-300 bg-amber-50/20'
                          : 'hover:border-blue-400'
                    }`}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-2">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="w-3 h-3" /> Completed
                          </span>
                        ) : hasProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            Start
                          </span>
                        )}
                      </div>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span className="text-lg">{lesson.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {lesson.video_url && (
                            <Video className="w-5 h-5 text-red-500" />
                          )}
                          {needsReview && (
                            <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>{lesson.description}</CardDescription>
                      {hasProgress && lessonProgress.best_score > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{isCompleted ? 'Completed' : 'In Progress'}</span>
                            <span>{Math.round(lessonProgress.best_score)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                isCompleted ? 'bg-green-500' : needsReview ? 'bg-orange-400' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.round(lessonProgress.best_score)}%` }}
                            />
                          </div>
                          {needsReview && (
                            <span className="text-xs text-orange-600 font-medium">Review Recommended</span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button className={`w-full ${
                        isCompleted 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : hasProgress
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                      }`}>
                        {isCompleted ? 'Review' : hasProgress ? 'Continue' : 'Start Lesson'} <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {lessons.length === 0 && (
        <Card className="text-center p-12">
          <div className="space-y-4">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Lessons Available</h3>
              <p className="text-slate-600">Lessons are loading. Please check back shortly.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}