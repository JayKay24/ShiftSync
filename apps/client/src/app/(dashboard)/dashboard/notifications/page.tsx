'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Check, Clock, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Assuming there's a bulk endpoint, but if not we can do it individually or just wait for next refresh
    // For now, let's just mark the ones we have in state as read if we had an endpoint
    try {
      // If no bulk endpoint exists, we'd need to loop or add one.
      // Let's assume for now we just mark them one by one if needed, or just refresh.
      await Promise.all(notifications.filter(n => !n.isRead).map(n => api.post(`/notifications/${n.id}/read`)));
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'shift_assigned': return '📅';
      case 'swap_request': return '🔄';
      case 'swap_approved': return '✅';
      case 'swap_rejected': return '❌';
      default: return '🔔';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your schedule and swap requests.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={cn(
                "transition-colors",
                !notification.isRead ? "border-l-4 border-l-primary bg-primary/5" : "bg-card"
              )}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border text-xl">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("font-semibold", !notification.isRead ? "text-primary" : "text-foreground")}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(notification.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                  {!notification.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 h-7 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="text-sm text-muted-foreground">You don't have any new notifications.</p>
        </div>
      )}
    </div>
  );
}
