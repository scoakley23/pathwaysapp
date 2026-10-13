import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BookA, PenLine, GraduationCap } from 'lucide-react';

const STEPS = [
  {
    key: 'sentence',
    label: 'Reading',
    desc: 'Read aloud',
    Icon: BookA,
    activeBg: 'bg-purple-100',
    activeText: 'text-purple-600',
    activeRing: 'ring-purple-200',
    bar: 'bg-purple-400',
  },
  {
    key: 'vocabulary',
    label: 'Writing',
    desc: 'Vocab & dictation',
    Icon: PenLine,
    activeBg: 'bg-emerald-100',
    activeText: 'text-emerald-600',
    activeRing: 'ring-emerald-200',
    bar: 'bg-emerald-400',
  },
  {
    key: 'civics_question',
    label: 'Civics',
    desc: 'Test questions',
    Icon: GraduationCap,
    activeBg: 'bg-orange-100',
    activeText: 'text-orange-600',
    activeRing: 'ring-orange-200',
    bar: 'bg-orange-400',
  },
];

export default function PracticePathProgress({ userEmail }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    const fetchProgress = async () => {
      try {
        const records = await base44.entities.UserProgress.filter({
          user_email: userEmail,
        });
        const counts = {};
        records.forEach((p) => {
          if (!counts[p.content_type])
            counts[p.content_type] = { mastered: 0, practiced: 0 };
          counts[p.content_type].practiced++;
          if (p.status === 'mastered') counts[p.content_type].mastered++;
        });
        setStats(counts);
      } catch (e) {
        console.error('Failed to load path progress', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [userEmail]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-5">
        Your Learning Path
      </h2>
      <div className="flex items-start justify-between">
        {STEPS.map((step, idx) => {
          const data = stats[step.key] || { mastered: 0, practiced: 0 };
          const isActive = data.practiced > 0;
          const { Icon } = step;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ring-2 transition-all ${
                    isActive
                      ? `${step.activeBg} ${step.activeText} ${step.activeRing}`
                      : 'bg-slate-50 text-slate-300 ring-transparent'
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <p className="font-semibold text-sm text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-400 mb-1">{step.desc}</p>
                <p className="text-xs font-medium text-slate-500">
                  {loading ? '—' : `${data.mastered} mastered`}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-100 mx-1 mt-8 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isActive ? step.bar : ''}`}
                    style={{ width: isActive ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}