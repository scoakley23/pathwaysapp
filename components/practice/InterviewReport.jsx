import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Target, BookOpen, MessageSquare } from 'lucide-react';

export default function InterviewReport({ results, questions, onRestart }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const passed = results.filter(r => r.is_acceptable).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);

  const avgContent = Math.round(results.reduce((s, r) => s + (r.content_score || 0), 0) / total);
  const avgGrammar = Math.round(results.reduce((s, r) => s + (r.grammar_score || 0), 0) / total);
  const avgFluency = Math.round(results.reduce((s, r) => s + (r.fluency_score || 0), 0) / total);
  const avgOverall = Math.round(results.reduce((s, r) => s + (r.overall_score || 0), 0) / total);

  const isReady = passRate >= 70;

  const scoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-500';
  const barColor = (s) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-400' : 'bg-red-400';

  const sectionNames = {
    small_talk: 'Small Talk',
    personal_info: 'Personal Info',
    morals_ethics: 'Morals & Ethics',
    oath_requirements: 'Oath Requirements'
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <Card className={`border-0 shadow-xl overflow-hidden ${isReady ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
        <div className={`h-2 ${isReady ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`} />
        <CardContent className="p-8 text-center space-y-6">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg ${isReady ? 'bg-green-100' : 'bg-orange-100'}`}>
            {isReady ? <Trophy className="w-10 h-10 text-green-600" /> : <Target className="w-10 h-10 text-orange-500" />}
          </div>

          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-2">
              {isReady ? 'Interview Complete!' : 'Keep Practicing!'}
            </h2>
            <p className="text-lg text-slate-500">
              {isReady
                ? 'You\'re performing well. Keep reviewing to stay sharp!'
                : 'Review the feedback below and practice your weaker areas.'}
            </p>
          </div>

          {/* Overall Score */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke={isReady ? '#22c55e' : '#f97316'}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - avgOverall / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor(avgOverall)}`}>{avgOverall}</span>
                <span className="text-xs text-slate-400">Overall</span>
              </div>
            </div>
          </div>

          {/* Pass Rate */}
          <div className="bg-white/70 backdrop-blur rounded-xl p-4 max-w-xs mx-auto">
            <p className="text-sm font-semibold text-slate-600 mb-1">{passed} of {total} questions passed</p>
            <Progress value={passRate} className="h-3" />
            <p className={`text-sm font-bold mt-1 ${isReady ? 'text-green-600' : 'text-orange-500'}`}>{passRate}% pass rate</p>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" /> Score Breakdown
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Content Accuracy', score: avgContent, icon: '✅' },
              { label: 'Grammar', score: avgGrammar, icon: '📖' },
              { label: 'Fluency', score: avgFluency, icon: '💬' },
            ].map(({ label, score, icon }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                <p className="text-2xl mb-1">{icon}</p>
                <p className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</p>
                <div className="w-full bg-slate-200 rounded-full h-2 my-2">
                  <div className={`h-2 rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
                </div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-Question Review */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" /> Question-by-Question Review
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className={`rounded-2xl border-2 overflow-hidden transition-all ${r.is_acceptable ? 'border-green-200' : 'border-red-200'}`}>
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${r.is_acceptable ? 'bg-green-100' : 'bg-red-100'}`}>
                  {r.is_acceptable
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{sectionNames[r.section] || r.section}</p>
                  <p className="font-semibold text-slate-800 truncate">{r.question}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-lg font-bold ${scoreColor(r.overall_score)}`}>{r.overall_score}</span>
                  {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedIdx === i && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-3 animate-in slide-in-from-top-1">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Content', r.content_score], ['Grammar', r.grammar_score], ['Fluency', r.fluency_score]].map(([l, s]) => (
                      <div key={l} className="bg-white rounded-lg p-2 border border-slate-100">
                        <p className={`font-bold ${scoreColor(s)}`}>{s}</p>
                        <p className="text-xs text-slate-400">{l}</p>
                      </div>
                    ))}
                  </div>

                  {r.response !== '(skipped)' && (
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Your Response</p>
                      <p className="text-sm text-slate-700 italic">"{r.response}"</p>
                    </div>
                  )}

                  {r.corrected_version && (
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Better Version</p>
                      <p className="text-sm text-slate-800 italic">"{r.corrected_version}"</p>
                    </div>
                  )}

                  {r.content_feedback && (
                    <div className="bg-white rounded-lg p-3 border-l-4 border-blue-400">
                      <p className="text-xs font-bold text-slate-500 mb-1">Content Feedback</p>
                      <p className="text-sm text-slate-700">{r.content_feedback}</p>
                    </div>
                  )}
                  {r.grammar_feedback && (
                    <div className="bg-white rounded-lg p-3 border-l-4 border-indigo-400">
                      <p className="text-xs font-bold text-slate-500 mb-1">Grammar Feedback</p>
                      <p className="text-sm text-slate-700">{r.grammar_feedback}</p>
                    </div>
                  )}
                  {r.improvement_tips && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                      <p className="text-xs font-bold text-amber-600 mb-1">💡 Tips</p>
                      <p className="text-sm text-slate-700">{r.improvement_tips}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Restart */}
      <div className="flex justify-center pb-4">
        <Button onClick={onRestart} size="lg" variant="outline" className="rounded-2xl px-8 gap-2">
          <RotateCcw className="w-5 h-5" /> Practice Again
        </Button>
      </div>
    </div>
  );
}