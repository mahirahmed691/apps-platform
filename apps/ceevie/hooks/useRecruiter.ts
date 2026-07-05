'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicRoleBrief } from '@/lib/roleBrief';

export type RecruiterInfo = {
  accountType: 'candidate' | 'recruiter';
  isRecruiter: boolean;
  email: string | null;
  fullName: string | null;
};

export type BriefSummary = {
  id: string;
  title: string;
  company: string;
  status: 'draft' | 'active' | 'closed';
  inviteUrl: string;
  redemptionCount: number;
  completedCount: number;
  approvedCount: number;
  createdAt: string;
  updatedAt: string;
};

export function useRecruiter(accessToken: string | undefined) {
  const [info, setInfo] = useState<RecruiterInfo | null>(null);
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const meResponse = await fetch('/api/recruiter/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meResponse.ok) {
        setError('Failed to load recruiter profile');
        return;
      }

      const meData = await meResponse.json();
      setInfo({
        accountType: meData.accountType,
        isRecruiter: Boolean(meData.isRecruiter),
        email: meData.email ?? null,
        fullName: meData.fullName ?? null,
      });

      if (meData.isRecruiter) {
        const briefsResponse = await fetch('/api/recruiter/briefs', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (briefsResponse.ok) {
          const briefsData = await briefsResponse.json();
          setBriefs(briefsData.briefs ?? []);
        }
      } else {
        setBriefs([]);
      }
    } catch {
      setError('Something went wrong loading recruiter data');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const activate = useCallback(async () => {
    if (!accessToken) return false;
    setActivating(true);
    setError(null);

    try {
      const response = await fetch('/api/recruiter/activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        setError('Could not activate recruiter account');
        return false;
      }

      await load();
      return true;
    } catch {
      setError('Could not activate recruiter account');
      return false;
    } finally {
      setActivating(false);
    }
  }, [accessToken, load]);

  return { info, briefs, loading, activating, error, activate, refresh: load };
}

export function useRoleBrief(accessToken: string | undefined) {
  const [activeBrief, setActiveBrief] = useState<PublicRoleBrief | null>(null);

  const loadFromDraft = useCallback(async () => {
    if (!accessToken) return null;

    const response = await fetch('/api/cv/draft', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    const data = await response.json();
    const brief = data.draft?.activeBrief ?? null;
    setActiveBrief(brief);
    return brief as PublicRoleBrief | null;
  }, [accessToken]);

  return { activeBrief, setActiveBrief, loadFromDraft };
}
