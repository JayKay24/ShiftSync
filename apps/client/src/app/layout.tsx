import './global.css';
import { AuthProvider } from '../context/auth-context';

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
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
