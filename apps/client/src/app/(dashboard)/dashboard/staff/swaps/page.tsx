'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { ShiftResponse } from '@shiftsync/data-access';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRightLeft, Clock, MapPin, User, AlertCircle, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface SwapRequest {
  id: string;
  requestingUserId: string;
  targetUserId: string | null;
  shiftId: string;
  status: string;
  reason: string;
  createdAt: string;
  requestingUser: UserInfo;
  targetUser: UserInfo | null;
  shift: {
    startTime: string;
    endTime: string;
    location: {
      name: string;
    };
  };
}

interface Assignment {
  id: string;
  shift: ShiftResponse;
}

function SwapMarketplaceContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialShiftId = searchParams.get('shiftId');

  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<UserInfo[]>([]);
  
  const [selectedShift, setSelectedShift] = useState(initialShiftId || '');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [reason, setReason] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [swapRes, asgnRes, staffRes] = await Promise.all([
          api.get('/swaps'),
          api.get('/shifts/my-assignments'),
          api.get('/shifts/staff'),
        ]);
        setSwaps(swapRes.data);
        setMyAssignments(asgnRes.data);
        setStaff(staffRes.data.filter((s: UserInfo) => s.id !== user?.id));
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const myRequests = useMemo(() => 
    swaps.filter(s => s.requestingUserId === user?.id), 
    [swaps, user?.id]
  );
  
  const pendingRequestsCount = useMemo(() => 
    myRequests.filter(r => r.status === 'pending_peer' || r.status === 'pending_manager').length,
    [myRequests]
  );

  const requestsForMe = useMemo(() => 
    swaps.filter(s => s.targetUserId === user?.id && s.status === 'pending_peer'), 
    [swaps, user?.id]
  );

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift || !reason) return;
    setError(null);

    setIsSubmitting(true);
    try {
      await api.post('/swaps/request', {
        shiftId: selectedShift,
        targetUserId: selectedTarget || undefined,
        reason
      });
      const res = await api.get('/swaps');
      setSwaps(res.data);
      setSelectedShift('');
      setSelectedTarget('');
      setReason('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      if (accept) {
        await api.put(`/swaps/accept/${id}`);
      }
      const res = await api.get('/swaps');
      setSwaps(res.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  const isLimitReached = pendingRequestsCount >= 3;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Swap Marketplace</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className={isLimitReached ? 'border-orange-200 bg-orange-50/20' : ''}>
            <CardHeader>
              <CardTitle>Request a Swap</CardTitle>
              <CardDescription>
                Target a specific colleague or leave blank for a public drop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLimitReached ? (
                <div className="rounded-md bg-orange-100 p-4 text-xs text-orange-800 flex items-start gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-bold">Request Limit Reached</p>
                    <p className="mt-1">You have {pendingRequestsCount} pending requests. Requirement #5 limits you to a maximum of 3 pending requests at a time.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-blue-50 p-4 text-[11px] text-blue-700 flex items-start gap-2 mb-4">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>You have <strong>{pendingRequestsCount} / 3</strong> pending requests allowed.</span>
                </div>
              )}

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shift">Select Your Shift</Label>
                  <select
                    id="shift"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    required
                    disabled={isLimitReached}
                  >
                    <option value="">-- Select Shift --</option>
                    {myAssignments.map((asgn) => (
                      <option key={asgn.id} value={asgn.shift.id}>
                        {format(parseISO(asgn.shift.startTime.toString()), 'MMM d')} - {asgn.shift.location?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Target Staff (Optional)</Label>
                  <select
                    id="target"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    disabled={isLimitReached}
                  >
                    <option value="">-- Anyone (Public Drop) --</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Request</Label>
                  <Input 
                    id="reason"
                    placeholder="e.g., Personal emergency, doctor appointment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    disabled={isLimitReached}
                  />
                </div>

                {error && (
                  <p className="text-xs font-medium text-destructive">{error}</p>
                )}

                <Button className="w-full" disabled={isSubmitting || !selectedShift || isLimitReached}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {requestsForMe.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">{requestsForMe.length}</Badge>
                Requests for You
              </h2>
              {requestsForMe.map((swap) => (
                <Card key={swap.id} className="border-l-4 border-l-primary shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {swap.requestingUser.firstName} wants to swap
                        </p>
                        <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(parseISO(swap.shift.startTime), 'EEEE, MMM d @ HH:mm')}
                          </span>
                          <span className="flex items-center gap-1 italic">
                            &quot;{swap.reason}&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(swap.id, true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleRespond(swap.id, false)}>
                        Ignore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold">My Requests</h2>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myRequests.length > 0 ? (
              <div className="grid gap-3">
                {myRequests.map((swap) => (
                  <Card key={swap.id} className="shadow-none border-slate-200">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">
                            {format(parseISO(swap.shift.startTime), 'MMM d, HH:mm')}
                          </span>
                          <Badge 
                            variant="outline"
                            className={
                              swap.status === 'approved' ? 'border-green-200 text-green-700 bg-green-50' :
                              swap.status === 'rejected' ? 'border-red-200 text-red-700 bg-red-50' :
                              swap.status === 'cancelled' ? 'border-slate-200 text-slate-500 bg-slate-50' :
                              'border-blue-200 text-blue-700 bg-blue-50'
                            }
                          >
                            {swap.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Target: {swap.targetUser ? `${swap.targetUser.firstName} ${swap.targetUser.lastName}` : 'Public Drop'}</span>
                          <span>•</span>
                          <span>Sent {format(parseISO(swap.createdAt), 'MMM d')}</span>
                        </div>
                        {swap.status === 'cancelled' && (
                          <p className="text-[10px] text-orange-600 font-medium">Auto-cancelled due to schedule update</p>
                        )}
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reason</span>
                         <p className="text-xs italic text-slate-500 max-w-[150px] truncate">{swap.reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
                <p className="text-sm text-muted-foreground">You haven't made any swap requests yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwapMarketplace() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SwapMarketplaceContent />
    </Suspense>
  );
}
