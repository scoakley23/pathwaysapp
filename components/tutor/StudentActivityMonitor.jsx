import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, AlertTriangle, BookOpen, TrendingUp, TrendingDown, Loader2, Users, Star, Target } from 'lucide-react';
import { toast } from "sonner";
import StudyPathDialog from './StudyPathDialog';

const TOPIC_COLORS = {
  'Principles of American Democracy': 'bg-blue-100 text-blue-700 border-blue-200',
  'System of Government': 'bg-purple-100 text-purple-700 border-purple-200',
  'Rights and Responsibilities': 'bg-green-100 text-green-700 border-green-200',
  'U.S. History': 'bg-amber-100 text-amber-700 border-amber-200',
  'Geography and Symbols': 'bg-teal-100 text-teal-700 border-teal-200',
};

export default function StudentActivityMonitor({ currentUserEmail, students }) {
  const [lessonProgress, setLessonProgress] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStudyPathOpen, setIsStudyPathOpen] = useState(false);

  const activeStudents = students.filter(s => s.status === 'active');

  useEffect(() => {
    if (activeStudents.length > 0) loadData();
    else setIsLoading(false);
  }, [students]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const emails = activeStudents.map(s => s.student_email);
      // Fetch lesson progress for all students
      const allProgress = await Promise.all(
        emails.map(email =>
          base44.entities.LessonProgress.filter({ user_email: email }, null, 200)
        )
      );
      const flatProgress = allProgress.flat();
      setLessonProgress(flatProgress);

      // Fetch UserProgress (civics/sentence/vocab practice)
      const allUserProgress = await Promise.all(
        emails.map(email =>
          base44.entities.UserProgress.filter({ user_email: email }, null, 200)
        )
      );
      setUserProgress(allUserProgress.flat());
    } catch (e) {
      toast.error('Failed to load student activity');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Leaderboard ---
  const leaderboard = useMemo(() => {
    return activeStudents.map(s => {
      const sProgress = lessonProgress.filter(p => p.user_email === s.student_email);
      const quizzed = sProgress.filter(p => p.quiz_attempts > 0);
      const avgScore = quizzed.length > 0
        ? Math.round(quizzed.reduce((acc, p) => acc + (p.best_score || 0), 0) / quizzed.length)
        : null;
      const completed = sProgress.filter(p => p.completed).length;
      const masteredPractice = userProgress.filter(p => p.user_email === s.student_email && p.status === 'mastered').length;
      return {
        email: s.student_email,
        name: s.student_email.split('@')[0],
        avgScore,
        lessonsCompleted: completed,
        quizzesTaken: quizzed.length,
        masteredItems: masteredPractice,
        totalPoints: (completed * 10) + (quizzed.length * 5) + (masteredPractice * 3) + (avgScore || 0),
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [activeStudents, lessonProgress, userProgress]);

  // --- Struggling Students ---
  const strugglingStudents = useMemo(() => {
    return activeStudents.map(s => {
      const sProgress = lessonProgress.filter(p => p.user_email === s.student_email);
      
      // Find weak topics (avg score < 60)
      const topicScores = {};
      sProgress.filter(p => p.quiz_attempts > 0).forEach(p => {
        if (!topicScores[p.topic]) topicScores[p.topic] = [];
        topicScores[p.topic].push(p.best_score || 0);
      });

      const weakTopics = Object.entries(topicScores)
        .map(([topic, scores]) => ({
          topic,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        }))
        .filter(t => t.avg < 60)
        .sort((a, b) => a.avg - b.avg);

      // Flag students with zero activity or weak scores
      const noActivity = sProgress.length === 0;
      const needsReviewCount = sProgress.filter(p => p.needs_review).length;

      return {
        email: s.student_email,
        name: s.student_email.split('@')[0],
        weakTopics,
        noActivity,
        needsReviewCount,
        isStruggling: noActivity || weakTopics.length > 0 || needsReviewCount >= 2,
      };
    }).filter(s => s.isStruggling);
  }, [activeStudents, lessonProgress]);

  const handleAssignStudyPath = (studentEmail) => {
    const student = activeStudents.find(s => s.student_email === studentEmail);
    const struggling = strugglingStudents.find(s => s.email === studentEmail);
    setSelectedStudent({ ...student, weakTopics: struggling?.weakTopics || [] });
    setIsStudyPathOpen(true);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  if (activeStudents.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium">No active students yet.</p>
      <p className="text-sm mt-1">Add students and they'll appear here once they're active.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-900">{activeStudents.length}</p>
              <p className="text-xs text-indigo-600 font-medium">Active Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900">{strugglingStudents.length}</p>
              <p className="text-xs text-amber-600 font-medium">Need Attention</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">
                {leaderboard[0]?.avgScore != null ? `${leaderboard[0].avgScore}%` : '—'}
              </p>
              <p className="text-xs text-green-600 font-medium">Top Quiz Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="leaderboard"><Trophy className="w-4 h-4 mr-1.5" />Leaderboard</TabsTrigger>
          <TabsTrigger value="struggling">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Struggling
            {strugglingStudents.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full leading-none">{strugglingStudents.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="studypaths"><BookOpen className="w-4 h-4 mr-1.5" />Study Paths</TabsTrigger>
        </TabsList>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="mt-4 space-y-3">
          {leaderboard.map((student, idx) => (
            <LeaderboardRow key={student.email} student={student} rank={idx + 1} />
          ))}
        </TabsContent>

        {/* STRUGGLING TAB */}
        <TabsContent value="struggling" className="mt-4 space-y-4">
          {strugglingStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">All students are performing well!</p>
            </div>
          ) : (
            strugglingStudents.map(student => (
              <StrugglingCard
                key={student.email}
                student={student}
                onAssign={() => handleAssignStudyPath(student.email)}
              />
            ))
          )}
        </TabsContent>

        {/* STUDY PATHS TAB */}
        <TabsContent value="studypaths" className="mt-4 space-y-3">
          <p className="text-sm text-slate-500 mb-4">Select a student to assign a customized study path focused on specific topics.</p>
          {leaderboard.map(student => {
            const struggling = strugglingStudents.find(s => s.email === student.email);
            return (
              <Card key={student.email} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {student.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {struggling && (
                      <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
                        {struggling.weakTopics.slice(0, 2).map(t => (
                          <span key={t.topic} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TOPIC_COLORS[t.topic] || 'bg-slate-100 text-slate-600'}`}>
                            {t.topic.split(' ').slice(0, 2).join(' ')} · {t.avg}%
                          </span>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAssignStudyPath(student.email)}
                      className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                    >
                      <Target className="w-4 h-4 mr-1.5" /> Assign Path
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {selectedStudent && (
        <StudyPathDialog
          isOpen={isStudyPathOpen}
          onClose={() => setIsStudyPathOpen(false)}
          student={selectedStudent}
          tutorEmail={currentUserEmail}
        />
      )}
    </div>
  );
}

function LeaderboardRow({ student, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = medals[rank - 1];

  const scoreColor = (s) => {
    if (s == null) return 'text-slate-400';
    return s >= 80 ? 'text-green-600' : s >= 60 ? 'text-amber-600' : 'text-red-500';
  };

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${rank <= 3 ? 'border-2' : ''} ${rank === 1 ? 'border-amber-300' : rank === 2 ? 'border-slate-300' : rank === 3 ? 'border-orange-200' : ''}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 text-center text-2xl shrink-0">
          {medal || <span className="text-lg font-bold text-slate-400">#{rank}</span>}
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {student.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{student.name}</p>
          <p className="text-xs text-slate-500 truncate">{student.email}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center shrink-0">
          <div>
            <p className={`font-bold text-lg ${scoreColor(student.avgScore)}`}>
              {student.avgScore != null ? `${student.avgScore}%` : '—'}
            </p>
            <p className="text-xs text-slate-400">Avg Score</p>
          </div>
          <div>
            <p className="font-bold text-lg text-slate-700">{student.lessonsCompleted}</p>
            <p className="text-xs text-slate-400">Lessons</p>
          </div>
          <div>
            <p className="font-bold text-lg text-indigo-600">{student.totalPoints}</p>
            <p className="text-xs text-slate-400">Points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StrugglingCard({ student, onAssign }) {
  return (
    <Card className="border-2 border-amber-200 bg-amber-50/50 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
              {student.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{student.name}</p>
              <p className="text-xs text-slate-500">{student.email}</p>
            </div>
          </div>
          <Button size="sm" onClick={onAssign} className="bg-amber-500 hover:bg-amber-600 shrink-0">
            <BookOpen className="w-4 h-4 mr-1.5" /> Assign Study Path
          </Button>
        </div>

        <div className="space-y-2">
          {student.noActivity && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-amber-200 px-3 py-2 rounded-lg">
              <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
              <span>No lesson activity recorded yet</span>
            </div>
          )}
          {student.needsReviewCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-amber-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{student.needsReviewCount} lesson{student.needsReviewCount > 1 ? 's' : ''} flagged for review</span>
            </div>
          )}
          {student.weakTopics.length > 0 && (
            <div className="bg-white border border-amber-200 px-3 py-2 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Weak Topics</p>
              <div className="flex flex-wrap gap-2">
                {student.weakTopics.map(t => (
                  <div key={t.topic} className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${TOPIC_COLORS[t.topic] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {t.topic}
                    </span>
                    <span className="text-xs font-bold text-red-500">{t.avg}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}