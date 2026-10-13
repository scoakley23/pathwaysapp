import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MyStudents from '@/components/tutor/MyStudents';
import MyTutor from '@/components/tutor/MyTutor';
import { GraduationCap, Users, School, Loader2 } from 'lucide-react';

export default function Tutor({ cachedUser, cachedRole }) {
  const [user, setUser] = useState(cachedUser || null);
  const [role, setRole] = useState(cachedRole || null);
  // If we have cached data, we are not loading
  const [isLoading, setIsLoading] = useState(!cachedUser || (cachedUser && !cachedRole));

  const fetchUserData = async () => {
    try {
      // If we already have data from props, we can skip or just refresh quietly
      const me = await base44.auth.me();
      setUser(me);
      
      const normalizedEmail = me.email.toLowerCase().trim();
      const profiles = await base44.entities.PublicProfile.filter({ user_email: normalizedEmail });
      
      if (profiles.length > 0 && profiles[0].account_type) {
          setRole(profiles[0].account_type);
      } else {
          // Keep existing role if we have one from cache to prevent flashing
          if (!role) setRole(null);
      }
    } catch (e) {
      console.error("Error loading user data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cachedUser) setUser(cachedUser);
    if (cachedRole) setRole(cachedRole);

    // If we don't have cached data, fetch it
    if (!cachedUser || !cachedRole) {
        fetchUserData();
    }
  }, [cachedUser, cachedRole]);

  if (isLoading) {
      return (
          <div className="flex justify-center items-center min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
      );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <School className="w-16 h-16 text-blue-200" />
        <h2 className="text-2xl font-bold text-slate-800">Sign in to access Tutor features</h2>
        <p className="text-slate-600">Connect with students or tutors to track progress together.</p>
      </div>
    );
  }

  if (!role) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-200" />
              <p className="text-slate-500">Setting up your profile...</p>
              <div className="flex flex-col gap-2 mt-4">
                  <button 
                    onClick={() => { setIsLoading(true); fetchUserData(); }} 
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    Check again
                  </button>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Reload Page
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          {role === 'tutor' ? <GraduationCap className="w-8 h-8 text-blue-600" /> : <School className="w-8 h-8 text-blue-600" />}
          {role === 'tutor' ? 'Tutor Dashboard' : 'My Classroom'}
        </h1>
        <p className="text-slate-600">
            {role === 'tutor' 
                ? 'Manage your students, assign practice, and track their progress.' 
                : 'Connect with your tutor and check your assignments.'}
        </p>
      </div>

      <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {role === 'tutor' ? (
              <MyStudents currentUserEmail={user.email.toLowerCase().trim()} />
          ) : (
              <MyTutor currentUserEmail={user.email.toLowerCase().trim()} />
          )}
      </div>
    </div>
  );
}