import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot, User, Loader2, Volume2, Globe, History } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { speakText } from "@/components/utils/textToSpeech";
import { LANGUAGES } from '@/hooks/useLessonTranslation';

export default function StudyBuddy() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI study buddy. Ask me any question about the US Citizenship test!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [tutorEmail, setTutorEmail] = useState(null);
  const [language, setLanguage] = useState('en');
  const scrollRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Find active tutor
        const rels = await base44.entities.TutorRelationship.filter({
          student_email: currentUser.email,
          status: 'active'
        });
        
        if (rels.length > 0) {
          setTutorEmail(rels[0].tutor_email);
        }
      } catch (e) {
        // Not logged in or other error
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const speak = (text) => {
    speakText(text, language);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuestion = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }]);
    setIsLoading(true);

    try {
      // 1. Get AI Answer
      let prompt = `You are a helpful US Citizenship Test Tutor. 
      The student asked: "${userQuestion}"
      
      Provide a clear, accurate, and concise answer relevant to the US Civics test or English learning for the test. 
      Keep it simple and encouraging.`;

      if (language !== 'en') {
        prompt += `\n\nIMPORTANT: Provide the answer in ${language}. Also provide the English translation below it.`;
      }

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const answerText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);

      setMessages(prev => [...prev, { role: 'assistant', content: answerText }]);

      // 2. Save to History Log
      if (user) {
        await base44.entities.AIStudyLog.create({
            user_email: user.email,
            question: userQuestion,
            answer: answerText,
            language: language,
            created_at: new Date().toISOString()
        });
      }

      // 3. Notify Tutor if exists
      if (tutorEmail && user) {
        await base44.integrations.Core.SendEmail({
          to: tutorEmail,
          subject: `Student Question: ${user.email}`,
          body: `Hello,\n\nYour student ${user.email} asked the AI Study Buddy a question:\n\n"${userQuestion}"\n\nThe AI answered:\n"${answerText}"\n\nYou might want to follow up with them directly.\n\nBest,\nCitizenship Learning Hub`
        });
      }

    } catch (error) {
      console.error("Study Buddy Error:", error);
      toast.error("Sorry, I couldn't answer that right now.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <Card className="w-[350px] h-[500px] shadow-2xl border-blue-200 mb-4 pointer-events-auto flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          <CardHeader className="bg-blue-600 text-white rounded-t-xl p-3 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <CardTitle className="text-base">AI Study Buddy</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <Link to={createPageUrl('StudyHistory')}>
                        <Button variant="ghost" size="icon" className="text-blue-100 hover:text-white hover:bg-blue-700 h-8 w-8" title="View History">
                            <History className="w-4 h-4" />
                        </Button>
                    </Link>
                    <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-blue-100 hover:text-white hover:bg-blue-700 h-8 w-8"
                    onClick={() => setIsOpen(false)}
                    >
                    <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-2 w-full">
                <Globe className="w-4 h-4 text-blue-100" />
                <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-8 bg-blue-700 border-none text-white text-xs focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50">
             <div className="h-full overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex gap-2 max-w-[85%]", 
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-blue-100 text-blue-600" : "bg-blue-600 text-white"
                    )}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm group relative",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
                    )}>
                      {msg.content}
                      {msg.role === 'assistant' && (
                          <button 
                            onClick={() => speak(msg.content)}
                            className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Read aloud"
                          >
                              <Volume2 className="w-4 h-4" />
                          </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  </div>
                )}
             </div>
          </CardContent>

          <CardFooter className="p-3 bg-white border-t shrink-0">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input 
                placeholder="Ask a question..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className={cn(
          "rounded-full h-14 w-14 shadow-xl pointer-events-auto transition-all duration-300",
          isOpen ? "rotate-90 opacity-0 scale-0" : "rotate-0 opacity-100 scale-100",
          "bg-blue-600 hover:bg-blue-700 text-white"
        )}
      >
        <MessageCircle className="w-7 h-7" />
      </Button>
      
      {/* Close button that appears when open to allow closing if the card covers the toggle */}
      {isOpen && (
         <Button
            onClick={() => setIsOpen(false)}
            size="lg"
            className="rounded-full h-14 w-14 shadow-xl pointer-events-auto bg-slate-800 hover:bg-slate-900 text-white absolute bottom-0 right-0"
          >
            <X className="w-7 h-7" />
          </Button>
      )}
    </div>
  );
}