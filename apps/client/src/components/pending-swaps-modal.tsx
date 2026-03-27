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
import { Loader2, Check, X, Clock, MapPin, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SwapRequest {
  id: string;
  status: string;
  requestingUser: { firstName: string; lastName: string };
  targetUser: { firstName: string; lastName: string } | null;
  shift: {
    startTime: string;
    endTime: string;
    location: { name: string };
  };
}

interface PendingSwapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PendingSwapsModal({ isOpen, onClose, onSuccess }: PendingSwapsModalProps) {
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchSwaps = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/swaps');
      setSwaps(res.data.filter((s: SwapRequest) => s.status === 'pending_manager'));
    } catch (error) {
      console.error('Failed to fetch pending swaps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchSwaps();
  }, [isOpen]);

  const handleAction = async (id: string, approve: boolean) => {
    setActioningId(id);
    try {
      await api.put(`/swaps/approve/${id}`, { approve });
      await fetchSwaps();
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process swap');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Pending Swap Approvals</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : swaps.length > 0 ? (
          <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
            {swaps.map((swap) => (
              <Card key={swap.id} className="p-4 border shadow-none">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {swap.targetUser ? 'SWAP' : 'DROP'}
                      </Badge>
                      <span className="text-sm font-bold">
                        {format(parseISO(swap.shift.startTime), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-semibold">{swap.requestingUser.firstName}</span> 
                      {swap.targetUser ? (
                        <> wants to swap with <span className="font-semibold">{swap.targetUser.firstName}</span></>
                      ) : (
                        <> wants to drop this shift</>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {swap.shift.location.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      className="h-8 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAction(swap.id, true)}
                      disabled={!!actioningId}
                    >
                      {actioningId === swap.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleAction(swap.id, false)}
                      disabled={!!actioningId}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No pending swaps requiring approval.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Minimal Card for internal use since we didn't export a sub-component Card
import { Card } from '@/components/ui/card';
