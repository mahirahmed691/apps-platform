'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_USER_PROFILE, normalizeUserProfile, type UserProfile } from '@/lib/userProfile';

export type ProfileSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useUserProfile(accessToken: string | undefined) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [saveStatus, setSaveStatus] = useState<ProfileSaveStatus>('idle');
  const [loaded, setLoaded] = useState(false);

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!accessToken) return null;

    const response = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.profile) return null;

    const profile = normalizeUserProfile(data.profile as UserProfile);
    setProfile(profile);
    setLoaded(true);
    return profile;
  }, [accessToken]);

  const saveProfile = useCallback(
    async (next: UserProfile): Promise<boolean> => {
      if (!accessToken) return false;

      setSaveStatus('saving');
      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(next),
        });

        if (!response.ok) {
          setSaveStatus('error');
          return false;
        }

        const data = await response.json();
        setProfile(normalizeUserProfile(data.profile));
        setSaveStatus('saved');
        return true;
      } catch {
        setSaveStatus('error');
        return false;
      }
    },
    [accessToken]
  );

  const patchProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const next = { ...profile, ...patch };
      setProfile(next);
      return saveProfile(next);
    },
    [profile, saveProfile]
  );

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadProfile().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, loadProfile]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = window.setTimeout(() => setSaveStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  return {
    profile,
    loading,
    loaded,
    saveStatus,
    loadProfile,
    saveProfile,
    patchProfile,
    setProfile,
  };
}
