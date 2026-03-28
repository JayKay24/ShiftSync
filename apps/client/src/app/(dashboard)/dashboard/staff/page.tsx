'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Assignment, ShiftResponse } from '@shiftsync/data-access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, MapPin, ArrowRightLeft } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ExtendedAssignment extends Assignment {
  shift: ShiftResponse;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await api.get('/shifts/my-assignments');
        const sorted = res.data.sort((a: ExtendedAssignment, b: ExtendedAssignment) => 
          new Date(a.shift.startTime.toString()).getTime() - new Date(b.shift.startTime.toString()).getTime()
        );
        setAssignments(sorted);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const upcomingShifts = assignments.filter(a => isAfter(parseISO(a.shift.startTime.toString()), new Date()));
  
  const totalHours = assignments.reduce((acc, a) => {
    const start = parseISO(a.shift.startTime.toString());
    const end = parseISO(a.shift.endTime.toString());
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Next Shift</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {format(parseISO(upcomingShifts[0].shift.startTime.toString()), 'EEEE, MMM d')}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm font-medium opacity-90">
                  <Clock className="h-4 w-4" />
                  {format(parseISO(upcomingShifts[0].shift.startTime.toString()), 'HH:mm')} - {format(parseISO(upcomingShifts[0].shift.endTime.toString()), 'HH:mm')}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm opacity-80">
                  <MapPin className="h-4 w-4" />
                  {upcomingShifts[0].shift.location?.name}
                </div>
              </>
            ) : (
              <div className="text-lg font-medium italic opacity-80">No upcoming shifts</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desired Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHours.toFixed(1)} / {user?.desiredWeeklyHours || 40}</div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${Math.min((totalHours / (user?.desiredWeeklyHours || 40)) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalHours >= (user?.desiredWeeklyHours || 40) 
                ? "Target reached!" 
                : `${((user?.desiredWeeklyHours || 40) - totalHours).toFixed(1)} hours more to reach target`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start gap-2 h-9">
              <Link href="/dashboard/staff/swaps">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Request Swap
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-9">
              <Link href="/dashboard/settings">
                <Calendar className="h-4 w-4 text-primary" />
                Update Availability
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Assignments</h2>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingShifts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingShifts.map((asgn) => (
              <Card key={asgn.id} className="group transition-all hover:shadow-md border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">
                      {format(parseISO(asgn.shift.startTime.toString()), 'MMM d, yyyy')}
                    </CardTitle>
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(parseISO(asgn.shift.startTime.toString()), 'EEEE')}
                    </p>
                  </div>
                  {asgn.shift.isPremium && (
                    <Badge variant="warning" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Premium</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        {format(parseISO(asgn.shift.startTime.toString()), 'HH:mm')} - {format(parseISO(asgn.shift.endTime.toString()), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{asgn.shift.location?.name}</p>
                        <p className="text-xs">{asgn.shift.location?.address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t opacity-0 transition-opacity group-hover:opacity-100">
                    <Button asChild variant="ghost" size="sm" className="w-full text-primary hover:bg-primary/10">
                      <Link href={`/dashboard/staff/swaps?shiftId=${asgn.shift.id}`}>
                        Initiate Swap Request
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-slate-50/50">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No shifts scheduled</h3>
            <p className="text-sm text-muted-foreground">You don't have any upcoming shifts assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
