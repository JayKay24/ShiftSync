'use client';

import React, { useState, useEffect } from 'react';
import { api, analyticsApi } from '@/lib/api';
import { HourDistributionRecord } from '@shiftsync/data-access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, ArrowRightLeft, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OnDutyWidget } from '@/components/on-duty-widget';

interface DashboardStats {
  totalStaff: number;
  pendingSwaps: number;
  upcomingShifts: number;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [distribution, setDistribution] = useState<HourDistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, distRes] = await Promise.all([
          api.get('/shifts/stats'),
          analyticsApi.getDistribution()
        ]);
        setStats(statsRes.data);
        setDistribution(distRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manager Overview</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalStaff}</div>
            <p className="mt-1 text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Swaps</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingSwaps}</div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting your approval</p>
            {Number(stats?.pendingSwaps) > 0 && (
              <Button asChild variant="link" className="h-auto p-0 text-xs" size="sm">
                <Link href="/dashboard/manager/schedule">Review Now</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.upcomingShifts}</div>
            <p className="mt-1 text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 space-y-4">
          <OnDutyWidget />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Weekly Hour Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {distribution.slice(0, 5).map((record) => {
                  const percentage = Math.min((record.totalHours / record.desiredWeeklyHours) * 100, 100);
                  const isOver = record.totalHours > record.desiredWeeklyHours;
                  
                  return (
                    <div key={record.userId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{record.firstName} {record.lastName}</span>
                        <span className={isOver ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                          {record.totalHours} / {record.desiredWeeklyHours}h
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-blue-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <Button asChild variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  <Link href="/dashboard/manager/analytics">View All Analytics</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Management Console</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
               <Button asChild variant="default" className="justify-start gap-2 h-12">
                <Link href="/dashboard/manager/schedule">
                  <Calendar className="h-5 w-5" />
                  Labor Scheduling Hub
                </Link>
              </Button>
            </div>
            
            <div className="h-px bg-slate-100 my-2" />
            
            <div className="grid gap-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/dashboard/manager/staff">
                  <Users className="h-4 w-4" />
                  Staff Certifications
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/dashboard/manager/analytics">
                  <TrendingUp className="h-4 w-4" />
                  Fairness & Premium Metrics
                </Link>
              </Button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
               <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Compliance Health</h4>
               <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">All systems operational</span>
               </div>
               <p className="text-[10px] text-muted-foreground mt-1">Labor law checks active for all scheduling operations.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
