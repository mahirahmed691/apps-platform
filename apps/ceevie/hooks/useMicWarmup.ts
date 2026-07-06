'use client';

import { useEffect, useRef } from 'react';
import type { UserProfile } from '@/lib/userProfile';
import { studioSetupComplete } from '@/lib/userProfile';
import { readMicGrantedLocally } from '@/lib/micAccess';

type MicWarmupTarget = {
  configLoaded?: boolean;
  warmMic?: () => Promise<boolean>;
};

type UseMicWarmupOptions = {
  profile?: UserProfile;
  profileLoaded?: boolean;
  enabled?: boolean;
  voice: MicWarmupTarget;
};

export function shouldWarmMicOnLogin(profile: UserProfile | undefined, profileLoaded: boolean): boolean {
  if (!profileLoaded || !profile) return false;
  return studioSetupComplete(profile) || readMicGrantedLocally();
}

export function useMicWarmup({ profile, profileLoaded = false, enabled = true, voice }: UseMicWarmupOptions) {
  const warmedRef = useRef(false);

  useEffect(() => {
    warmedRef.current = false;
  }, [profile?.studioSetupCompletedAt]);

  useEffect(() => {
    if (!enabled || !profileLoaded || !voice.configLoaded || !voice.warmMic) return;
    if (!shouldWarmMicOnLogin(profile, profileLoaded)) return;
    if (warmedRef.current) return;

    warmedRef.current = true;
    void voice.warmMic();
  }, [enabled, profile, profileLoaded, profile?.studioSetupCompletedAt, voice.configLoaded, voice.warmMic]);
}
