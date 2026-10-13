import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileText, HelpCircle, BookOpen } from 'lucide-react';
import GenerateLessonsButton from '@/components/admin/GenerateLessonsButton';
import SentencesTab from '@/components/admin/SentencesTab';
import CivicsQuestionsTab from '@/components/admin/CivicsQuestionsTab';
import VocabularyWordsTab from '@/components/admin/VocabularyWordsTab';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // Not logged in
      } finally {
        setAuthChecked(true);
      }
    };
    checkUser();
  }, []);

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">Manage all practice content — sentences, civics questions, and vocabulary words.</p>
        </div>
        <GenerateLessonsButton />
      </div>

      <Tabs defaultValue="sentences">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="sentences" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Sentences
          </TabsTrigger>
          <TabsTrigger value="civics" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Civics Q's
          </TabsTrigger>
          <TabsTrigger value="vocab" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Vocabulary
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sentences" className="mt-6">
          <SentencesTab />
        </TabsContent>
        <TabsContent value="civics" className="mt-6">
          <CivicsQuestionsTab />
        </TabsContent>
        <TabsContent value="vocab" className="mt-6">
          <VocabularyWordsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}