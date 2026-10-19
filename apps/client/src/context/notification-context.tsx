import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { notificationsApi } from '@/lib/api';
import { Notification } from '@shiftsync/data-access';

const SOCKET_URL = (
  (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001/api'
).replace('/api', '');

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  nextCursor: string | null;
  hasMore: boolean;
  fetchNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await notificationsApi.getNotifications();
      setNotifications(res.data.data);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMoreNotifications = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await notificationsApi.getNotifications({
        cursor: nextCursor,
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = res.data.data.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
      if (unreadIds.length === 0) return;

      await Promise.all(unreadIds.map((id) => notificationsApi.markRead(id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    fetchNotifications();

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification gateway');
    });

    newSocket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    newSocket.on('notification_read', (data: { id: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, isRead: true } : n)),
      );
    });

    newSocket.on('schedule_update', (data) => {
      console.log('Schedule update broadcast received:', data);
      // We could trigger a fresh fetch of shifts here if we had a useShifts hook that listened to this
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        nextCursor,
        hasMore,
        fetchNotifications,
        loadMoreNotifications,
        markAsRead,
        markAllAsRead,
        socket,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
}
