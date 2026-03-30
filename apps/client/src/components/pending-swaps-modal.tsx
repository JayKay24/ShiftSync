'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSwaps } from '@/hooks/use-swaps';
import { useNotifications } from '@/hooks/use-notifications';

interface PendingSwapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PendingSwapsModal({ isOpen, onClose, onSuccess }: PendingSwapsModalProps) {
  const { swaps, isLoading, fetchSwaps, approveRequest } = useSwaps();
  const { fetchNotifications } = useNotifications();
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSwaps();
    }
  }, [isOpen, fetchSwaps]);

  const pendingSwaps = useMemo(() => 
    swaps.filter(s => s.status === 'pending_manager'),
    [swaps]
  );

  const handleAction = async (id: string, approve: boolean) => {
    setActioningId(id);
    try {
      await approveRequest(id, approve);
      fetchNotifications();
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
        
        {isLoading && pendingSwaps.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : pendingSwaps.length > 0 ? (
          <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
            {pendingSwaps.map((swap) => (
              <Card key={swap.id} className="p-4 border shadow-none">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {swap.targetUser ? 'SWAP' : 'DROP'}
                      </Badge>
                      <span className="text-sm font-bold">
                        {format(parseISO(swap.shift.startTime.toString()), 'MMM d, HH:mm')}
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

                    {swap.reason && (
                      <div className="text-xs italic text-muted-foreground bg-slate-50 p-2 rounded">
                        &quot;{swap.reason}&quot;
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {swap.shift.location?.name || 'Unknown Location'}
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
