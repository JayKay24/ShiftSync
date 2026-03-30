'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { FairnessScoreResponse, HourDistributionRecord } from '@shiftsync/data-access';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BarChart3, Scale, TrendingUp, Users, Info, Award, AlertCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';

export default function AnalyticsPage() {
  const { 
    distributionData, 
    isLoading: isDistLoading, 
    fetchDistribution 
  } = useAnalytics();

  const [fairness, setFairness] = useState<FairnessScoreResponse | null>(null);
  const [isFairnessLoading, setIsFairnessLoading] = useState(true);

  useEffect(() => {
    const fetchFairness = async () => {
      try {
        const res = await analyticsApi.getFairness();
        setFairness(res.data);
      } catch (error) {
        console.error('Failed to fetch fairness score:', error);
      } finally {
        setIsFairnessLoading(false);
      }
    };
    fetchFairness();
    fetchDistribution();
  }, [fetchDistribution]);

  const isLoading = isDistLoading || isFairnessLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxHours = Math.max(...distributionData.map(d => d.totalHours), 1);
  const avgHours = distributionData.length > 0 
    ? (distributionData.reduce((acc, d) => acc + d.totalHours, 0) / distributionData.length)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Fairness</h1>
        <p className="text-muted-foreground">Monitor labor distribution, equity, and compliance metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fairness Index</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700" data-testid="overall-fairness-score">
              {fairness?.overallScore}%
            </div>
            <p className="text-xs text-muted-foreground">Premium shift equality measure</p>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
              <div 
                className="h-full rounded-full bg-blue-600 transition-all duration-1000" 
                style={{ width: `${fairness?.overallScore || 0}%` }}
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
            <div className="text-2xl font-bold">{avgHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Current scheduling period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribution CV</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.42</div>
            <p className="text-xs text-muted-foreground">Coefficient of Variation</p>
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
            <CardDescription>Total assigned hours per staff member (Current Period).</CardDescription>
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
                  No distribution data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Premium Shift Distribution</CardTitle>
              <CardDescription>Count of Friday/Saturday evening and high-demand shifts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {fairness?.distribution.map((staff) => (
                  <div key={staff.userId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{staff.firstName} {staff.lastName}</span>
                      <span className="font-bold text-blue-600">{staff.premiumShiftCount}</span>
                    </div>
                    <div className="flex gap-1.5 h-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-full flex-1 rounded-full transition-colors ${
                            i < staff.premiumShiftCount ? 'bg-blue-500' : 'bg-slate-100'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-blue-600" />
                Fairness Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                The **Fairness Index** measures how equitably premium shifts (Fri/Sat 18:00+) are distributed. 
                We use the Coefficient of Variation (CV) normalized to a 0-100 scale.
              </p>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-blue-800">
                <div className="flex items-center gap-2 font-semibold mb-1 text-xs uppercase tracking-wider">
                  <AlertCircle className="h-3 w-3" />
                  Equity Goal
                </div>
                <p className="text-xs">
                  Maintain a score above 80% to ensure high staff satisfaction and prevent burnout of specific team members.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
