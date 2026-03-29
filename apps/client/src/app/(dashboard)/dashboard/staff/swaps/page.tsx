'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSwaps } from '@/hooks/use-swaps';
import { useStaff } from '@/hooks/use-staff';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRightLeft, Clock, MapPin, User, AlertCircle, Info, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SwapMarketplaceContent() {
  const { user } = useAuth();
  const { 
    swaps, 
    isLoading: isSwapsLoading, 
    error: swapError,
    fetchSwaps, 
    createRequest, 
    acceptRequest, 
    rejectRequest, 
    cancelRequest 
  } = useSwaps();
  
  const { staffList, fetchStaff, fetchMyAssignments } = useStaff();
  const searchParams = useSearchParams();
  const initialShiftId = searchParams.get('shiftId');

  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState(initialShiftId || '');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSwaps();
    fetchStaff();
    fetchMyAssignments().then(setMyAssignments);
  }, [fetchSwaps, fetchStaff, fetchMyAssignments]);

  const otherStaff = useMemo(() => 
    staffList.filter(s => s.id !== user?.id),
    [staffList, user?.id]
  );

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

    setIsSubmitting(true);
    try {
      await createRequest({
        shiftId: selectedShift,
        targetUserId: selectedTarget || undefined,
        reason
      });
      setSelectedShift('');
      setSelectedTarget('');
      setReason('');
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
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
                    <p className="mt-1">You have {pendingRequestsCount} pending requests. Requirement #3 limits you to a maximum of 3 pending requests at a time.</p>
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
                    {otherStaff.map((s) => (
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

                {swapError && (
                  <p className="text-xs font-medium text-destructive">{swapError}</p>
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
                            {format(parseISO(swap.shift.startTime.toString()), 'EEEE, MMM d @ HH:mm')}
                          </span>
                          <span className="flex items-center gap-1 italic">
                            &quot;{swap.reason}&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequest(swap.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => rejectRequest(swap.id)}>
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
            {isSwapsLoading && swaps.length === 0 ? (
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
                            {format(parseISO(swap.shift.startTime.toString()), 'MMM d, HH:mm')}
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
                          <span>Sent {format(parseISO(swap.createdAt.toString()), 'MMM d')}</span>
                        </div>
                        {swap.status === 'cancelled' && (
                          <p className="text-[10px] text-orange-600 font-medium">Auto-cancelled due to schedule update</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reason</span>
                           <p className="text-xs italic text-slate-500 max-w-[150px] truncate">{swap.reason}</p>
                        </div>
                        {(swap.status === 'pending_peer' || swap.status === 'pending_manager') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => cancelRequest(swap.id)}
                            title="Cancel Request"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
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
