'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  Bell,
  User as UserIcon,
  BarChart3,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNotifications } from '@/hooks/use-notifications';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/dashboard/manager',
    icon: LayoutDashboard,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'My Schedule',
    href: '/dashboard/staff',
    icon: Calendar,
    roles: ['Staff'],
  },
  {
    title: 'Schedule Manager',
    href: '/dashboard/manager/schedule',
    icon: Calendar,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Swap Marketplace',
    href: '/dashboard/staff/swaps',
    icon: Repeat,
    roles: ['Staff'],
  },
  {
    title: 'Analytics',
    href: '/dashboard/manager/analytics',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Staffing',
    href: '/dashboard/manager/staff',
    icon: Users,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['Admin', 'Manager', 'Staff'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['Admin', 'Manager', 'Staff'],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-lg">ShiftSync</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                pathname === item.href
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground'
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-white md:block">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Navbar */}
        <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
          {mounted ? (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          ) : (
            <div className="md:hidden w-10 h-10" />
          )}

          <div className="ml-auto flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="relative text-muted-foreground">
              <Link href="/dashboard/notifications">
                <Bell className="h-5 w-5" />
                {mounted && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>
            
            {mounted && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full border">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user?.firstName} {user?.lastName}
                    <p className="text-xs font-normal text-muted-foreground">
                      {user?.role}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="w-10 h-10 rounded-full border border-transparent" />
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
