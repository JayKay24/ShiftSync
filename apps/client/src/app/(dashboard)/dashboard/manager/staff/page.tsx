'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, ShieldCheck, MapPin, Briefcase, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffProfileModal } from '@/components/staff-profile-modal';
import { StaffMemberResponse } from '@shiftsync/data-access';
import { useStaff } from '@/hooks/use-staff';

export default function StaffManagement() {
  const { staffList, isLoading, fetchStaff } = useStaff();
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberResponse | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openProfile = (member: StaffMemberResponse) => {
    setSelectedStaff(member);
    setIsProfileModalOpen(true);
  };

  if (isLoading && staffList.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {staffList.map((person) => (
          <Card key={person.id} className="overflow-hidden transition-all hover:shadow-md border-slate-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                    {person.firstName[0]}{person.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {person.firstName} {person.lastName}
                    </CardTitle>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {person.email}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-primary/70">
                        <Globe className="h-2.5 w-2.5" />
                        {person.timezone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Briefcase className="h-3 w-3" /> Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {person.staffSkills.length > 0 ? person.staffSkills.map(({ skill }) => (
                    <Badge key={skill.id} variant="secondary" className="px-2 py-0 font-medium">
                      {skill.name.replace('_', ' ')}
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground italic">No skills listed</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <MapPin className="h-3 w-3" /> Certifications
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {person.staffCertifications.length > 0 ? person.staffCertifications.map(({ location }) => (
                    <Badge key={location.id} variant="outline" className="px-2 py-0 flex items-center gap-1 border-primary/20 text-primary font-medium">
                      <ShieldCheck className="h-3 w-3" />
                      {location.name.split(' - ')[1] || location.name}
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground italic">No location certifications</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="text-xs text-muted-foreground">
                  Target: <span className="font-bold text-foreground">{person.desiredWeeklyHours || 40}h/week</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => openProfile(person)}
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staffList.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-20 text-center bg-slate-50/50">
          <User className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">No staff members found</h3>
          <p className="text-sm text-muted-foreground">Start by adding your first team member.</p>
        </div>
      )}

      <StaffProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        staff={selectedStaff}
      />
    </div>
  );
}
