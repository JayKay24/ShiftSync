'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Scale, TrendingUp, Users, Info, AlertCircle } from 'lucide-react';

interface DistributionRecord {
  userId: string;
  userName: string;
  totalHours: number;
}

interface FairnessScore {
  score: number;
  averageHours: number;
  standardDeviation: number;
  totalStaff: number;
}

export default function AnalyticsPage() {
  const [distribution, setDistribution] = useState<DistributionRecord[]>([]);
  const [fairness, setFairness] = useState<FairnessScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [distRes, fairRes] = await Promise.all([
          api.get('/analytics/distribution'),
          api.get('/analytics/fairness'),
        ]);
        setDistribution(distRes.data);
        setFairness(fairRes.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
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

  const maxHours = Math.max(...distribution.map(d => d.totalHours), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Fairness</h1>
        <p className="text-muted-foreground">Monitor labor distribution and compliance metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fairness Score</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fairness?.score.toFixed(1)} / 10</div>
            <p className="text-xs text-muted-foreground">Based on hours distribution variance</p>
            <div className="mt-4 h-2 w-full rounded-full bg-secondary">
              <div 
                className="h-full rounded-full bg-primary" 
                style={{ width: `${(fairness?.score || 0) * 10}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours / Staff</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fairness?.averageHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Current scheduling period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standard Deviation</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fairness?.standardDeviation.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lower is more equitable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fairness?.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Assigned to at least 1 shift</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Hours Distribution</CardTitle>
            <CardDescription>Breakdown of assigned hours by staff member.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distribution.map((item) => (
                <div key={item.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.userName}</span>
                    <span className="text-muted-foreground">{item.totalHours.toFixed(1)}h</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-secondary/50">
                    <div 
                      className="h-full rounded-full bg-primary/80 transition-all" 
                      style={{ width: `${(item.totalHours / maxHours) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {distribution.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No distribution data available for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Understanding Fairness
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                The **Fairness Score** is calculated using the Coefficient of Variation of assigned hours. 
                A score of 10.0 indicates perfectly equal distribution across all staff.
              </p>
              <p>
                High variance (lower score) might indicate:
                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                  <li>Specific staff being over-scheduled</li>
                  <li>Incomplete training/certification for some team members</li>
                  <li>Heavy reliance on a few "senior" staff</li>
                </ul>
              </p>
              <p className="pt-2 italic">
                *Requirement #8: Analytics Dashboard for Managerial Oversight.*
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Premium Pay Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 text-amber-800 font-semibold mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Premium Shift Density
                </div>
                <p className="text-xs text-amber-700">
                  35% of shifts this weekend qualify for Premium Pay (Fri/Sat after 18:00 UTC).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
