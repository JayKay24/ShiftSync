'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
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
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: { id: string; name: string }[];
  skills: { id: string; name: string }[];
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
    locationId: locations[0]?.id || '',
    requiredSkillId: skills[0]?.id || '',
    date: format(initialDate || new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    headcountNeeded: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      await api.post('/shifts', {
        locationId: formData.locationId,
        requiredSkillId: formData.requiredSkillId,
        startTime,
        endTime,
        headcountNeeded: Number(formData.headcountNeeded),
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
