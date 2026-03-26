'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ChevronLeft, ChevronRight, Filter, Users, MapPin, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { CreateShiftModal } from '@/components/create-shift-modal';

interface Location {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface Assignment {
  id: string;
  user: User;
}

interface Shift {
  id: string;
  locationId: string;
  requiredSkillId: string;
  startTime: string;
  endTime: string;
  headcountNeeded: number;
  status: string;
  isPremium: boolean;
  assignments?: Assignment[];
}

export default function ManagerSchedule() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const weekStart = React.useMemo(() => 
    startOfWeek(currentDate, { weekStartsOn: 1 }), 
    [currentDate]
  );
  
  const weekDays = React.useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchShifts = React.useCallback(async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    try {
      const res = await api.get('/shifts', {
        params: {
          locationId: selectedLocation,
          startDate: weekStart.toISOString(),
          endDate: addDays(weekStart, 7).toISOString(),
        },
      });
      setShifts(res.data);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, weekStart]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, skillRes] = await Promise.all([
          api.get('/shifts/locations'),
          api.get('/shifts/skills'),
        ]);
        setLocations(locRes.data);
        setSkills(skillRes.data);
        if (locRes.data.length > 0) {
          setSelectedLocation(locRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));

  const getSkillName = (id: string) => skills.find((s) => s.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Schedule Manager</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="ml-4" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Shift
          </Button>
        </div>
      </div>

      <CreateShiftModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchShifts}
        locations={locations}
        skills={skills}
        initialDate={currentDate}
      />

      <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.startTime), day));
            return (
              <div key={day.toString()} className="flex flex-col gap-3">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-h-[400px] rounded-lg bg-slate-100/50 p-2">
                  {dayShifts.length > 0 ? (
                    dayShifts.map((shift) => (
                      <Card key={shift.id} className="cursor-pointer transition-shadow hover:shadow-md">
                        <CardHeader className="p-3 pb-0">
                          <div className="flex items-start justify-between gap-1">
                            <Badge variant={shift.isPremium ? "warning" : "secondary"} className="text-[10px] uppercase">
                              {getSkillName(shift.requiredSkillId)}
                              {shift.isPremium && " + Premium"}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {shift.assignments?.length || 0}/{shift.headcountNeeded}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-2">
                          <div className="flex items-center gap-1 text-xs font-semibold">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            {shift.assignments?.map((asgn) => (
                              <div key={asgn.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span className="truncate">{asgn.user.firstName} {asgn.user.lastName}</span>
                              </div>
                            ))}
                            {(shift.assignments?.length || 0) < shift.headcountNeeded && (
                              <div className="text-[10px] italic text-rose-500">
                                Unfilled
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[11px] text-muted-foreground">
                      No shifts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
