export const MIC_GRANTED_STORAGE_KEY = 'ceevie-mic-granted';

export type MicPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function canRequestMic(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function readMicGrantedLocally(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MIC_GRANTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMicGrantedLocally(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (granted) window.localStorage.setItem(MIC_GRANTED_STORAGE_KEY, '1');
    else window.localStorage.removeItem(MIC_GRANTED_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function queryMicPermission(): Promise<MicPermissionState> {
  if (!canRequestMic()) return 'unsupported';

  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const status = await permissions.query({ name: 'microphone' as PermissionName });
      return status.state as MicPermissionState;
    }
  } catch {
    /* Safari and some embedded browsers omit Permissions API for mic */
  }

  return readMicGrantedLocally() ? 'granted' : 'prompt';
}

export function isLiveAudioStream(stream: MediaStream | null | undefined): boolean {
  return Boolean(stream?.getAudioTracks().some((track) => track.readyState === 'live'));
}

export async function acquireMicStream(existing?: MediaStream | null): Promise<MediaStream | null> {
  if (!canRequestMic()) return null;
  if (isLiveAudioStream(existing)) return existing!;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    writeMicGrantedLocally(true);
    return stream;
  } catch {
    writeMicGrantedLocally(false);
    return null;
  }
}

export function releaseMicStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
