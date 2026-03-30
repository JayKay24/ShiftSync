'use client';

import React, { useState, useEffect } from 'react';
import { shiftsApi } from '@/lib/api';
import { ShiftResponse, AvailableStaffResponse } from '@shiftsync/data-access';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, Clock, AlertTriangle, ShieldAlert, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { AuditTrailModal } from './audit-trail-modal';

interface ShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftResponse | null;
  onSuccess: () => void;
}

export function ShiftDetailsModal({
  isOpen,
  onClose,
  shift,
  onSuccess,
}: ShiftDetailsModalProps) {
  const { user } = useAuth();
  const [availableStaff, setAvailableStaff] = useState<AvailableStaffResponse[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      const fetchAvailableStaff = async () => {
        setIsLoadingStaff(true);
        try {
          const res = await shiftsApi.getAvailableStaff(shift.id);
          setAvailableStaff(res.data);
        } catch (error) {
          console.error('Failed to fetch available staff:', error);
        } finally {
          setIsLoadingStaff(false);
        }
      };
      fetchAvailableStaff();
      setError(null);
      setPendingStaffId(null);
      setOverrideReason('');
    }
  }, [isOpen, shift]);

  if (!shift) return null;

  const isPast = new Date(shift.startTime) < new Date();
  
  const SCHEDULE_EDIT_CUTOFF_HOURS = 48;
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() + SCHEDULE_EDIT_CUTOFF_HOURS);
  const isWithinCutoff = new Date(shift.startTime) < cutoffTime;

  const handleAssign = async (staff: AvailableStaffResponse) => {
    if (staff.requiresOverride && pendingStaffId !== staff.id) {
      setPendingStaffId(staff.id);
      setError(staff.warnings.join(', '));
      return;
    }

    setIsAssigning(true);
    setError(null);
    try {
      await shiftsApi.assignStaff(
        shift.id, 
        staff.id, 
        pendingStaffId === staff.id ? overrideReason : undefined
      );
      onSuccess();
      setPendingStaffId(null);
      setOverrideReason('');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to assign staff';
      const code = err.response?.data?.code;
      
      if (code === 'OVERRIDE_REQUIRED') {
        setPendingStaffId(staff.id);
        setError(Array.isArray(message) ? message.join(', ') : message);
      } else {
        setError(Array.isArray(message) ? message.join(', ') : message);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-6">
          <DialogTitle>Shift Details</DialogTitle>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 mt-[-4px]" 
              onClick={() => setIsAuditOpen(true)}
              title="View History"
            >
              <History className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                {format(parseISO(shift.startTime.toString()), 'EEEE, MMM d')}
              </div>
              {shift.isPremium && <Badge variant="warning">Premium</Badge>}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(shift.startTime.toString()), 'HH:mm')} - {format(parseISO(shift.endTime.toString()), 'HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {shift.assignments?.length || 0} / {shift.headcountNeeded} Assigned
              </span>
            </div>
          </div>

          {isPast ? (
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2 border border-blue-100">
              <Clock className="h-4 w-4 shrink-0" />
              <span>This shift has already passed. Staff assignments cannot be modified.</span>
            </div>
          ) : (isWithinCutoff && user?.role !== 'Admin') && (
            <div 
              data-testid="cutoff-warning-banner"
              className="rounded-md bg-amber-50 p-3 text-xs text-amber-700 flex items-start gap-2 border border-amber-100"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>This shift is within the 48-hour schedule lock. Edits are restricted.</span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned Staff
            </h3>
            <div className="space-y-2">
              {shift.assignments && shift.assignments.length > 0 ? (
                shift.assignments.map((asgn) => (
                  <div key={asgn.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{asgn.user?.firstName} {asgn.user?.lastName}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{asgn.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
              )}
            </div>
          </div>

          {!isPast && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Suggested Staff
              </h3>
              
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {pendingStaffId && (
                <div className="space-y-2 border-l-2 border-orange-500 pl-3 py-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase">
                    <ShieldAlert className="h-3 w-3" />
                    Override Required
                  </div>
                  <Label htmlFor="reason" className="text-[10px] text-muted-foreground">Reason for compliance override</Label>
                  <Input 
                    id="reason"
                    placeholder="e.g., Critical staffing shortage"
                    className="h-8 text-xs"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
              )}

              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                {isLoadingStaff ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  availableStaff.length > 0 ? (
                    availableStaff.map((staff) => (
                      <div key={staff.id} className={`flex items-center justify-between rounded-md border p-2 hover:bg-slate-50 ${pendingStaffId === staff.id ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{staff.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {staff.requiresOverride ? (
                              <Badge variant="outline" className="text-[8px] h-4 border-orange-200 text-orange-700 bg-orange-50">Requires Override</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] h-4 border-green-200 text-green-700 bg-green-50">Fully Compliant</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={pendingStaffId === staff.id ? "default" : "ghost"}
                          className={`h-8 text-xs ${pendingStaffId === staff.id ? 'bg-orange-600 hover:bg-orange-700' : 'text-primary hover:text-primary hover:bg-primary/10'}`}
                          disabled={isAssigning || (pendingStaffId === staff.id && !overrideReason)}
                          onClick={() => handleAssign(staff)}
                        >
                          {isAssigning && pendingStaffId === staff.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (pendingStaffId === staff.id ? 'Confirm' : 'Assign')}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center py-4 text-muted-foreground">No suggested staff found for this shift.</p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AuditTrailModal 
      isOpen={isAuditOpen}
      onClose={() => setIsAuditOpen(false)}
      entityType="shift"
      entityId={shift.id}
      title={`Shift History - ${format(parseISO(shift.startTime.toString()), 'MMM d')}`}
    />
    </>
  );
}
