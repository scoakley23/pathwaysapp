import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, CheckCircle, AlertTriangle, Wand2 } from 'lucide-react';
import { toast } from "sonner";

const TOPICS = [
  'Principles of American Democracy',
  'System of Government',
  'Rights and Responsibilities',
  'U.S. History',
  'Geography and Symbols',
];

const TOPIC_COLORS = {
  'Principles of American Democracy': 'border-blue-300 bg-blue-50 text-blue-700',
  'System of Government': 'border-purple-300 bg-purple-50 text-purple-700',
  'Rights and Responsibilities': 'border-green-300 bg-green-50 text-green-700',
  'U.S. History': 'border-amber-300 bg-amber-50 text-amber-700',
  'Geography and Symbols': 'border-teal-300 bg-teal-50 text-teal-700',
};

export default function StudyPathDialog({ isOpen, onClose, student, tutorEmail }) {
  const [lessons, setLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('topic'); // 'topic' or 'lesson'

  useEffect(() => {
    if (isOpen) {
      loadLessons();
      // Pre-select weak topics
      if (student?.weakTopics?.length > 0) {
        setSelectedTopics(student.weakTopics.map(t => t.topic));
      } else {
        setSelectedTopics([]);
      }
      setSelectedLessons([]);
      setNote('');
    }
  }, [isOpen, student]);

  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const all = await base44.entities.Lesson.list('order', 200);
      setLessons(all);
    } catch (e) {
      toast.error('Failed to load lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleLesson = (lessonId) => {
    setSelectedLessons(prev =>
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const handleAssign = async () => {
    const studentEmail = student.student_email;
    let lessonsToAssign = [];

    if (mode === 'topic') {
      if (selectedTopics.length === 0) { toast.error('Select at least one topic'); return; }
      lessonsToAssign = lessons.filter(l => selectedTopics.includes(l.topic));
    } else {
      if (selectedLessons.length === 0) { toast.error('Select at least one lesson'); return; }
      lessonsToAssign = lessons.filter(l => selectedLessons.includes(l.id));
    }

    if (lessonsToAssign.length === 0) { toast.error('No lessons found for the selected criteria'); return; }

    setIsAssigning(true);
    try {
      // Create custom assignments for each lesson
      const assignments = lessonsToAssign.map(lesson => ({
        tutor_email: tutorEmail,
        student_email: studentEmail,
        content_type: 'custom',
        custom_type: 'sentence',
        custom_content: `Study Path: ${lesson.title}`,
        custom_data: {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          topic: lesson.topic,
          study_path: true,
          note: note || null,
        },
        status: 'pending',
        assigned_date: new Date().toISOString(),
      }));

      await base44.entities.Assignment.bulkCreate(assignments);

      // Notify student
      const topicList = [...new Set(lessonsToAssign.map(l => l.topic))].join(', ');
      await base44.entities.Notification.create({
        user_email: studentEmail,
        type: 'assignment',
        title: 'New Study Path Assigned',
        message: `Your tutor has assigned a study path covering: ${topicList}. ${note ? `Note: ${note}` : ''}`,
        link: '/Tutor',
      });

      toast.success(`Study path assigned: ${lessonsToAssign.length} lessons sent to ${student.student_email.split('@')[0]}`);
      onClose();
    } catch (e) {
      toast.error('Failed to assign study path');
    } finally {
      setIsAssigning(false);
    }
  };

  const lessonsByTopic = TOPICS.reduce((acc, topic) => {
    acc[topic] = lessons.filter(l => l.topic === topic);
    return acc;
  }, {});

  const totalSelected = mode === 'topic'
    ? lessons.filter(l => selectedTopics.includes(l.topic)).length
    : selectedLessons.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Assign Study Path
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            For <span className="font-semibold text-slate-700">{student?.student_email?.split('@')[0]}</span>
          </p>
        </DialogHeader>

        {/* Weak topics hint */}
        {student?.weakTopics?.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-700">Struggling areas pre-selected: </span>
              <span className="text-amber-600">{student.weakTopics.map(t => `${t.topic} (${t.avg}%)`).join(', ')}</span>
            </div>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode('topic')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'topic' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            By Topic
          </button>
          <button
            onClick={() => setMode('lesson')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'lesson' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            Pick Lessons
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
          ) : mode === 'topic' ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Select topics to include in the study path</p>
              {TOPICS.map(topic => {
                const count = lessonsByTopic[topic]?.length || 0;
                const isSelected = selectedTopics.includes(topic);
                const isWeak = student?.weakTopics?.some(t => t.topic === topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{topic}</span>
                      {isWeak && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">Weak</span>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{count} lesson{count !== 1 ? 's' : ''}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase">Select specific lessons</p>
              {TOPICS.map(topic => {
                const topicLessons = lessonsByTopic[topic] || [];
                if (topicLessons.length === 0) return null;
                return (
                  <div key={topic}>
                    <p className={`text-xs font-bold uppercase px-2 py-1 rounded-md inline-block mb-2 ${TOPIC_COLORS[topic] || 'bg-slate-100 text-slate-600'}`}>
                      {topic}
                    </p>
                    <div className="space-y-1.5">
                      {topicLessons.map(lesson => {
                        const isSelected = selectedLessons.includes(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => toggleLesson(lesson.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                              isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-slate-700 font-medium">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Optional Note */}
          <div className="mt-2">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Optional Message to Student</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Focus on the dates in U.S. History before your interview next month..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-sm text-slate-500">
              {totalSelected > 0 ? (
                <span className="font-semibold text-indigo-600">{totalSelected} lesson{totalSelected !== 1 ? 's' : ''} will be assigned</span>
              ) : (
                'No lessons selected'
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleAssign}
                disabled={isAssigning || totalSelected === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Assign Study Path
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}