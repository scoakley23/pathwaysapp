import React from 'react';
import { 
  Trophy, 
  Flame, 
  Target, 
  Award, 
  Star, 
  Zap, 
  ShieldCheck, 
  BookOpen,
  Lock
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

const BADGES_CONFIG = {
  "first_step": {
    id: "first_step",
    name: "First Step",
    description: "Complete your first sentence correctly",
    icon: Star,
    color: "text-yellow-500 bg-yellow-100 border-yellow-200"
  },
  "on_fire": {
    id: "on_fire",
    name: "On Fire",
    description: "Achieve a 5-sentence streak",
    icon: Flame,
    color: "text-orange-500 bg-orange-100 border-orange-200"
  },
  "unstoppable": {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Achieve a 10-sentence streak",
    icon: Zap,
    color: "text-purple-500 bg-purple-100 border-purple-200"
  },
  "scholar": {
    id: "scholar",
    name: "Civics Scholar",
    description: "Master 50 sentences total",
    icon: BookOpen,
    color: "text-blue-500 bg-blue-100 border-blue-200"
  },
  "perfect_week": {
    id: "perfect_week",
    name: "Sharpshooter",
    description: "Get 100% accuracy in a session",
    icon: Target,
    color: "text-green-500 bg-green-100 border-green-200"
  },
  "veteran": {
    id: "veteran",
    name: "Veteran",
    description: "Earn 1000 points",
    icon: ShieldCheck,
    color: "text-indigo-500 bg-indigo-100 border-indigo-200"
  }
};

export default function BadgesDisplay({ earnedBadges = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <TooltipProvider>
        {Object.values(BADGES_CONFIG).map((badge) => {
          const isEarned = earnedBadges.includes(badge.id);
          const Icon = badge.icon;

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 text-center transition-all aspect-square
                    ${isEarned 
                      ? badge.color 
                      : 'bg-slate-50 border-slate-200 opacity-60 grayscale'
                    }`}
                >
                  {!isEarned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-xl">
                      <Lock className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  
                  <div className={`p-3 rounded-full ${isEarned ? 'bg-white/60' : 'bg-slate-200'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold leading-tight">{badge.name}</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{badge.name}</p>
                <p className="text-xs text-slate-500">{badge.description}</p>
                {!isEarned && <p className="text-xs text-red-400 mt-1 font-medium">Locked</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}