import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, UserCheck, Clock, UserX, MessageCircle, FileText, BarChart, MoreHorizontal, Check, X, Link } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AssignContentDialog from './AssignContentDialog';
import StudentProgressReport from './StudentProgressReport';
import TutorDashboard from './TutorDashboard';
import StudentActivityMonitor from './StudentActivityMonitor';
import { LayoutDashboard, Users, Activity } from 'lucide-react';
import { toast } from "sonner";

export default function MyStudents({ currentUserEmail }) {
  const [view, setView] = useState('list'); // 'list', 'dashboard', or 'monitor'
  const [students, setStudents] = useState([]);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  
  // Dialog States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchInviteCode();
  }, [currentUserEmail]);

  const fetchInviteCode = async () => {
      try {
          const normalizedEmail = currentUserEmail.toLowerCase().trim();

          // Fetch all profiles for this tutor and use the one with account_type=tutor
          const allProfiles = await base44.entities.PublicProfile.list('-created_date', 1000);
          const profile = allProfiles.find(p => p.user_email === normalizedEmail && p.account_type === 'tutor')
              || allProfiles.find(p => p.user_email === normalizedEmail);
          
          if (profile) {
              if (profile.invite_code) {
                  setInviteCode(profile.invite_code);
              } else {
                  // Generate and persist code for tutors without one
                  const newCode = generateInviteCode(normalizedEmail);
                  await base44.entities.PublicProfile.update(profile.id, { invite_code: newCode });
                  setInviteCode(newCode);
              }
          }
      } catch (e) {
          console.error("Error with invite code", e);
      }
  };

  const generateInviteCode = (email) => {
      const prefix = email.substring(0, 3).toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${random}`;
  };

  const fetchStudents = async () => {
    try {
      const normalizedEmail = currentUserEmail.toLowerCase().trim();
      const rels = await base44.entities.TutorRelationship.filter({ tutor_email: normalizedEmail });
      setStudents(rels);
    } catch (error) {
      console.error("Error fetching students", error);
    }
  };

  const addStudent = async (e) => {
  e.preventDefault();
  if (!newStudentEmail) return;
  setIsSubmitting(true);

  const studentEmailLower = newStudentEmail.toLowerCase().trim();

  if (studentEmailLower === currentUserEmail.toLowerCase().trim()) {
      toast.error("You cannot add yourself as a student");
      setIsSubmitting(false);
      return;
  }

  try {
      const existing = students.find(s => s.student_email.toLowerCase() === studentEmailLower);
      if (existing) {
          toast.error("Student already added");
          setIsSubmitting(false);
          return;
      }

    const newRel = await base44.entities.TutorRelationship.create({
      tutor_email: currentUserEmail.toLowerCase().trim(),
      student_email: studentEmailLower,
      status: 'pending',
      created_by: currentUserEmail.toLowerCase().trim() // Track who created it
    });

    setStudents(prev => [...prev, newRel]);
    setNewStudentEmail("");
    toast.success("Invitation sent!");

    // Send email with BOTH invite link AND code
    const appUrl = window.location.origin;
    const inviteLink = `${appUrl}/?tutor_invite=${encodeURIComponent(currentUserEmail)}`;
    const emailSubject = "Invitation to join Citizenship Learning Hub";
    const emailBody = `Hello!

${currentUserEmail} has invited you to connect as a student on the Citizenship Learning Hub.

You have TWO ways to join:

OPTION 1 - Click this link to join automatically:
${inviteLink}

OPTION 2 - Sign up and enter this class code: ${inviteCode}

Best regards,
The Citizenship Hub Team`;

    base44.integrations.Core.SendEmail({
          from_name: "Citizenship Learning Hub",
          to: studentEmailLower,
          subject: emailSubject,
          body: emailBody
    }).catch((emailError) => {
        console.error("Email failed", emailError);
    });
  } catch (error) {
    console.error("Add student error", error);
    toast.error(`Failed to add student: ${error.message || "Unknown error"}`);
  } finally {
      setIsSubmitting(false);
  }
};

  const handleResponse = async (id, status) => {
    try {
      await base44.entities.TutorRelationship.update(id, { status });
      
      // Notify Student
      const rel = students.find(s => s.id === id);
      if (rel) {
          await base44.entities.Notification.create({
              user_email: rel.student_email,
              type: 'request',
              title: `Request ${status === 'active' ? 'Accepted' : 'Declined'}`,
              message: `Your tutor request was ${status}.`,
              link: '/Tutor'
          });
      }

      toast.success(`Request ${status}`);
      fetchStudents();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleAction = (student, action) => {
    setSelectedStudent(student);
    if (action === 'chat') setIsChatOpen(true);
    if (action === 'assign') setIsAssignOpen(true);
    if (action === 'report') setIsReportOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => { setView('list'); fetchStudents(); }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Users className="w-4 h-4 mr-2" /> My Students
            </button>
            <button 
                onClick={() => setView('dashboard')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
            </button>
            <button 
                onClick={() => setView('monitor')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'monitor' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Activity className="w-4 h-4 mr-2" /> Activity
            </button>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStudents} title="Refresh List">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full hover:animate-spin" />
        </Button>
      </div>

      {view === 'dashboard' ? (
          <TutorDashboard currentUserEmail={currentUserEmail} students={students} />
      ) : view === 'monitor' ? (
          <StudentActivityMonitor currentUserEmail={currentUserEmail} students={students} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add New Student</CardTitle>
            </CardHeader>
            <CardContent>
               {/* Invite Code Section */}
               <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                   <div>
                       <h3 className="text-sm font-bold text-indigo-900 mb-1">Your Class Invite Code</h3>
                       <p className="text-xs text-indigo-700">Share this code with your students. They can enter it to join your class instantly.</p>
                   </div>
                   <div className="flex items-center gap-2 flex-wrap">
                       <code className="bg-white px-4 py-2 rounded-lg border-2 border-indigo-200 text-xl font-mono font-bold text-indigo-600 tracking-wider">
                           {inviteCode || "..."}
                       </code>
                       <Button 
                           size="sm" 
                           variant="ghost" 
                           onClick={() => {
                               navigator.clipboard.writeText(inviteCode);
                               toast.success("Code copied!");
                           }}
                           className="text-indigo-600 hover:bg-indigo-100"
                       >
                           Copy Code
                       </Button>
                       <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => {
                               const link = `${window.location.origin}/?tutor_invite=${encodeURIComponent(currentUserEmail)}`;
                               navigator.clipboard.writeText(link);
                               toast.success("Invite link copied!");
                           }}
                           className="text-indigo-600 hover:bg-indigo-100"
                       >
                           <Link className="w-3 h-3 mr-1" /> Copy Link
                       </Button>
                   </div>
               </div>

               <div className="relative my-6">
                   <div className="absolute inset-0 flex items-center">
                       <span className="w-full border-t" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                       <span className="bg-white px-2 text-muted-foreground">Or invite by email</span>
                   </div>
               </div>

              <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                  <p>Enter your student's email address below. They will receive an invitation email.</p>
              </div>
              <form onSubmit={addStudent} className="flex gap-4">
                <Input
                  placeholder="Student's Email Address"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  type="email"
                  required
                />
                <Button type="submit" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" /> {isSubmitting ? 'Adding...' : 'Add Student'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      
        {students.map((rel) => (
          <Card key={rel.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-semibold text-lg truncate max-w-[180px]" title={rel.student_email}>
                        {rel.student_email.split('@')[0]}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-[180px]">{rel.student_email}</p>
                 </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleAction(rel, 'chat')}>
                            <MessageCircle className="mr-2 h-4 w-4" /> Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(rel, 'assign')}>
                            <FileText className="mr-2 h-4 w-4" /> Assign Practice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(rel, 'report')}>
                            <BarChart className="mr-2 h-4 w-4" /> View Report
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                 {rel.status === 'pending' ? (
                    rel.created_by !== currentUserEmail ? (
                     <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                         <span className="text-xs font-bold text-blue-700 block mb-2">Student requested to join</span>
                         <div className="flex gap-2">
                             <Button size="sm" className="bg-blue-600 hover:bg-blue-700 flex-1 h-8" onClick={() => handleResponse(rel.id, 'active')}>
                                 <Check className="w-3 h-3 mr-1" /> Accept
                             </Button>
                             <Button size="sm" variant="outline" className="text-slate-600 hover:bg-slate-100 flex-1 h-8" onClick={() => handleResponse(rel.id, 'rejected')}>
                                 <X className="w-3 h-3 mr-1" /> Reject
                             </Button>
                         </div>
                     </div>
                    ) : (
                     <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 flex items-center justify-between">
                         <span className="text-sm font-medium text-yellow-800 flex items-center">
                             <Clock className="w-4 h-4 mr-2" /> Invitation Sent
                         </span>
                         <span className="text-xs text-yellow-600">Pending acceptance</span>
                     </div>
                    )
                 ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {rel.status === 'active' && <Badge className="bg-green-100 text-green-700 border-green-200"><UserCheck className="w-3 h-3 mr-1"/> Active</Badge>}
                            {rel.status === 'rejected' && <Badge variant="destructive"><UserX className="w-3 h-3 mr-1"/> Rejected</Badge>}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleAction(rel, 'assign')} disabled={rel.status !== 'active'}>
                                Assign
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleAction(rel, 'chat')} disabled={rel.status !== 'active'}>
                                <MessageCircle className="w-4 h-4 text-slate-500" />
                            </Button>
                        </div>
                    </div>
                 )}
              </div>
              </CardContent>
              </Card>
              ))}
        {students.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-500">
                No students yet. Add one above!
            </div>
        )}
      </div>
      </>
      )}

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
            <div className="px-6 py-4 border-b">
                <DialogHeader>
                    <DialogTitle>Chat with {selectedStudent?.student_email}</DialogTitle>
                </DialogHeader>
            </div>
            <div className="flex-1 overflow-hidden">
                {selectedStudent && (
                    <ChatInterface 
                        currentUserEmail={currentUserEmail}
                        otherUserEmail={selectedStudent.student_email}
                    />
                )}
            </div>
        </DialogContent>
      </Dialog>

      {/* Assignments Dialog */}
      {selectedStudent && (
        <AssignContentDialog 
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            studentEmail={selectedStudent.student_email}
            tutorEmail={currentUserEmail}
        />
      )}

      {/* Report Dialog */}
      {selectedStudent && (
        <StudentProgressReport
             isOpen={isReportOpen}
             onClose={() => setIsReportOpen(false)}
             studentEmail={selectedStudent.student_email}
        />
      )}
    </div>
  );
}