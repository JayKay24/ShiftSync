'use client';

import React, { useState, useEffect } from 'react';
import { shiftsApi } from '@/lib/api';
import { Location, Skill } from '@shiftsync/data-access';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Star } from 'lucide-react';
import { format } from 'date-fns';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: Location[];
  skills: Skill[];
  initialDate?: Date;
}

export function CreateShiftModal({
  isOpen,
  onClose,
  onSuccess,
  locations,
  skills,
  initialDate,
}: CreateShiftModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    requiredSkillId: '',
    date: format(initialDate || new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    headcountNeeded: 1,
    isPremium: false,
  });

  // Update default selections once metadata loads
  useEffect(() => {
    if (!formData.locationId && locations.length > 0) {
      setFormData(prev => ({ ...prev, locationId: locations[0].id }));
    }
    if (!formData.requiredSkillId && skills.length > 0) {
      setFormData(prev => ({ ...prev, requiredSkillId: skills[0].id }));
    }
  }, [locations, skills, formData.locationId, formData.requiredSkillId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      await shiftsApi.createShift({
        locationId: formData.locationId,
        requiredSkillId: formData.requiredSkillId,
        startTime,
        endTime,
        headcountNeeded: Number(formData.headcountNeeded),
        isPremium: formData.isPremium,
        status: 'published',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create shift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <select
              id="location"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skill">Required Skill</Label>
            <select
              id="skill"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.requiredSkillId}
              onChange={(e) => setFormData({ ...formData, requiredSkillId: e.target.value })}
              required
            >
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <input 
              type="checkbox" 
              id="premium" 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={formData.isPremium}
              onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
            />
            <Label htmlFor="premium" className="flex items-center gap-1.5 cursor-pointer">
              <Star className={`h-3.5 w-3.5 ${formData.isPremium ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
              Mark as Premium Shift
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="headcount">Headcount Needed</Label>
            <Input
              id="headcount"
              type="number"
              min="1"
              value={formData.headcountNeeded}
              onChange={(e) => setFormData({ ...formData, headcountNeeded: Number(e.target.value) })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full" data-testid="submit-shift-button">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Publish Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
