import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Flag, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TestDateTracker() {
  const [date, setDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDate = async () => {
      try {
        const user = await base44.auth.me();
        if (user.test_date) {
          setDate(new Date(user.test_date));
        }
      } catch (e) {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchDate();
  }, []);

  const handleSelect = async (newDate) => {
    setDate(newDate);
    try {
      await base44.auth.updateMe({
        test_date: newDate ? newDate.toISOString() : null
      });
      toast.success("Test date updated!");
    } catch (e) {
      console.error("Failed to save date", e);
      toast.error("Failed to save date");
    }
  };

  if (isLoading) return null;

  const daysLeft = date ? differenceInDays(date, new Date()) : null;

  return (
    <div className="flex items-center gap-4">
      {date && (
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500 font-semibold uppercase">Time Remaining</p>
          <p className={`text-2xl font-bold ${daysLeft < 30 ? 'text-orange-600' : 'text-blue-600'}`}>
            {daysLeft > 0 ? `${daysLeft} Days` : daysLeft === 0 ? 'Today!' : 'Passed'}
          </p>
        </div>
      )}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal border-slate-200 bg-white hover:bg-slate-50",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Set Test Date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}