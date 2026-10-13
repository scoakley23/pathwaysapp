import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, MessageCircle, Calendar, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { speakText } from "@/components/utils/textToSpeech";

export default function StudyHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const user = await base44.auth.me();
        const history = await base44.entities.AIStudyLog.filter({ user_email: user.email }, '-created_at');
        setLogs(history);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const speak = (text, lang = 'en') => {
    speakText(text, lang);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Practice')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Study Question History</h1>
          <p className="text-slate-500">Review your past questions and answers</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading history...</div>
      ) : logs.length === 0 ? (
        <Card className="text-center py-12 bg-slate-50 border-dashed">
           <div className="flex justify-center mb-4">
              <MessageCircle className="w-12 h-12 text-slate-300" />
           </div>
           <h3 className="text-lg font-medium text-slate-900">No questions yet</h3>
           <p className="text-slate-500 mb-4">Use the Study Buddy to ask questions while you practice!</p>
           <Link to={createPageUrl('Practice')}>
             <Button>Go to Practice</Button>
           </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 pb-3">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(log.created_at || log.created_date).toLocaleDateString()} 
                      <span className="text-xs">•</span>
                      {new Date(log.created_at || log.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </div>
                   {log.language && log.language !== 'en' && (
                      <Badge variant="secondary" className="uppercase text-xs">{log.language}</Badge>
                   )}
                </div>
                <CardTitle className="text-lg font-semibold text-blue-700 mt-2">
                  "{log.question}"
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                 <div className="prose prose-sm max-w-none text-slate-700 bg-white rounded-lg">
                    {log.answer}
                 </div>
                 <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => speak(log.answer, log.language)} className="text-slate-500 hover:text-blue-600">
                       <Volume2 className="w-4 h-4 mr-2" /> Listen
                    </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}