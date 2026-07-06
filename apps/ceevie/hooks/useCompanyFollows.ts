'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CompanyProfile } from '@/lib/companies';
import type { IndustryTemplate } from '@/lib/industryTemplates';

const STORAGE_KEY = 'ceevie-company-follows';
const WORKED_AT_STORAGE_KEY = 'ceevie-company-worked-at';

type CompanyQuery = {
  q?: string;
  industry?: string;
  featured?: boolean;
};

export function useCompanyFollows(accessToken?: string, query: CompanyQuery = {}) {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [industries, setIndustries] = useState<IndustryTemplate[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [workedAtIds, setWorkedAtIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CompanyProfile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [total, setTotal] = useState(0);

  const readLocalFollows = useCallback(() => {
    if (typeof window === 'undefined') return [] as string[];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }, []);

  const writeLocalFollows = useCallback((ids: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const readLocalWorkedAt = useCallback(() => {
    if (typeof window === 'undefined') return [] as string[];
    try {
      const raw = window.localStorage.getItem(WORKED_AT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }, []);

  const writeLocalWorkedAt = useCallback((ids: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORKED_AT_STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setCompanies([]);
      setIndustries([]);
      setCatalog([]);
      setFollowedIds(readLocalFollows());
      setWorkedAtIds(readLocalWorkedAt());
      setLoaded(true);
      return;
    }

    const params = new URLSearchParams();
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.industry?.trim()) params.set('industry', query.industry.trim());
    if (query.featured) params.set('featured', '1');
    const companiesPath = params.toString() ? `/api/companies?${params}` : '/api/companies';

    const [companiesRes, catalogRes, followsRes, workedAtRes, industriesRes] = await Promise.all([
      fetch(companiesPath, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/companies', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/companies/follows', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/companies/worked-at', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/industries', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);

    if (companiesRes.ok) {
      const data = await companiesRes.json();
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    }

    if (catalogRes.ok) {
      const data = await catalogRes.json();
      setCatalog(Array.isArray(data.companies) ? data.companies : []);
    }

    if (industriesRes.ok) {
      const data = await industriesRes.json();
      setIndustries(Array.isArray(data.industries) ? data.industries : []);
    }

    if (followsRes.ok) {
      const data = await followsRes.json();
      const ids = Array.isArray(data.follows)
        ? data.follows
            .map((row: { companyId?: string }) => row.companyId)
            .filter((id: unknown): id is string => typeof id === 'string')
        : [];
      setFollowedIds(ids);
      writeLocalFollows(ids);
    } else {
      setFollowedIds(readLocalFollows());
    }

    if (workedAtRes.ok) {
      const data = await workedAtRes.json();
      const ids = Array.isArray(data.workedAt)
        ? data.workedAt
            .map((row: { companyId?: string }) => row.companyId)
            .filter((id: unknown): id is string => typeof id === 'string')
        : [];
      setWorkedAtIds(ids);
      writeLocalWorkedAt(ids);
    } else {
      setWorkedAtIds(readLocalWorkedAt());
    }

    setLoaded(true);
  }, [
    accessToken,
    query.q,
    query.industry,
    query.featured,
    readLocalFollows,
    readLocalWorkedAt,
    writeLocalFollows,
    writeLocalWorkedAt,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFollow = useCallback(
    async (companyId: string) => {
      const following = followedIds.includes(companyId);
      const next = following ? followedIds.filter((id) => id !== companyId) : [...followedIds, companyId];
      setFollowedIds(next);
      writeLocalFollows(next);

      if (!accessToken) return !following;

      const response = await fetch('/api/companies/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ companyId, follow: !following }),
      });

      if (!response.ok) {
        setFollowedIds(followedIds);
        writeLocalFollows(followedIds);
        return following;
      }

      return !following;
    },
    [accessToken, followedIds, writeLocalFollows]
  );

  const toggleWorkedAt = useCallback(
    async (companyId: string) => {
      const worked = workedAtIds.includes(companyId);
      const next = worked ? workedAtIds.filter((id) => id !== companyId) : [...workedAtIds, companyId];
      setWorkedAtIds(next);
      writeLocalWorkedAt(next);

      if (!accessToken) return !worked;

      const response = await fetch('/api/companies/worked-at', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ companyId, worked: !worked }),
      });

      if (!response.ok) {
        setWorkedAtIds(workedAtIds);
        writeLocalWorkedAt(workedAtIds);
        return worked;
      }

      return !worked;
    },
    [accessToken, workedAtIds, writeLocalWorkedAt]
  );

  const enrichCompany = useCallback(
    async (payload: { name: string; industryId?: string; jobInput?: string }) => {
      if (!accessToken) return null;

      const response = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const company = data.company as CompanyProfile | undefined;
      if (!company) return null;

      setCompanies((prev) => {
        const exists = prev.some((item) => item.id === company.id);
        if (exists) return prev.map((item) => (item.id === company.id ? company : item));
        return [company, ...prev];
      });
      setCatalog((prev) => {
        const exists = prev.some((item) => item.id === company.id);
        if (exists) return prev.map((item) => (item.id === company.id ? company : item));
        return [company, ...prev];
      });

      return company;
    },
    [accessToken]
  );

  const resolveCompany = useCallback(
    (companyId: string) =>
      catalog.find((company) => company.id === companyId) ??
      companies.find((company) => company.id === companyId) ??
      null,
    [catalog, companies]
  );

  const workedAtCompanies = workedAtIds
    .map((id) => resolveCompany(id))
    .filter(Boolean) as CompanyProfile[];

  return {
    companies,
    catalog,
    industries,
    followedIds,
    workedAtIds,
    workedAtCompanies,
    loaded,
    total,
    refresh,
    toggleFollow,
    toggleWorkedAt,
    enrichCompany,
    resolveCompany,
    isFollowing: (companyId: string) => followedIds.includes(companyId),
    isWorkedAt: (companyId: string) => workedAtIds.includes(companyId),
  };
}
