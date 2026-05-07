import type { ReactNode } from 'react';
import { getRoleVisuals, type AttendeeRole } from '@/lib/role-utils';

interface AvatarWithStarProps {
  role: AttendeeRole | undefined | null;
  children: ReactNode; // the avatar element (img or initials div)
}

/** Wraps an avatar element. If the role is non-default, overlays a small star
 * on the bottom-right. Otherwise renders the avatar untouched. */
export function AvatarWithStar({ role, children }: AvatarWithStarProps) {
  const visuals = getRoleVisuals(role);
  if (!visuals) return <>{children}</>;

  return (
    <div className="relative inline-block">
      {children}
      <span
        aria-label={visuals.label}
        title={visuals.label}
        className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white dark:ring-card ${visuals.starClass}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="white"
          className="h-2.5 w-2.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0L5.046 18.02c-.785.57-1.84-.196-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L1.063 9.38c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      </span>
    </div>
  );
}

interface RoleChipProps {
  role: AttendeeRole | undefined | null;
  className?: string;
}

/** Renders a small colored pill with star + label. Returns null for default ATTENDEE role. */
export function RoleChip({ role, className = '' }: RoleChipProps) {
  const visuals = getRoleVisuals(role);
  if (!visuals) return null;

  return (
    <span
      aria-label={visuals.label}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${visuals.chipClass} ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0L5.046 18.02c-.785.57-1.84-.196-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L1.063 9.38c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
      </svg>
      {visuals.label}
    </span>
  );
}
