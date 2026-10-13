import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { GraduationCap, School, X } from 'lucide-react';
import { toast } from "sonner";

export default function RoleSelectionDialog({ isOpen, onComplete, userEmail, userName }) {
  const [step, setStep] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user) {
          setStep('choose');
          return;
        }

        const normalizedEmail = user.email.toLowerCase().trim();
        const profiles = await base44.entities.PublicProfile.filter(
          { user_email: normalizedEmail }, null, 1
        );

        if (profiles.length === 0 || !profiles[0].account_type) {
          setCurrentUser(user);
          setEmail(user.email);
          setDisplayName(user.full_name || '');
          setStep('select-role');
        } else {
          // Profile exists with role - close dialog immediately
          onComplete(profiles[0].account_type);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setStep('choose');
      }
    };

    checkAuth();
  }, [isOpen, onComplete]);

 // Check URL for invite code OR email invite
useEffect(() => {
  if (!isOpen) return;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for code-based invite (e.g., ?invite=ABC1234)
  const code = urlParams.get('invite');
  if (code) {
    setInviteCode(code);
    setSelectedRole('student');
    if (!currentUser) {
      setStep('signup');
    }
    toast.success('Invite code detected! Sign up to join your tutor.');
  }
  
  // Check for email-based invite (e.g., ?tutor_invite=tutor@email.com)
  const tutorEmail = urlParams.get('tutor_invite');
  if (tutorEmail) {
    // Store for processing after login
    localStorage.setItem('pending_tutor_invite', tutorEmail);
    setSelectedRole('student');
    if (!currentUser) {
      setStep('signup');
    }
    toast.success('Tutor invitation detected! Sign up to connect.');
  }
}, [isOpen, currentUser]);

 const handleSignUp = async () => {
  if (!email || !password || !selectedRole) {
    toast.error('Please fill in all fields');
    return;
  }

  setIsSubmitting(true);
  try {
    // 1. Create auth account
    await base44.auth.signUp(email, password, {
      name: displayName || email.split('@')[0]
    });
    
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if invite code is valid (for students)
    let tutorEmail = null;
    if (selectedRole === 'student' && inviteCode) {
      console.log("=== INVITE CODE DEBUG ===");
      console.log("Looking for code:", inviteCode);
      
      // Fetch ALL profiles
      const allProfiles = await base44.entities.PublicProfile.list('-created_date', 1000);
      const cleanCode = inviteCode.replace(/\s+/g, '').toUpperCase();
      const variants = [cleanCode, cleanCode.replace(/0/g, 'O'), cleanCode.replace(/O/g, '0')];
      
      const matchingTutor = allProfiles.find(p =>
        p.account_type === 'tutor' &&
        p.invite_code &&
        variants.includes(p.invite_code.toUpperCase())
      );
      
      if (!matchingTutor) {
        toast.error('Invalid invite code. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
      tutorEmail = matchingTutor.user_email;
    }

    // 3. Create profile

    const profileData = {
      user_email: normalizedEmail,
      display_name: displayName || normalizedEmail.split('@')[0],
      account_type: selectedRole
    };

    // Generate invite code for tutors
    if (selectedRole === 'tutor') {
      const prefix = normalizedEmail.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const random = Math.floor(1000 + Math.random() * 9000);
      profileData.invite_code = `${prefix}${random}`;
    }

    await base44.entities.PublicProfile.create(profileData);

    // 4. Create relationship if student joined via invite
    if (selectedRole === 'student' && tutorEmail) {
      await base44.entities.TutorRelationship.create({
        tutor_email: tutorEmail,
        student_email: normalizedEmail,
        status: 'active',
        created_by: normalizedEmail
      });
      toast.success('Successfully joined your tutor!');
    }

    toast.success('Account created successfully!');
    onComplete(selectedRole);
    
  } catch (error) {
    console.error('Sign up error:', error);
    toast.error('Failed to create account. Please try again.');
    setIsSubmitting(false);
  }
};

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.auth.signIn(email, password);
      
      const normalizedEmail = email.toLowerCase().trim();
      const profiles = await base44.entities.PublicProfile.filter({ user_email: normalizedEmail });

      if (profiles.length === 0 || !profiles[0].account_type) {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setStep('select-role');
        setIsSubmitting(false);
        return;
      }

      const role = profiles[0].account_type;
      toast.success('Welcome back!');
      onComplete(role);
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials');
      setIsSubmitting(false);
    }
  };

  const handleRoleSelection = async () => {
  if (!selectedRole || !currentUser) return;

  setIsSubmitting(true);
  try {
    const normalizedEmail = currentUser.email.toLowerCase().trim();

    // Clean up ALL existing profiles first to prevent duplicates
    const allExisting = await base44.entities.PublicProfile.filter({ user_email: normalizedEmail });
    
    for (const profile of allExisting) {
      await base44.entities.PublicProfile.delete(profile.id);
    }
    
    // Handle invite code for students
    let tutorEmail = null;
    if (selectedRole === 'student' && inviteCode) {
      const allProfiles = await base44.entities.PublicProfile.list('-created_date', 1000);
      const cleanCode2 = inviteCode.replace(/\s+/g, '').toUpperCase();
      const variants2 = [cleanCode2, cleanCode2.replace(/0/g, 'O'), cleanCode2.replace(/O/g, '0')];
      
      const matchingTutor = allProfiles.find(p =>
        p.account_type === 'tutor' &&
        p.invite_code &&
        variants2.includes(p.invite_code.toUpperCase())
      );
      
      if (!matchingTutor) {
        toast.error('Invalid invite code. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
      tutorEmail = matchingTutor.user_email;
    }

    // Prepare profile data
    const profileData = {
      user_email: normalizedEmail,
      display_name: displayName || currentUser.full_name || normalizedEmail.split('@')[0],
      account_type: selectedRole
    };

    if (selectedRole === 'tutor') {
      const prefix = normalizedEmail.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const random = Math.floor(1000 + Math.random() * 9000);
      profileData.invite_code = `${prefix}${random}`;
    }

    // Create single new profile
    await base44.entities.PublicProfile.create(profileData);

    // Create tutor relationship if joining via invite code
    if (selectedRole === 'student' && tutorEmail) {
      const existingRel = await base44.entities.TutorRelationship.filter(
        { student_email: normalizedEmail, tutor_email: tutorEmail }, null, 1
      );
      
      if (existingRel.length === 0) {
        await base44.entities.TutorRelationship.create({
          tutor_email: tutorEmail,
          student_email: normalizedEmail,
          status: 'active',
          created_by: normalizedEmail
        });
        toast.success('Connected with your tutor!');
      }
    }

    toast.success(`Welcome as a ${selectedRole}!`);
    onComplete(selectedRole);
    
  } catch (error) {
    console.error('Role selection error:', error);
    toast.error('Failed to set role. Please try again.');
    setIsSubmitting(false);
  }
};

  if (!isOpen || !step) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {step === 'select-role' && (
          <button 
            onClick={async () => {
              await base44.auth.logout();
              window.location.reload();
            }}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="Sign out"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {step === 'choose' && (
          <div className="p-12 text-center space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Welcome to Citizenship Learning Hub</h1>
              <p className="text-xl text-slate-600">Get started or sign in to continue</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Button 
                onClick={() => setStep('signup')}
                size="lg"
                className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-lg"
              >
                Create Account
              </Button>
              <Button 
                onClick={() => setStep('login')}
                size="lg"
                variant="outline"
                className="flex-1 h-14 text-lg border-2"
              >
                Sign In
              </Button>
            </div>
          </div>
        )}

        {step === 'signup' && !selectedRole && (
          <div className="p-12 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Choose Your Role</h2>
              <p className="text-slate-600">Are you a student or a tutor?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button 
                onClick={() => setSelectedRole('student')}
                className="group p-8 rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Student</h3>
                <p className="text-slate-600">Practice for your citizenship test</p>
              </button>

              <button 
                onClick={() => setSelectedRole('tutor')}
                className="group p-8 rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:border-indigo-400 hover:shadow-lg hover:scale-[1.02] text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <School className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Tutor</h3>
                <p className="text-slate-600">Manage students and assignments</p>
              </button>
            </div>

            <div className="text-center">
              <button 
                onClick={() => setStep('choose')}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {step === 'signup' && selectedRole && (
          <div className="p-12 max-w-md mx-auto space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                selectedRole === 'student' ? 'bg-blue-600' : 'bg-indigo-600'
              }`}>
                {selectedRole === 'student' ? 
                  <GraduationCap className="w-8 h-8 text-white" /> : 
                  <School className="w-8 h-8 text-white" />
                }
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Sign Up as {selectedRole === 'student' ? 'Student' : 'Tutor'}</h2>
              {inviteCode && (
                <p className="text-sm text-green-600 font-medium mt-2">Using invite: {inviteCode}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {selectedRole === 'student' && !inviteCode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Invite Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC1234"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter your tutor's code to connect</p>
                </div>
              )}

              <Button 
                onClick={handleSignUp}
                disabled={isSubmitting}
                className={`w-full h-12 ${
                  selectedRole === 'student' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>

            <div className="text-center space-y-2 text-sm">
              <button onClick={() => setSelectedRole(null)} className="text-slate-600 hover:text-slate-900">
                ← Choose different role
              </button>
              <div>
                <button onClick={() => setStep('login')} className="text-blue-600 hover:text-blue-700">
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'login' && (
          <div className="p-12 max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
              <p className="text-slate-600">Sign in to your account</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <Button 
                onClick={handleLogin}
                disabled={isSubmitting}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>

            <div className="text-center space-y-2 text-sm">
              <button onClick={() => setStep('choose')} className="text-slate-600 hover:text-slate-900">
                ← Back
              </button>
              <div>
                <button onClick={() => setStep('signup')} className="text-blue-600 hover:text-blue-700">
                  Don't have an account? Sign up
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'select-role' && (
          <div className="p-12 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Complete Your Profile</h2>
              <p className="text-slate-600">Choose your role to get started</p>
              <p className="text-sm text-slate-500">Signed in as {currentUser?.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button 
                onClick={() => setSelectedRole('student')}
                className={`group p-8 rounded-2xl border-2 transition-all duration-300 text-center ${
                  selectedRole === 'student'
                    ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-colors ${
                  selectedRole === 'student' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Student</h3>
                <p className="text-slate-600">Practice for your citizenship test</p>
              </button>

              <button 
                onClick={() => setSelectedRole('tutor')}
                className={`group p-8 rounded-2xl border-2 transition-all duration-300 text-center ${
                  selectedRole === 'tutor'
                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-colors ${
                  selectedRole === 'tutor' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                }`}>
                  <School className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Tutor</h3>
                <p className="text-slate-600">Manage students and assignments</p>
              </button>
            </div>

            {selectedRole === 'student' && (
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invite Code (Optional)
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ABC1234"
                />
                <p className="text-xs text-slate-500 mt-1">Enter your tutor's code to connect</p>
              </div>
            )}

            <div className="text-center">
              <Button 
                onClick={handleRoleSelection}
                disabled={!selectedRole || isSubmitting}
                className={`px-12 h-12 text-lg ${
                  selectedRole === 'student' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Setting up...' : `Continue as ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : '...'}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}