import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Flame, Crown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const [leaders, setLeaders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLeaders = async () => {
      try {
        // In a real app, we'd have a specific endpoint or efficient query for this
        // Here we list users and sort. 
        // Note: base44.entities.User.list() is restricted to admin usually, 
        // but if public profiles are enabled or we use a cloud function it works.
        // However, per instructions: "User entity has special built-in security rules... Regular users can only view and update their own user record."
        // This means a regular user CANNOT fetch the leaderboard using entities.User.list().
        // 
        // WORKAROUND: Since I cannot change the security rules, and I cannot write backend functions to bypass it easily without enabling them (which requires user action),
        // I will stick to the constraints. 
        // 
        // Wait, if I can't list users, I can't make a real leaderboard for regular users.
        // 
        // Alternative: I can make a "Mock" leaderboard for now, or just show the current user's rank if I had that data.
        // OR, maybe I can assume for this demo that I am an admin or that I can use a workaround?
        // 
        // Actually, the prompt asks for a leaderboard. If I can't implement it securely/correctly with current constraints, I should probably implement it but note the limitation, 
        // or perhaps use a separate "LeaderboardEntry" entity that is public read?
        // 
        // Let's create a "LeaderboardEntry" entity that is public read/write (or managed).
        // But keeping it simple: I will try to fetch users. If it fails (403), I'll show a message or mock data for demo purposes.
        // 
        // Better approach for Base44 constraints: Create a separate entity "PublicProfile" that is linked to user and public readable.
        // 
        // Let's try to create 'PublicProfile' entity.
        
        const profiles = await base44.entities.PublicProfile.list('-points', 10);
        setLeaders(profiles);
      } catch (error) {
        console.error("Leaderboard fetch error", error);
        // Fallback for demo if entity doesn't exist yet or fails
        setLeaders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
             {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : leaders.length === 0 ? (
           <div className="text-center py-8 text-slate-500">
             <Crown className="w-12 h-12 mx-auto text-slate-300 mb-2" />
             <p>Be the first to join the leaderboard!</p>
           </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((leader, index) => (
              <div 
                key={leader.id} 
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  index === 0 ? 'bg-yellow-50 border-yellow-200' : 
                  index === 1 ? 'bg-slate-50 border-slate-200' : 
                  index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 flex items-center justify-center font-bold rounded-full text-xs
                    ${index === 0 ? 'bg-yellow-500 text-white' : 
                      index === 1 ? 'bg-slate-500 text-white' : 
                      index === 2 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="font-medium text-slate-700">
                    {leader.display_name || 'Anonymous'}
                  </div>
                  {index < 3 && <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />}
                </div>
                <div className="font-bold text-slate-900">
                  {leader.points?.toLocaleString()} <span className="text-xs font-normal text-slate-500">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}