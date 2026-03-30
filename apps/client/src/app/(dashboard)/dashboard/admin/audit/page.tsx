'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAudit } from '@/hooks/use-audit';
import { format, subDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, History, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditLogResponse } from '@shiftsync/data-access';

export default function GlobalAuditPage() {
  const { logs, isLoading, fetchLogsInRange } = useAudit();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    fetchLogsInRange(startDate, endDate);
  }, [fetchLogsInRange, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionType = (log: AuditLogResponse) => {
    if (!log.oldState && log.newState) return { label: 'Created', color: 'bg-green-100 text-green-700 border-green-200' };
    if (log.oldState && !log.newState) return { label: 'Deleted', color: 'bg-red-100 text-red-700 border-red-200' };
    return { label: 'Updated', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const formatEntityName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global record of all system modifications for corporate oversight.
          </p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3 bg-white p-3 rounded-lg border shadow-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="startDate" className="text-[10px] uppercase font-bold text-muted-foreground px-1">From</Label>
            <Input
              id="startDate"
              type="date"
              className="w-[160px] h-9 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="endDate" className="text-[10px] uppercase font-bold text-muted-foreground px-1">To</Label>
            <Input
              id="endDate"
              type="date"
              className="w-[160px] h-9 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button variant="default" size="sm" className="h-9 px-4 gap-2" onClick={loadLogs} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
              <History className="h-4 w-4 text-primary" />
              Modification History
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {logs.length} Log Entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm font-medium text-slate-500">Retrieving secure logs...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {logs.map((log: AuditLogResponse) => {
                const action = getActionType(log);
                const isExpanded = expandedId === log.id;
                const changedDate = log.changedAt instanceof Date ? log.changedAt : parseISO(log.changedAt as string);
                
                return (
                  <div key={log.id} className={cn(
                    "transition-all duration-200",
                    isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/30"
                  )}>
                    <div 
                      className="flex items-center p-4 cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full items-center">
                        <div className="md:col-span-2 flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">
                            {format(changedDate, 'MMM d, yyyy')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(changedDate, 'HH:mm:ss')}
                          </span>
                        </div>
                        
                        <div className="md:col-span-3 flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              {log.actor?.firstName} {log.actor?.lastName}
                            </span>
                            <span className="text-[10px] uppercase font-medium text-slate-400">Authorized Actor</span>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-tight px-2 py-0.5", action.color)}>
                            {action.label}
                          </Badge>
                        </div>

                        <div className="md:col-span-3 flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-700 capitalize">
                              {formatEntityName(log.entityType)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate" title={log.entityId}>
                              {log.entityId.split('-')[0]}...
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200/50">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-5 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 border-t border-slate-200/50 pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <Badge variant="secondary" className="text-[9px] uppercase font-bold bg-slate-200/50 text-slate-600">Previous State</Badge>
                            </div>
                            <div className="rounded-lg bg-slate-900 shadow-inner border border-slate-800 p-3 overflow-hidden">
                              <pre className="text-[11px] leading-relaxed text-slate-300 font-mono overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                                {log.oldState ? JSON.stringify(log.oldState, null, 2) : '// Initial state (null)'}
                              </pre>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <Badge variant="secondary" className="text-[9px] uppercase font-bold bg-green-500/10 text-green-400">Resulting State</Badge>
                            </div>
                            <div className="rounded-lg bg-slate-900 shadow-inner border border-slate-800 p-3 overflow-hidden">
                              <pre className="text-[11px] leading-relaxed text-green-400 font-mono overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                                {log.newState ? JSON.stringify(log.newState, null, 2) : '// Terminal state (null)'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-slate-200" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No Audit Records</h3>
              <p className="text-sm text-slate-500 max-w-[280px] mt-2 leading-relaxed">
                We couldn\'t find any modification logs for this period. Try extending your date range.
              </p>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => {
                setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                loadLogs();
              }}>
                Show Last 30 Days
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
