'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog as ShadcnDialog, 
  DialogContent as ShadcnDialogContent, 
  DialogHeader as ShadcnDialogHeader, 
  DialogTitle as ShadcnDialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Award,
  TrendingUp
} from 'lucide-react';
import { shiftsApi, analyticsApi } from '@/lib/api';
import { format, parseISO, isAfter } from 'date-fns';
import { AssignmentResult, HourDistributionRecord, StaffMemberResponse } from '@shiftsync/data-access';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMemberResponse | null;
}

export function StaffProfileModal({ isOpen, onClose, staff }: StaffProfileModalProps) {
  const [assignments, setAssignments] = useState<AssignmentResult[]>([]);
  const [fairnessStats, setFairnessStats] = useState<{ premiumShiftCount: number } | null>(null);
  const [distStats, setDistStats] = useState<HourDistributionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');

  useEffect(() => {
    if (isOpen && staff) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [asgnRes, fairnessRes, distRes] = await Promise.all([
            shiftsApi.getStaffAssignments(staff.id),
            analyticsApi.getFairness(),
            analyticsApi.getDistribution()
          ]);
          
          setAssignments(asgnRes.data);
          
          const staffFairness = fairnessRes.data.distribution.find(d => d.userId === staff.id);
          setFairnessStats(staffFairness || { premiumShiftCount: 0 });
          
          const staffDist = distRes.data.find(d => d.userId === staff.id);
          setDistStats(staffDist || null);
        } catch (error) {
          console.error('Failed to fetch staff profile data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, staff]);

  if (!staff) return null;

  const upcomingAssignments = assignments.filter(a => 
    isAfter(parseISO(a.shift?.startTime?.toString() || ''), new Date())
  );

  return (
    <ShadcnDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ShadcnDialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <ShadcnDialogHeader className="flex-row items-center gap-4 space-y-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl shadow-inner">
            {staff.firstName[0]}{staff.lastName[0]}
          </div>
          <div>
            <ShadcnDialogTitle className="text-2xl font-bold">
              {staff.firstName} {staff.lastName}
            </ShadcnDialogTitle>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Mail className="h-3.5 w-3.5" />
              {staff.email}
            </div>
          </div>
        </ShadcnDialogHeader>

        <div className="flex border-b mt-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overview' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'schedule' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Schedule ({upcomingAssignments.length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      <TrendingUp className="h-3.5 w-3.5" /> Weekly Hours
                    </div>
                    <div className="text-2xl font-bold">
                      {distStats?.totalHours.toFixed(1) || '0.0'} / {staff.desiredWeeklyHours || 40}
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min(((distStats?.totalHours || 0) / (staff.desiredWeeklyHours || 40)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      <Award className="h-3.5 w-3.5" /> Premium Shifts
                    </div>
                    <div className="text-2xl font-bold">
                      {fairnessStats?.premiumShiftCount || 0}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Shifts with 1.5x pay multiplier
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-primary" /> Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {staff.staffSkills.map(({ skill }) => (
                        <Badge key={skill.id} variant="secondary" className="px-3 py-1 font-medium capitalize">
                          {skill.name.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Certified Locations
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {staff.staffCertifications.map(({ location }) => (
                        <div key={location.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm bg-white">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium truncate">{location.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-3">
                {upcomingAssignments.length > 0 ? upcomingAssignments.map((asgn) => (
                  <div key={asgn.id} className="group p-3 rounded-xl border hover:border-primary/50 transition-all bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold">
                        {format(parseISO(asgn.shift?.startTime?.toString() || ''), 'EEEE, MMM d')}
                      </div>
                      {asgn.shift?.isPremium && (
                        <Badge variant="warning" className="bg-orange-100 text-orange-700 border-none h-5 text-[10px]">PREMIUM</Badge>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {format(parseISO(asgn.shift?.startTime?.toString() || ''), 'HH:mm')} - {format(parseISO(asgn.shift?.endTime?.toString() || ''), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {asgn.shift?.location?.name}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">No upcoming shifts scheduled</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ShadcnDialogContent>
    </ShadcnDialog>
  );
}
