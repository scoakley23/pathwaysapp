import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProgressChart({ userEmail }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userEmail) loadChartData();
  }, [userEmail]);

  const loadChartData = async () => {
    try {
      const [lessonProgress, lessonNotes] = await Promise.all([
        base44.entities.LessonProgress.filter({ user_email: userEmail }, 'last_attempt_date', 200),
        base44.entities.LessonNotes.filter({ user_email: userEmail.toLowerCase().trim() }, null, 200)
      ]);

      // Build a map of dates to aggregate data
      const dateMap = {};

      // Add quiz scores by date
      lessonProgress.forEach((lp) => {
        if (!lp.last_attempt_date) return;
        const date = new Date(lp.last_attempt_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        if (!dateMap[date]) {
          dateMap[date] = { date, quizScore: 0, quizCount: 0, lessonsCompleted: 0 };
        }
        if (lp.last_score !== undefined && lp.last_score !== null) {
          dateMap[date].quizScore += lp.last_score;
          dateMap[date].quizCount += 1;
        }
        if (lp.completed) {
          dateMap[date].lessonsCompleted += 1;
        }
      });

      // Add lessons completed via notes (each note saved = a lesson interaction)
      lessonNotes.forEach((note) => {
        const date = new Date(note.created_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        if (!dateMap[date]) {
          dateMap[date] = { date, quizScore: 0, quizCount: 0, lessonsCompleted: 0 };
        }
        dateMap[date].lessonsCompleted += 1;
      });

      // Convert to array, calculate averages, and sort by date
      const data = Object.values(dateMap)
        .map((d) => ({
          date: d.date,
          quizScore: d.quizCount > 0 ? Math.round(d.quizScore / d.quizCount) : 0,
          lessonsCompleted: d.lessonsCompleted
        }))
        .sort((a, b) => {
          // Sort by parsed date
          const parse = (s) => new Date(s + ', ' + new Date().getFullYear());
          return parse(a.date) - parse(b.date);
        });

      // Limit to last 30 data points for readability
      setChartData(data.slice(-30));
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Improvement Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            Complete lessons and take quizzes to see your progress over time.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Improvement Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={[0, 100]}
                label={{ value: 'Quiz Score %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#3b82f6' } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                allowDecimals={false}
                label={{ value: 'Lessons', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#10b981' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="quizScore"
                name="Avg Quiz Score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="lessonsCompleted"
                name="Lessons Completed"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}