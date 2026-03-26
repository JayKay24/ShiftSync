'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  staffSkills: { skill: { name: string } }[];
  staffCertifications: { location: { name: string } }[];
}

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  headcountNeeded: number;
  requiredSkillId: string;
  isPremium: boolean;
  assignments?: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
}

interface ShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onSuccess: () => void;
}

export function ShiftDetailsModal({
  isOpen,
  onClose,
  shift,
  onSuccess,
}: ShiftDetailsModalProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchStaff = async () => {
        setIsLoadingStaff(true);
        try {
          const res = await api.get('/shifts/staff');
          setStaffList(res.data);
        } catch (error) {
          console.error('Failed to fetch staff:', error);
        } finally {
          setIsLoadingStaff(false);
        }
      };
      fetchStaff();
      setError(null);
      setShowOverride(false);
      setOverrideReason('');
    }
  }, [isOpen]);

  if (!shift) return null;

  const handleAssign = async (userId: string) => {
    setIsAssigning(true);
    setError(null);
    try {
      await api.post(`/shifts/${shift.id}/assign`, {
        userId,
        overrideReason: showOverride ? overrideReason : undefined,
      });
      onSuccess();
      setShowOverride(false);
      setOverrideReason('');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to assign staff';
      if (message.includes('7th consecutive day') || message.includes('compliance')) {
        setShowOverride(true);
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const assignedUserIds = shift.assignments?.map((a) => a.user.id) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Shift Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                {format(parseISO(shift.startTime), 'EEEE, MMM d')}
              </div>
              {shift.isPremium && <Badge variant="warning">Premium</Badge>}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {shift.assignments?.length || 0} / {shift.headcountNeeded} Assigned
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned Staff
            </h3>
            <div className="space-y-2">
              {shift.assignments && shift.assignments.length > 0 ? (
                shift.assignments.map((asgn) => (
                  <div key={asgn.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{asgn.user.firstName} {asgn.user.lastName}</span>
                    <Badge variant="outline" className="text-[10px]">Confirmed</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Available Staff
            </h3>
            
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {showOverride && (
              <div className="space-y-2 border-l-2 border-warning pl-3 py-1">
                <Label htmlFor="reason" className="text-xs font-bold text-warning">Manager Override Reason Required</Label>
                <Input 
                  id="reason"
                  placeholder="e.g., Critical staffing shortage"
                  className="h-8 text-xs"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            )}

            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
              {isLoadingStaff ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                staffList
                  .filter((s) => !assignedUserIds.includes(s.id))
                  .map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between rounded-md border p-2 hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{staff.firstName} {staff.lastName}</span>
                        <div className="flex flex-wrap gap-1">
                          {staff.staffSkills?.map(ss => (
                            <span key={ss.skill.name} className="text-[9px] uppercase text-muted-foreground bg-slate-100 px-1 rounded">
                              {ss.skill.name.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        disabled={isAssigning || (showOverride && !overrideReason)}
                        onClick={() => handleAssign(staff.id)}
                      >
                        {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
