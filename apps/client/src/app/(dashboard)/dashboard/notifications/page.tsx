'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Check, Clock, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';

export default function NotificationsPage() {
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    fetchNotifications 
  } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'shift_assigned': return '📅';
      case 'swap_request_update': return '🔄';
      case 'swap_pending_approval': return '⏳';
      case 'shift_modified': return '📝';
      case 'shift_cancelled': return '🚫';
      case 'schedule_published': return '📢';
      case 'overtime_warning': return '⚠️';
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchNotifications} 
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {notifications.some(n => !n.isRead) && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {isLoading && notifications.length === 0 ? (
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
                      {format(typeof notification.createdAt === 'string' ? parseISO(notification.createdAt) : notification.createdAt, 'MMM d, HH:mm')}
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
