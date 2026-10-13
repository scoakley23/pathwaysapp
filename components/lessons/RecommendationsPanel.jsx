import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, Award } from 'lucide-react';

export default function RecommendationsPanel({ userEmail, onSelectLesson }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userEmail) {
      loadRecommendations();
    }
  }, [userEmail]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get all progress
      const progress = await base44.entities.LessonProgress.filter({ user_email: userEmail }, null, 1000);

      // Get all lessons
      const allLessons = await base44.entities.Lesson.list('order', 1000);

      // Analyze and recommend
      const recs = analyzeAndRecommend(progress, allLessons);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAndRecommend = (progress, allLessons) => {
    const recommendations = [];
    
    // Calculate topic performance
    const topicStats = {};
    progress.forEach(p => {
      if (!topicStats[p.topic]) {
        topicStats[p.topic] = { scores: [], attempts: 0, count: 0 };
      }
      if (p.best_score > 0) {
        topicStats[p.topic].scores.push(p.best_score);
      }
      topicStats[p.topic].attempts += p.quiz_attempts;
      topicStats[p.topic].count += 1;
    });

    // Find weak topics
    const weakTopics = Object.entries(topicStats)
      .filter(([_, stats]) => {
        const avgScore = stats.scores.length > 0 
          ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length 
          : 0;
        return avgScore < 70 && avgScore > 0;
      })
      .map(([topic, stats]) => ({
        topic,
        avgScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
      }));

    // Recommend lessons for weak topics
    weakTopics.forEach(({ topic, avgScore }) => {
      const lessonsInTopic = allLessons.filter(l => l.topic === topic);
      const uncompletedOrPoor = lessonsInTopic.filter(lesson => {
        const lessonProgress = progress.find(p => p.lesson_id === lesson.id);
        return !lessonProgress || lessonProgress.best_score < 80;
      });

      if (uncompletedOrPoor.length > 0) {
        recommendations.push({
          type: 'needs_review',
          reason: `Your average score in ${topic} is ${Math.round(avgScore)}%. Review these lessons:`,
          lessons: uncompletedOrPoor.slice(0, 2),
          priority: 'high'
        });
      }
    });

    // Find lessons that need review (attempted but low score)
    const needsReview = progress
      .filter(p => p.best_score > 0 && p.best_score < 70)
      .slice(0, 2);

    if (needsReview.length > 0) {
      const lessonsToReview = allLessons.filter(l => 
        needsReview.some(p => p.lesson_id === l.id)
      );
      
      if (lessonsToReview.length > 0 && recommendations.length === 0) {
        recommendations.push({
          type: 'retry',
          reason: 'These lessons could use another try:',
          lessons: lessonsToReview,
          priority: 'medium'
        });
      }
    }

    // Recommend next lessons if doing well
    const completedLessonIds = new Set(
      progress.filter(p => p.best_score >= 70).map(p => p.lesson_id)
    );
    
    const nextLessons = allLessons
      .filter(l => !completedLessonIds.has(l.id))
      .slice(0, 3);

    if (nextLessons.length > 0 && recommendations.length === 0) {
      recommendations.push({
        type: 'continue',
        reason: progress.length > 0 ? 'Continue your learning journey:' : 'Start your learning journey:',
        lessons: nextLessons,
        priority: 'normal'
      });
    }

    return recommendations.slice(0, 2); // Max 2 recommendation groups
  };

  if (!userEmail || loading) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec, idx) => (
        <Card key={idx} className={`border-2 ${
          rec.priority === 'high' ? 'border-orange-300 bg-orange-50' :
          rec.priority === 'medium' ? 'border-blue-300 bg-blue-50' :
          'border-green-300 bg-green-50'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {rec.type === 'needs_review' && <AlertCircle className="w-5 h-5 text-orange-600" />}
              {rec.type === 'retry' && <TrendingUp className="w-5 h-5 text-blue-600" />}
              {rec.type === 'continue' && <Lightbulb className="w-5 h-5 text-green-600" />}
              <span className="text-slate-900">
                {rec.type === 'needs_review' && 'Needs Attention'}
                {rec.type === 'retry' && 'Practice Again'}
                {rec.type === 'continue' && 'Recommended for You'}
              </span>
            </CardTitle>
            <p className="text-sm text-slate-600">{rec.reason}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {rec.lessons.map(lesson => (
              <div 
                key={lesson.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-slate-300 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900">{lesson.title}</p>
                  <p className="text-xs text-slate-500">{lesson.topic}</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => onSelectLesson(lesson)}
                  variant="outline"
                >
                  Start
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}