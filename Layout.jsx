import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, Mic, CheckCircle, LogOut, Menu, X, Settings, GraduationCap, User, MessageSquare, Notebook, School } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import RoleSelectionDialog from '@/components/onboarding/RoleSelectionDialog';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import StudyBuddy from '@/components/ai/StudyBuddy';
import DailyPracticeReminder from '@/components/notifications/DailyPracticeReminder';
import { Toaster } from "sonner";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const normalizedEmail = currentUser.email.toLowerCase().trim();

        // Check localStorage cache first to avoid re-showing onboarding on every navigation
        const cachedRole = localStorage.getItem(`role_${normalizedEmail}`);
        if (cachedRole) {
          setRole(cachedRole);
          setShowOnboarding(false);
          return;
        }
        
        // Clean up duplicate profiles (keep only the most recent one with account_type)
        const allProfiles = await base44.entities.PublicProfile.filter(
             { user_email: normalizedEmail }, '-created_date', 100
        );
        
        if (allProfiles.length > 1) {
          // Find the first profile with account_type, or just use the most recent
          const primaryProfile = allProfiles.find(p => p.account_type) || allProfiles[0];
          
          // Delete all other profiles
          const duplicateIds = allProfiles.filter(p => p.id !== primaryProfile.id).map(p => p.id);
          for (const id of duplicateIds) {
            await base44.entities.PublicProfile.delete(id);
          }
          
          if (primaryProfile.account_type) {
            localStorage.setItem(`role_${normalizedEmail}`, primaryProfile.account_type);
          }
          setRole(primaryProfile.account_type);
          setShowOnboarding(!primaryProfile.account_type);
        } else if (allProfiles.length === 1) {
          const profile = allProfiles[0];
          if (profile.account_type) {
            localStorage.setItem(`role_${normalizedEmail}`, profile.account_type);
          }
          setRole(profile.account_type);
          setShowOnboarding(!profile.account_type);
        } else {
          // No profile - show onboarding
          setShowOnboarding(true);
        }
        
        // Handle invite links for students
        const currentProfile = allProfiles.find(p => p.account_type) || allProfiles[0];
        if (currentProfile && currentProfile.account_type === 'student') {
            const params = new URLSearchParams(location.search);
            const urlInviteEmail = params.get('tutor_invite');
            
            if (urlInviteEmail) {
                localStorage.setItem('pending_tutor_invite', urlInviteEmail);
            }

            const storedInviteEmail = localStorage.getItem('pending_tutor_invite');
            const inviteTutorEmail = urlInviteEmail || storedInviteEmail;
            
            if (inviteTutorEmail) {
                 try {
                     const tutorEmail = inviteTutorEmail.toLowerCase().trim();
                     const existing = await base44.entities.TutorRelationship.filter(
                         { student_email: normalizedEmail, tutor_email: tutorEmail }, null, 1
                     );
                     
                     if (existing.length === 0) {
                         await base44.entities.TutorRelationship.create({
                             student_email: normalizedEmail,
                             tutor_email: tutorEmail,
                             status: 'active'
                         });
                     } else if (existing[0].status !== 'active') {
                         await base44.entities.TutorRelationship.update(existing[0].id, { status: 'active' });
                     }
                     
                     localStorage.removeItem('pending_tutor_invite');
                     if (urlInviteEmail) {
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                     }
                 } catch (err) {
                     console.error("Error processing invite", err);
                 }
            }
        }
      } catch (e) {
        console.error("Auth check error:", e);
        setShowOnboarding(false);
      }
    };
    
    checkUser();
  }, [location.search]);

  const getNavItems = React.useMemo(() => {
    const items = [
      { label: 'Home', path: '/', icon: BookOpen },
    ];

    // Dynamic Navigation based on Role
    if (role === 'tutor') {
        items.push({ label: 'Tutor Portal', path: '/Tutor', icon: GraduationCap });
    } else {
        items.push({ label: 'Practice', path: '/Practice', icon: Mic });
        items.push({ label: 'Lessons', path: '/Lessons', icon: Notebook });
        items.push({ label: 'Progress', path: '/Progress', icon: CheckCircle });
        
        if (role === 'student' || (!role && user)) {
          items.push({ label: 'My Classroom', path: '/Tutor', icon: School });
        } else if (!user) {
          items.push({ label: 'Tutors', path: '/Tutor', icon: School });
        }
    }

    items.push({ label: 'Profile', path: '/Profile', icon: User });

    if (user?.role === 'admin') {
      items.push({ label: 'Admin', path: '/Admin', icon: Settings });
    }

    return items;
  }, [role, user]);

  const navItems = getNavItems;

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <img 
              src="https://media.base44.com/images/public/6931bd654d327c7b2e36bfed/f90c67bf6_Screenshot2026-07-22at33716PM.png" 
              alt="Pathways Logo"
              className="w-10 h-10 rounded-xl shadow-sm transform hover:scale-105 transition-transform object-cover ring-1 ring-slate-200"
            />
            <span className="font-bold text-xl tracking-tight" style={{ color: '#1A3A6D' }}>
              Pathways USA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={createPageUrl(item.path.replace('/', ''))}
                className={`text-sm font-medium transition-colors hover:text-blue-700 flex items-center gap-2 px-3 py-2 rounded-md
                  ${location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
                ))}

                {user && <NotificationCenter userEmail={user.email} />}

                {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2 text-slate-600 hover:text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            ) : (
               <Button size="sm" onClick={() => base44.auth.redirectToLogin()} className="ml-2 bg-blue-700 hover:bg-blue-800">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationCenter userEmail={user.email} />}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => (
                    <Link 
                      key={item.path} 
                      to={createPageUrl(item.path.replace('/', ''))}
                      onClick={() => setIsOpen(false)}
                      className={`text-lg font-medium transition-colors flex items-center gap-3 px-4 py-3 rounded-lg
                        ${location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}
                   <div className="border-t border-slate-100 my-2 pt-4">
                    {user ? (
                      <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                      </Button>
                    ) : (
                      <Button className="w-full bg-blue-700 hover:bg-blue-800" onClick={() => base44.auth.redirectToLogin()}>
                        Sign In
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main key={role || 'init'} className="container mx-auto px-4 pt-16 pb-8 max-w-5xl">
        {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, { cachedUser: user, cachedRole: role });
            }
            return child;
        })}
      </main>
      
      {showOnboarding && user && (
          <RoleSelectionDialog 
              isOpen={showOnboarding} 
              userEmail={user.email}
              userName={user.full_name}
              onComplete={(selectedRole) => {
                  if (user?.email) {
                    localStorage.setItem(`role_${user.email.toLowerCase().trim()}`, selectedRole);
                  }
                  setRole(selectedRole);
                  setShowOnboarding(false);
              }}
          />
      )}
      <StudyBuddy />
      <DailyPracticeReminder />
      <Toaster />
    </div>
  );
}