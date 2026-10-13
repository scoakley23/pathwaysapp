import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, Clock, Circle, BookOpen } from 'lucide-react';
import LessonStatusCard from '@/components/dashboard/LessonStatusCard';

const TOPIC_ORDER = [
  'Principles of American Democracy',
  'System of Government',
  'Rights and Responsibilities',
  'U.S. History',
  'Geography and Symbols',
];

export default function Dashboard({ cachedUser }) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = cachedUser || (await base44.auth.me().catch(() => null));
        if (!currentUser) {
          setLoading(false);
          return;
        }
        const [allLessons, progressList] = await Promise.all([
          base44.entities.Lesson.list(),
          base44.entities.LessonProgress.filter({ user_email: currentUser.email }),
        ]);
        setLessons(allLessons.sort((a, b) => (a.order || 0) - (b.order || 0)));
        setLessonProgress(progressList);
      } catch (err) {
        console.error('Lesson progress load error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [cachedUser]);

  const totalLessons = lessons.length;
  const completedLessons = lessonProgress.filter(
    (p) => p.completed && p.quiz_attempts > 0
  ).length;
  const inProgressLessons = lessonProgress.filter(
    (p) => !(p.completed && p.quiz_attempts > 0)
  ).length;
  const notStartedLessons = totalLessons - completedLessons - inProgressLessons;

  const progressMap = {};
  lessonProgress.forEach((p) => {
    progressMap[p.lesson_id] = p;
  });

  const lessonsByTopic = TOPIC_ORDER.map((topic) => ({
    topic,
    lessons: lessons.filter((l) => l.topic === topic),
  })).filter((g) => g.lessons.length > 0);

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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lesson Progress</h1>
          <p className="text-slate-600 mt-1">
            Your completion status across all citizenship topics
          </p>
        </div>
        <Link to={createPageUrl('Progress')}>
          <Button variant="ghost" className="text-slate-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Progress
          </Button>
        </Link>
      </div>

      {/* Status summary cards */}
      <div className="flex flex-wrap items-center gap-4">
        <Card className="border-green-200 bg-green-50 flex-1 min-w-[140px]">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{completedLessons}</p>
              <p className="text-xs text-slate-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 flex-1 min-w-[140px]">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{inProgressLessons}</p>
              <p className="text-xs text-slate-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50 flex-1 min-w-[140px]">
          <CardContent className="p-4 flex items-center gap-3">
            <Circle className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{notStartedLessons}</p>
              <p className="text-xs text-slate-600">Not Started</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lesson grid by topic */}
      {lessonsByTopic.length > 0 ? (
        <div className="space-y-6">
          {lessonsByTopic.map(({ topic, lessons: topicLessons }) => (
            <div key={topic}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{topic}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topicLessons.map((lesson) => (
                  <LessonStatusCard
                    key={lesson.id}
                    lesson={lesson}
                    progress={progressMap[lesson.id]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No lessons available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}