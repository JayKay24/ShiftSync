'use client';

import React, { useState, useEffect } from 'react';
import { shiftsApi } from '@/lib/api';
import { OnDutyStaffResponse } from '@shiftsync/data-access';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, MapPin, Clock } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

export function OnDutyWidget() {
  const [onDuty, setOnDuty] = useState<OnDutyStaffResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOnDuty = async () => {
      try {
        const res = await shiftsApi.getOnDutyNow();
        setOnDuty(res.data);
      } catch (error) {
        console.error('Failed to fetch on-duty staff:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnDuty();
    const interval = setInterval(fetchOnDuty, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getDuration = (clockIn: Date | string) => {
    const start = typeof clockIn === 'string' ? new Date(clockIn) : clockIn;
    const diff = differenceInMinutes(new Date(), start);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-500" />
            On-Duty Now
          </div>
          <Badge variant="outline" className="text-[10px] font-normal border-green-200 text-green-700 bg-green-50">
            {onDuty.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : onDuty.length > 0 ? (
          <div className="space-y-3">
            {onDuty.map((staff) => (
              <div key={staff.id} className="flex items-start justify-between border-b border-slate-50 pb-2 last:border-0">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    {staff.user.firstName} {staff.user.lastName}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {staff.location.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Started {format(new Date(staff.clockIn), 'HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  {getDuration(staff.clockIn)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground italic">No staff currently on-duty.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
