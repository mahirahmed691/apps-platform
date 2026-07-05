'use client';

import { useCallback, useEffect, useState } from 'react';

export type UsageInfo = {
  plan: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  canGenerate: boolean;
};

export function useUsage(accessToken: string | undefined) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;

    const response = await fetch('/api/usage', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return;
    const data = await response.json();
    setUsage(data);
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upgrade = useCallback(async () => {
    if (!accessToken || upgrading) return;

    setUpgrading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/?upgraded=1`,
          cancelUrl: window.location.href,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setUpgrading(false);
    }
  }, [accessToken, upgrading]);

  return { usage, refresh, upgrade, upgrading };
}
