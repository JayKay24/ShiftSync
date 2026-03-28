'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ShiftResponse, Location, Skill } from '@shiftsync/data-access';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ChevronLeft, ChevronRight, Filter, Users, Clock, ArrowRightLeft } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { CreateShiftModal } from '@/components/create-shift-modal';
import { PendingSwapsModal } from '@/components/pending-swaps-modal';
import { ShiftDetailsModal } from '@/components/shift-details-modal';
import { useShifts } from '@/hooks/use-shifts';

export default function ManagerSchedule() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const { shifts, isLoading, fetchShifts } = useShifts();
  
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftResponse | null>(null);
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);

  const weekStart = React.useMemo(() => 
    startOfWeek(currentDate, { weekStartsOn: 1 }), 
    [currentDate]
  );
  
  const weekDays = React.useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const refreshShifts = React.useCallback(() => {
    if (!selectedLocation) return;
    fetchShifts({
      locationId: selectedLocation,
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
    });
  }, [selectedLocation, weekStart, fetchShifts]);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await api.get('/shifts/stats');
      setPendingSwapsCount(res.data.pendingSwaps);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, skillRes] = await Promise.all([
          api.get('/shifts/locations'),
          api.get('/shifts/skills'),
        ]);
        setLocations(locRes.data);
        setSkills(skillRes.data);
        if (locRes.data.length > 0 && !selectedLocation) {
          setSelectedLocation(locRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    fetchMetadata();
    fetchStats();
  }, [fetchStats, selectedLocation]);

  useEffect(() => {
    refreshShifts();
  }, [refreshShifts]);

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));

  const getSkillName = (id: string) => skills.find((s) => s.id === id)?.name || 'Unknown';

  const onModalSuccess = () => {
    refreshShifts();
    fetchStats();
    setSelectedShift(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Schedule Manager</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {pendingSwapsCount > 0 && (
            <Button 
              variant="outline" 
              className="ml-2 border-primary text-primary hover:bg-primary/10"
              onClick={() => setIsSwapModalOpen(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Review Swaps ({pendingSwapsCount})
            </Button>
          )}

          <Button className="ml-4" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Shift
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
          <Filter className="h-4 w-4" /> Filter by Location:
        </div>
        {locations.map((loc) => (
          <Button
            key={loc.id}
            variant={selectedLocation === loc.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLocation(loc.id)}
            className="whitespace-nowrap"
          >
            {loc.name}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-slate-50/50">
          {weekDays.map((day) => (
            <div key={day.toString()} className="p-3 text-center border-r last:border-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(day, 'EEE')}
              </p>
              <p className={cn(
                "text-lg font-bold mt-0.5",
                isSameDay(day, new Date()) ? "text-primary" : ""
              )}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.startTime.toString()), day));
            return (
              <div key={day.toString()} className="p-2 border-r last:border-0 space-y-3 bg-slate-50/20">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : dayShifts.length > 0 ? (
                  dayShifts.map((shift) => (
                    <Card 
                      key={shift.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group",
                        shift.isPremium ? "border-orange-200 bg-orange-50/30" : "bg-white"
                      )}
                      onClick={() => setSelectedShift(shift)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 h-4">
                            {getSkillName(shift.requiredSkillId).replace('_', ' ')}
                          </Badge>
                          {shift.isPremium && <Badge className="bg-orange-500 hover:bg-orange-600 text-[8px] h-3.5 px-1 uppercase">Premium</Badge>}
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {format(parseISO(shift.startTime.toString()), 'HH:mm')} - {format(parseISO(shift.endTime.toString()), 'HH:mm')}
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {shift.assignments?.length || 0} / {shift.headcountNeeded}
                          </div>
                        </div>

                        {shift.assignments && shift.assignments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {shift.assignments.slice(0, 2).map((a) => (
                              <div key={a.id} className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold border border-white" title={a.user?.firstName}>
                                {a.user?.firstName[0]}{a.user?.lastName[0]}
                              </div>
                            ))}
                            {shift.assignments.length > 2 && (
                              <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-muted-foreground border border-white">
                                +{shift.assignments.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="h-full rounded-lg border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-4 text-center opacity-40">
                    <Plus className="h-4 w-4 mb-1" />
                    <p className="text-[9px] font-medium uppercase tracking-tight">Empty</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CreateShiftModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onModalSuccess}
        locations={locations}
        skills={skills}
        initialDate={currentDate}
      />

      <PendingSwapsModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        onSuccess={onModalSuccess}
      />

      <ShiftDetailsModal
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        shift={selectedShift}
        onSuccess={onModalSuccess}
      />
    </div>
  );
}
