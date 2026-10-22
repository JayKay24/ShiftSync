import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

import { env } from '@/config/env';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { Notification } from '@shiftsync/data-access';

const SOCKET_URL = env.SOCKET_URL;

/**
 * State contract for notification management and real-time updates.
 */
export interface NotificationContextType {
  /** Array of loaded notifications. */
  notifications: Notification[];
  /** Computed count of unread notifications. */
  unreadCount: number;
  /** Initial loading flag. */
  isLoading: boolean;
  /** Subsequent page loading flag. */
  isLoadingMore: boolean;
  /** Keyset pagination cursor token for the next page. */
  nextCursor: string | null;
  /** Indicates whether more notifications are available to fetch. */
  hasMore: boolean;
  /** Dispatches an initial fetch of user notifications. */
  fetchNotifications: () => Promise<void>;
  /** Loads the next page of notifications using nextCursor. */
  loadMoreNotifications: () => Promise<void>;
  /** Marks a single notification as read. */
  markAsRead: (id: string) => Promise<void>;
  /** Marks all currently loaded unread notifications as read. */
  markAllAsRead: () => Promise<void>;
  /** Active Socket.io client instance. */
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

/**
 * Provider component managing real-time WebSocket connection and notification updates.
 *
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child elements.
 * @returns {React.JSX.Element} Context provider element.
 */
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

/**
 * Hook to access real-time notifications, unread counts, and notification actions.
 *
 * @returns {NotificationContextType} Notification context state and operations.
 * @throws {Error} If called outside of a NotificationProvider.
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
}
