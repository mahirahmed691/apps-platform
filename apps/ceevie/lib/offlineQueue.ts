const QUEUE_KEY = 'ceevie-offline-queue';

export type OfflineQueueItem = {
  id: string;
  text: string;
  createdAt: string;
};

export function readOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAnswer(text: string): OfflineQueueItem[] {
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  const next = [...readOfflineQueue(), item].slice(-20);
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QUEUE_KEY);
}

export function removeOfflineItem(id: string): OfflineQueueItem[] {
  const next = readOfflineQueue().filter((item) => item.id !== id);
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}
