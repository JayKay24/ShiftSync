'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { AuditLogResponse } from '@shiftsync/data-access';
import { useAudit } from '@/hooks/use-audit';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  title?: string;
}

export function AuditTrailModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  title = 'Audit Trail',
}: AuditTrailModalProps) {
  const { logs, isLoading, fetchEntityLogs } = useAudit();

  useEffect(() => {
    if (isOpen && entityId) {
      fetchEntityLogs(entityType, entityId);
    }
  }, [isOpen, entityId, entityType, fetchEntityLogs]);

  const getChangeSummary = (log: AuditLogResponse) => {
    if (!log.oldState && log.newState) return 'Created';
    if (log.oldState && !log.newState) return 'Deleted';
    
    const changes = [];
    for (const key in log.newState) {
      if (JSON.stringify(log.oldState[key]) !== JSON.stringify(log.newState[key])) {
        changes.push(key);
      }
    }
    return changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'No visible changes';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 italic">Loading history...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 italic">No history found for this item.</div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-4 pl-6 space-y-6 pb-4">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {log.actor.firstName} {log.actor.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(log.changedAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-sm font-semibold text-blue-700 mb-1">
                        {getChangeSummary(log)}
                      </div>
                      
                      {log.oldState && log.newState && (
                         <div className="grid grid-cols-1 gap-2 mt-2 text-xs font-mono overflow-x-auto">
                            {Object.entries(log.newState as Record<string, any>).map(([key, value]) => {
                               const oldValue = (log.oldState as any)[key];
                               if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
                                 return (
                                   <div key={key} className="flex flex-col p-1 bg-white rounded border border-gray-200">
                                      <span className="text-gray-400 uppercase text-[10px] mb-1">{key}</span>
                                      <div className="flex items-center space-x-2">
                                         <span className="line-through text-red-500 opacity-50 truncate max-w-[150px]">{String(oldValue)}</span>
                                         <span className="text-gray-300">→</span>
                                         <span className="text-green-600 font-bold truncate max-w-[200px]">{String(value)}</span>
                                      </div>
                                   </div>
                                 );
                               }
                               return null;
                            })}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
