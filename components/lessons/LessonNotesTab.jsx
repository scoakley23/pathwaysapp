import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { toast } from "sonner";

export default function LessonNotesTab({ lesson, userEmail }) {
  const [content, setContent] = useState('');
  const [noteId, setNoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const autoSaveRef = useRef(null);

  useEffect(() => {
    if (!userEmail || !lesson?.id) return;
    const load = async () => {
      try {
        const existing = await base44.entities.LessonNotes.filter(
          { user_email: userEmail.toLowerCase().trim(), lesson_id: lesson.id },
          null, 1
        );
        if (existing.length > 0) {
          setContent(existing[0].content || '');
          setNoteId(existing[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lesson?.id, userEmail]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => saveNote(val), 2000);
  };

  const saveNote = async (contentToSave = content) => {
    if (!userEmail || !lesson?.id) return;
    const trimmed = (contentToSave || '').trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const payload = {
        user_email: userEmail.toLowerCase().trim(),
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        lesson_topic: lesson.topic,
        content: trimmed
      };

      if (noteId) {
        await base44.entities.LessonNotes.update(noteId, { content: trimmed });
      } else {
        const created = await base44.entities.LessonNotes.create(payload);
        setNoteId(created.id);
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Write notes for this lesson. They auto-save as you type.</p>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
          {!isSaving && lastSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</span>}
          <Button size="sm" onClick={() => saveNote()} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={handleChange}
        placeholder="Start typing your notes here..."
        className="min-h-[300px] resize-y text-base leading-relaxed"
      />
    </div>
  );
}