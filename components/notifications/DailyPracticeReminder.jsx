import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Checks on app load whether the current student has practiced today.
 * If not, creates a single reminder notification (once per day).
 */
export default function DailyPracticeReminder() {
  useEffect(() => {
    const checkAndRemind = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        const normalizedEmail = user.email.toLowerCase().trim();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const reminderKey = `daily_reminder_${normalizedEmail}_${today}`;

        // Already reminded today — skip
        if (localStorage.getItem(reminderKey)) return;

        // Only remind students
        const profiles = await base44.entities.PublicProfile.filter(
          { user_email: normalizedEmail }, null, 1
        );
        if (profiles.length === 0 || profiles[0].account_type !== 'student') return;

        // Check UserProgress for any activity today
        const progress = await base44.entities.UserProgress.filter({
          user_email: normalizedEmail,
        });

        const hasPracticedToday = progress.some(
          (p) => p.last_practiced && p.last_practiced.startsWith(today)
        );

        // If no UserProgress today, check LessonProgress quiz attempts
        if (!hasPracticedToday) {
          const lessonProgress = await base44.entities.LessonProgress.filter({
            user_email: normalizedEmail,
          });
          const hasLessonToday = lessonProgress.some(
            (p) => p.last_attempt_date && p.last_attempt_date.startsWith(today)
          );
          if (hasLessonToday) {
            localStorage.setItem(reminderKey, 'done');
            return;
          }
        } else {
          localStorage.setItem(reminderKey, 'done');
          return;
        }

        // Student hasn't practiced today — create reminder
        await base44.entities.Notification.create({
          user_email: normalizedEmail,
          type: 'system',
          title: 'Daily Practice Reminder',
          message:
            "You haven't practiced today! Complete at least one lesson to keep your streak going.",
          link: '/Practice',
          read: false,
        });

        localStorage.setItem(reminderKey, 'sent');
      } catch (err) {
        console.error('Daily reminder check failed:', err);
      }
    };

    // Delay slightly so auth / initial data loads settle first
    const timer = setTimeout(checkAndRemind, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}