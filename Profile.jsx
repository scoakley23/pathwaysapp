import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Trophy, Flame, Star, GraduationCap, School, Users, Save, Loader2 } from 'lucide-react';
import BadgesDisplay from '@/components/gamification/BadgesDisplay';
import TutorDashboard from '@/components/tutor/TutorDashboard';
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Fetch Public Profile for display name
      const profiles = await base44.entities.PublicProfile.filter({ user_email: userData.email });

      if (profiles.length > 0) {
        setPublicProfile(profiles[0]);
        setDisplayName(profiles[0].display_name || userData.full_name || "");
        
        if (profiles[0].account_type === 'tutor') {
             const rels = await base44.entities.TutorRelationship.filter({ tutor_email: userData.email });
             setStudents(rels);
        }
      } else {
        setDisplayName(userData.full_name || "");
      }
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Update Public Profile
      if (publicProfile) {
        await base44.entities.PublicProfile.update(publicProfile.id, {
          display_name: displayName
        });
      } else {
        const newProfile = await base44.entities.PublicProfile.create({
          user_email: user.email,
          display_name: displayName,
          points: user.points || 0,
          badges_count: (user.badges || []).length
        });
        setPublicProfile(newProfile);
      }
      
      // Optionally update User entity full_name if needed, but display_name is primarily for public view
      await base44.auth.updateMe({ full_name: displayName });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">Please sign in to view your profile</h2>
      </div>
    );
  }

  const initials = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Column: Profile Card */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            <CardContent className="relative pt-0 pb-8 px-6">
              <div className="flex flex-col items-center -mt-12">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarFallback className="text-2xl bg-slate-100 text-slate-700 font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 text-center">
                  {displayName || "User"}
                </h2>
                <p className="text-slate-500 text-sm text-center mb-6">{user.email}</p>
                
                {(!publicProfile || publicProfile.account_type !== 'tutor') && (
                <div className="w-full grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{user.points || 0}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Points</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{(user.badges || []).length}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Badges</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{user.max_streak || 0}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Streak</p>
                  </div>
                </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Stats & Relationships */}
        <div className="w-full md:w-2/3 space-y-6">
          
          {publicProfile && publicProfile.account_type === 'tutor' ? (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Classroom Progress</h3>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/Tutor'}>
                        <School className="w-4 h-4 mr-2" /> Manage Students
                    </Button>
                </div>
                <TutorDashboard currentUserEmail={user.email} students={students} />
            </div>
          ) : (
            <>
              {/* Detailed Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{user.total_correct || 0}</p>
                    <p className="text-xs text-slate-600">Correct Answers</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                  <CardContent className="p-4 text-center">
                    <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{user.current_streak || 0}</p>
                    <p className="text-xs text-slate-600">Current Streak</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                  <CardContent className="p-4 text-center">
                    <Star className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{user.points || 0}</p>
                    <p className="text-xs text-slate-600">Total Points</p>
                  </CardContent>
                </Card>
                 <Card className="bg-green-50 border-green-100">
                  <CardContent className="p-4 text-center">
                    <GraduationCap className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{(user.badges || []).length}</p>
                    <p className="text-xs text-slate-600">Badges Earned</p>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Your Badge Collection</CardTitle>
                      <CardDescription>Unlock badges by practicing consistently.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BadgesDisplay earnedBadges={user.badges || []} />
                    </CardContent>
                  </Card>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}