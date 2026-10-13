import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function StudentProgressReport({ isOpen, onClose, studentEmail }) {
  const [progress, setProgress] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPracticed: 0,
    mastered: 0,
    weaknesses: [],
    strengths: []
  });
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedAssignmentForFeedback, setSelectedAssignmentForFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && studentEmail) {
      fetchReport();
    }
  }, [isOpen, studentEmail]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      // Fetch UserProgress
      const allProgress = await base44.entities.UserProgress.list();
      const studentProgress = allProgress.filter(p => p.user_email === studentEmail);
      
      // Fetch Assignments
      const allAssignments = await base44.entities.Assignment.list();
      const studentAssignments = allAssignments.filter(a => a.student_email === studentEmail);

      // Get content details to enrich progress
      // Optimization: In a real app, we'd query specific IDs, but here we list all for simplicity
      const [sentences, vocab, questions] = await Promise.all([
        base44.entities.Sentence.list(),
        base44.entities.VocabularyWord.list(),
        base44.entities.CivicsQuestion.list()
      ]);

      const contentMap = {
        sentence: sentences.reduce((acc, i) => ({...acc, [i.id]: i}), {}),
        vocabulary: vocab.reduce((acc, i) => ({...acc, [i.id]: i}), {}),
        civics_question: questions.reduce((acc, i) => ({...acc, [i.id]: i}), {})
      };

      const enrichedProgress = studentProgress.map(p => ({
        ...p,
        content: contentMap[p.content_type || 'sentence']?.[p.content_id] || { text: 'Unknown Content' }
      }));

      setProgress(enrichedProgress);
      setAssignments(studentAssignments);

      // Calculate Stats
      const mastered = enrichedProgress.filter(p => p.status === 'mastered');
      
      // Identify Weaknesses (practicing but not mastered recently)
      const weaknesses = enrichedProgress
        .filter(p => p.status === 'practicing')
        .slice(0, 5); // Top 5 pending

      const strengths = mastered.slice(0, 5);

      setStats({
        totalPracticed: enrichedProgress.length,
        mastered: mastered.length,
        weaknesses,
        strengths
      });

    } catch (error) {
      console.error("Error fetching report", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = (item) => {
    return item.content?.text || item.content?.word || item.content?.question || 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progress Report: {studentEmail}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Practiced</p>
                    <p className="text-2xl font-bold">{stats.totalPracticed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Mastered</p>
                    <p className="text-2xl font-bold">{stats.mastered}</p>
                  </div>
                </CardContent>
              </Card>
               <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Assignments</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weaknesses / To Improve */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-orange-800 uppercase tracking-wide">Needs Practice</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.weaknesses.length > 0 ? (
                    <ul className="space-y-2">
                      {stats.weaknesses.map((item, idx) => (
                         <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                           <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                           {getLabel(item)}
                         </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No specific weaknesses identified yet.</p>
                  )}
                </CardContent>
              </Card>

               {/* Strengths */}
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-green-800 uppercase tracking-wide">Mastered Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {stats.strengths.map((item, idx) => (
                         <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                           <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                           {getLabel(item)}
                         </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Keep practicing to master content!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assignment History */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Recent Assignments</h4>
              {assignments.length > 0 ? (
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{format(new Date(a.assigned_date), 'MMM d')}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                           {a.content_type === 'custom' ? `Custom: ${a.custom_content}` : (
                                a.content_type.replace('_', ' ')
                           )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === 'completed' ? 'default' : 'outline'} className={a.status === 'completed' ? 'bg-green-600' : ''}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                            {a.status === 'completed' && (
                                a.tutor_feedback ? (
                                    <span className="text-xs text-slate-600" title={a.tutor_feedback}>
                                        <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
                                        Sent
                                    </span>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs"
                                        onClick={() => setSelectedAssignmentForFeedback(a)}
                                    >
                                        Give Feedback
                                    </Button>
                                )
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 border rounded-lg bg-slate-50 text-slate-500 text-sm">
                  No assignments given yet.
                </div>
              )}
            </div>
            
            {/* Feedback Dialog Overlay */}
            <Dialog open={!!selectedAssignmentForFeedback} onOpenChange={(open) => !open && setSelectedAssignmentForFeedback(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Provide Feedback</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-slate-500">
                            Add a note for the student regarding their assignment.
                        </p>
                        <Input
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Great job! Work on..."
                        />
                        <Button 
                            onClick={async () => {
                                if (!selectedAssignmentForFeedback) return;
                                try {
                                    await base44.entities.Assignment.update(selectedAssignmentForFeedback.id, {
                                        tutor_feedback: feedbackText,
                                        feedback_date: new Date().toISOString()
                                    });
                                    toast.success("Feedback sent!");
                                    setFeedbackText("");
                                    setSelectedAssignmentForFeedback(null);
                                    fetchReport(); // Refresh
                                } catch(e) {
                                    toast.error("Failed to send feedback");
                                }
                            }}
                            className="w-full"
                        >
                            Send Feedback
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}