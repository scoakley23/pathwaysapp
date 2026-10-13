import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Award, Zap, Flag, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BadgesDisplay from '@/components/gamification/BadgesDisplay';
import PracticeCalendar from '@/components/progress/PracticeCalendar';
import ProgressChart from '@/components/progress/ProgressChart';
import TestDateTracker from '@/components/progress/TestDateTracker';
import { Progress as ProgressBar } from "@/components/ui/progress";

export default function Progress() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, mastered: 0 });
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserData(user);

      // Fetch Progress
      const progressData = await base44.entities.UserProgress.list();
      const userProgress = progressData.filter(p => p.user_email === user.email);
      
      // Fetch Content for mapping names
      const [sentences, vocab, questions] = await Promise.all([
        base44.entities.Sentence.list(),
        base44.entities.VocabularyWord.list(),
        base44.entities.CivicsQuestion.list()
      ]);

      const contentMap = {
        sentence: sentences.reduce((acc, s) => ({...acc, [s.id]: s}), {}),
        vocabulary: vocab.reduce((acc, s) => ({...acc, [s.id]: s}), {}),
        civics_question: questions.reduce((acc, s) => ({...acc, [s.id]: s}), {})
      };

      const enrichedHistory = userProgress.map(p => ({
        ...p,
        content: contentMap[p.content_type || 'sentence']?.[p.content_id] || { text: 'Unknown Content' }
      })).sort((a, b) => new Date(b.last_practiced) - new Date(a.last_practiced));

      setHistory(enrichedHistory);
      setStats({
        total: enrichedHistory.length,
        mastered: enrichedHistory.filter(p => p.status === 'mastered').length
      });
      
    } catch (error) {
      console.error("Error fetching progress", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading progress...</div>;

  // Calculate Preparedness Score (Simple metric: Mastered / 100 * 100, cap at 100)
  const preparedness = Math.min(Math.round((stats.mastered / 100) * 100), 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
             <h1 className="text-3xl font-bold text-slate-900">Your Progress</h1>
             <p className="text-slate-600">Track your journey to citizenship</p>
          </div>
          <TestDateTracker />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link to={createPageUrl('StudyHistory')} className="block">
          <Card className="bg-blue-50 border-blue-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">Total Practiced</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Dashboard')} className="block">
          <Card className="bg-green-50 border-green-100 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-200 text-green-700 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">Items Mastered</p>
                <p className="text-3xl font-bold text-slate-900">{stats.mastered}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

         <Card className="bg-emerald-50 border-emerald-100 md:col-span-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center">
                        <Flag className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-slate-900">Test Preparedness</p>
                 </div>
                 <span className="text-2xl font-bold text-emerald-700">{preparedness}%</span>
            </div>
            <ProgressBar value={preparedness} className="h-3 bg-emerald-200" />
            <p className="text-xs text-slate-500 mt-2">Based on mastered content items (Goal: 100)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
             {/* Calendar */}
            <PracticeCalendar history={history} />

             {/* Progress Chart */}
             <ProgressChart userEmail={userData?.email} />

             {/* Badges Section */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Achievements
                </CardTitle>
                </CardHeader>
                <CardContent>
                <BadgesDisplay earnedBadges={userData?.badges || []} />
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
             {/* Recent List Sidebar */}
            <Card className="h-full max-h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pr-2">
                    {history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((item) => (
                                <div key={item.id} className="border-b pb-3 last:border-0">
                                    <p className="text-xs text-slate-400 mb-1">
                                        {format(new Date(item.last_practiced), 'MMM d, h:mm a')}
                                    </p>
                                    <p className="font-medium text-slate-800 text-sm line-clamp-2">
                                        {item.content?.text || item.content?.word || item.content?.question || 'Unknown'}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {item.content_type || 'Sentence'}
                                        </Badge>
                                        {item.status === 'mastered' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            No history yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}