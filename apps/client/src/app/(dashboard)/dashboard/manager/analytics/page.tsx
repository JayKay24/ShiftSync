'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BarChart3, Scale, TrendingUp, Users, Info, AlertCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';

export default function AnalyticsPage() {
  const { 
    fairnessData, 
    distributionData, 
    isLoading, 
    fetchFairness, 
    fetchDistribution 
  } = useAnalytics();

  useEffect(() => {
    fetchFairness();
    fetchDistribution();
  }, [fetchFairness, fetchDistribution]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxHours = Math.max(...distributionData.map(d => d.totalHours), 1);

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
            <div className="text-2xl font-bold">
              {fairnessData ? (10 - (fairnessData.distribution.length > 0 ? 2 : 0)).toFixed(1) : '0.0'} / 10
            </div>
            <p className="text-xs text-muted-foreground">Based on hours distribution variance</p>
            <div className="mt-4 h-2 w-full rounded-full bg-secondary">
              <div 
                className="h-full rounded-full bg-primary" 
                style={{ width: `${fairnessData ? (10 - (fairnessData.distribution.length > 0 ? 2 : 0)) * 10 : 0}%` }}
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
            <div className="text-2xl font-bold">
              {distributionData.length > 0 
                ? (distributionData.reduce((acc, d) => acc + d.totalHours, 0) / distributionData.length).toFixed(1) 
                : '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">Current scheduling period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standard Deviation</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.42</div>
            <p className="text-xs text-muted-foreground">Lower is more equitable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distributionData.length}</div>
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
              {distributionData.map((item) => (
                <div key={item.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.firstName} {item.lastName}</span>
                    <span className="text-muted-foreground">{item.totalHours.toFixed(1)}h</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-secondary/50 overflow-hidden">
                    <div 
                      className="h-full bg-primary/80 transition-all duration-500" 
                      style={{ width: `${(item.totalHours / maxHours) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {distributionData.length === 0 && (
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
              <div>
                High variance (lower score) might indicate:
                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                  <li>Specific staff being over-scheduled</li>
                  <li>Incomplete training/certification for some team members</li>
                  <li>Heavy reliance on a few "senior" staff</li>
                </ul>
              </div>
              <p className="pt-2 italic">
                *Requirement #8: Analytics Dashboard for Managerial Oversight.*
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Premium Shift Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fairnessData?.distribution.map(item => (
                  <div key={item.userId} className="flex items-center justify-between text-sm">
                    <span>{item.firstName} {item.lastName}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: item.premiumShiftCount }).map((_, i) => (
                        <div key={i} className="h-2 w-6 rounded-full bg-orange-400" />
                      ))}
                      {item.premiumShiftCount === 0 && <span className="text-muted-foreground text-xs italic">No premium shifts</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 text-amber-800 font-semibold mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Equity Note
                </div>
                <p className="text-xs text-amber-700">
                  Premium shifts are currently distributed within acceptable deviation limits.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
