'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { api } from '@/lib/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useNotifications() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const unread = res.data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification gateway');
      fetchUnreadCount();
    });

    newSocket.on('notification', (data) => {
      console.log('New notification received:', data);
      setUnreadCount((prev) => prev + 1);
      // Optional: Show a toast notification here
    });

    newSocket.on('notification_read', (data) => {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    newSocket.on('schedule_update', (data) => {
      console.log('Schedule update broadcast received:', data);
      // This could trigger a refresh of the schedule page if we were on it
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, fetchUnreadCount]);

  return { unreadCount, fetchUnreadCount };
}
