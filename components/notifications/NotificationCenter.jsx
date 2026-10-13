import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Trash2, Settings, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NotificationCenter({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (userEmail) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  const fetchNotifications = async () => {
    try {
      const data = await base44.entities.Notification.filter(
        { user_email: userEmail }, '-created_date', 20
      );
      
      setNotifications(data);
      
      const unread = data.filter(n => !n.read).length;
      
      // If new unread notifications and we have more than before, trigger push (simplified logic)
      if (unread > unreadCount && permission === 'granted') {
         const latest = data.find(n => !n.read);
         if (latest) {
             new Notification(latest.title, { body: latest.message });
         }
      }
      
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking read", error);
    }
  };
  
  const markAllRead = async () => {
      try {
          const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
          await Promise.all(unreadIds.map(id => base44.entities.Notification.update(id, { read: true })));
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
          toast.success("All marked as read");
      } catch (error) {
          console.error("Error marking all read", error);
      }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await base44.entities.Notification.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
        console.error("Error deleting notification", error);
    }
  };

  const requestPushPermission = async () => {
      if (typeof Notification === 'undefined') return;
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
          toast.success("Notifications enabled!");
          new Notification("Test Notification", { body: "You will now receive alerts here." });
      }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between mb-4">
          <SheetTitle>Notifications</SheetTitle>
          {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-8">
                  Mark all read
              </Button>
          )}
        </SheetHeader>
        
        {permission !== 'granted' && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center justify-between">
                <div className="flex items-center text-xs text-blue-700">
                    <AlertCircle className="w-3 h-3 mr-2" />
                    <span>Enable push notifications?</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={requestPushPermission}>
                    Enable
                </Button>
            </div>
        )}

        <ScrollArea className="flex-1 -mx-4 px-4">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => (
                        <div 
                            key={n.id} 
                            className={`relative group p-3 rounded-lg border transition-all ${n.read ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-100'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-sm font-medium ${n.read ? 'text-slate-700' : 'text-blue-900'}`}>{n.title}</h4>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!n.read && (
                                        <button onClick={() => markAsRead(n.id)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Mark read">
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button onClick={(e) => deleteNotification(n.id, e)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 mb-2 line-clamp-2">{n.message}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">
                                    {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : 'Just now'}
                                </span>
                                {n.link && (
                                    <Link 
                                        to={n.link} 
                                        onClick={() => { setIsOpen(false); markAsRead(n.id); }}
                                        className="text-[10px] font-medium text-blue-600 hover:underline"
                                    >
                                        View Details
                                    </Link>
                                )}
                            </div>
                            {!n.read && (
                                <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-blue-500 rounded-full md:hidden" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}