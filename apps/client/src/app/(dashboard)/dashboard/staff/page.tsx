'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StaffDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Schedule</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Bartender @ Downtown</div>
            <p className="text-xs text-muted-foreground">Today, 12:00 PM - 16:00 PM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32 / 35</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-dashed p-20 text-center">
        <p className="text-muted-foreground">Personalized schedule view coming in the next step.</p>
      </div>
    </div>
  );
}
