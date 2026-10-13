import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function LessonStatusCard({ lesson, progress }) {
  const isCompleted = progress?.completed && progress?.quiz_attempts > 0;
  const isInProgress = !isCompleted && progress != null;
  const bestScore = progress?.best_score || 0;

  const status = isCompleted ? 'completed' : isInProgress ? 'inProgress' : 'notStarted';

  const config = {
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Completed',
    },
    inProgress: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: 'In Progress',
    },
    notStarted: {
      icon: Circle,
      color: 'text-slate-400',
      bg: 'bg-white',
      border: 'border-slate-200',
      label: 'Not Started',
    },
  }[status];

  const StatusIcon = config.icon;

  return (
    <Link to={createPageUrl('Lessons')} className="block">
      <Card
        className={`${config.border} ${config.bg} hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full`}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
              {lesson.title}
            </h4>
            <StatusIcon className={`w-5 h-5 ${config.color} shrink-0`} />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
            {isCompleted && bestScore > 0 && (
              <span className="text-xs text-slate-500">{Math.round(bestScore)}%</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}