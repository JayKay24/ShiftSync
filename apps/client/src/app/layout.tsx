import './global.css';
import { AuthProvider } from '../context/auth-context';
import { NotificationProvider } from '../context/notification-context';

export const metadata = {
  title: 'ShiftSync',
  description: 'Coastal Eats Shift Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
