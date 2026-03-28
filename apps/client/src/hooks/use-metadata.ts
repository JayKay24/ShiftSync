'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Location, Skill } from '@shiftsync/data-access';

export function useMetadata() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [locRes, skillRes] = await Promise.all([
        api.get('/shifts/locations'),
        api.get('/shifts/skills'),
      ]);
      setLocations(locRes.data);
      setSkills(skillRes.data);
      return { locations: locRes.data, skills: skillRes.data };
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch metadata');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    locations,
    skills,
    isLoading,
    error,
    fetchMetadata
  };
}
