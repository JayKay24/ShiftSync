'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRightLeft, Clock, MapPin, Check, X, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';

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
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    location: {
      name: string;
    };
  };
}

export default function SwapMarketplace() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialShiftId = searchParams.get('shiftId');

  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<UserInfo[]>([]);
  
  const [selectedShift, setSelectedShift] = useState(initialShiftId || '');
  const [selectedTarget, setSelectedTarget] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const requestsForMe = useMemo(() => 
    swaps.filter(s => s.targetUserId === user?.id && s.status === 'pending_peer'), 
    [swaps, user?.id]
  );

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    setIsSubmitting(true);
    try {
      await api.post('/swaps/request', {
        shiftId: selectedShift,
        targetUserId: selectedTarget || undefined,
      });
      // Refresh data
      const res = await api.get('/swaps');
      setSwaps(res.data);
      setSelectedShift('');
      setSelectedTarget('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      if (accept) {
        await api.put(`/swaps/accept/${id}`);
      } else {
        // Reject not implemented in controller, but we could use a generic respond
        // For now, only accept is there
      }
      const res = await api.get('/swaps');
      setSwaps(res.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Swap Marketplace</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Create Request */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Request a Swap</CardTitle>
              <CardDescription>Target a specific colleague or leave blank to drop.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Your Shift</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    required
                  >
                    <option value="">-- Select Shift --</option>
                    {myAssignments.map((asgn) => (
                      <option key={asgn.id} value={asgn.shift.id}>
                        {format(parseISO(asgn.shift.startTime), 'MMM d')} - {asgn.shift.location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Staff (Optional)</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                  >
                    <option value="">-- Anyone (Public Drop) --</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <Button className="w-full" disabled={isSubmitting || !selectedShift}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: List Requests */}
        <div className="space-y-6 lg:col-span-2">
          {requestsForMe.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Badge variant="destructive">{requestsForMe.length}</Badge>
                Requests for You
              </h2>
              {requestsForMe.map((swap) => (
                <Card key={swap.id} className="border-l-4 border-l-primary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {swap.requestingUser.firstName} wants to swap
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(swap.shift.startTime), 'MMM d, HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {swap.shift.location.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(swap.id, true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline">
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
              <div className="grid gap-4">
                {myRequests.map((swap) => (
                  <Card key={swap.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">
                            {format(parseISO(swap.shift.startTime), 'MMM d, HH:mm')}
                          </span>
                          <Badge variant={
                            swap.status === 'approved' ? 'success' :
                            swap.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {swap.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Target: {swap.targetUser ? `${swap.targetUser.firstName} ${swap.targetUser.lastName}` : 'Public Drop'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sent {format(parseISO(swap.createdAt), 'MMM d')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">You haven't made any swap requests yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
