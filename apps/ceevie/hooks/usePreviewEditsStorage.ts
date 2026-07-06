'use client';

import { useEffect } from 'react';
import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';

const STORAGE_PREFIX = 'ceevie-preview-edits';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readPreviewEdits(userId: string): Partial<Record<PreviewSectionKey, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<PreviewSectionKey, string>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writePreviewEdits(userId: string, edits: Partial<Record<PreviewSectionKey, string>>): void {
  if (typeof window === 'undefined') return;
  const hasContent = Object.values(edits).some((value) => value?.trim());
  if (!hasContent) {
    window.localStorage.removeItem(storageKey(userId));
    return;
  }
  window.localStorage.setItem(storageKey(userId), JSON.stringify(edits));
}

export function clearPreviewEdits(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(userId));
}

export function usePersistPreviewEdits(
  userId: string | undefined,
  previewEdits: Partial<Record<PreviewSectionKey, string>>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !userId) return;
    writePreviewEdits(userId, previewEdits);
  }, [enabled, userId, previewEdits]);
}
