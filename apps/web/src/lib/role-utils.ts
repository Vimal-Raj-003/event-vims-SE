export type AttendeeRole = 'ATTENDEE' | 'SPONSOR' | 'KEY_SPEAKER' | 'KEY_ORGANIZER';

export interface RoleVisuals {
  label: string;
  chipClass: string;
  starClass: string;
}

const ROLE_VISUALS: Record<Exclude<AttendeeRole, 'ATTENDEE'>, RoleVisuals> = {
  SPONSOR: {
    label: 'Sponsor',
    chipClass: 'bg-amber-100 text-amber-800',
    starClass: 'bg-amber-500',
  },
  KEY_SPEAKER: {
    label: 'Key Speaker',
    chipClass: 'bg-indigo-100 text-indigo-800',
    starClass: 'bg-indigo-500',
  },
  KEY_ORGANIZER: {
    label: 'Key Organizer',
    chipClass: 'bg-purple-100 text-purple-800',
    starClass: 'bg-purple-500',
  },
};

export function getRoleVisuals(role: AttendeeRole | undefined | null): RoleVisuals | null {
  if (!role || role === 'ATTENDEE') return null;
  return ROLE_VISUALS[role];
}
