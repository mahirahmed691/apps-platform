'use client';

type UserAvatarProps = {
  name?: string;
  email?: string | null;
  avatarUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
};

function getInitials(name?: string, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 1).toUpperCase();
}

export function UserAvatar({ name, email, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = size === 'sm' ? 'user-avatar-sm' : 'user-avatar-md';

  if (avatarUrl?.startsWith('https://')) {
    return (
      <img
        className={`user-avatar ${sizeClass} ${className}`.trim()}
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className={`user-avatar user-avatar-fallback ${sizeClass} ${className}`.trim()} aria-hidden="true">
      {getInitials(name, email)}
    </span>
  );
}
