export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  separatorBefore?: boolean;
};

export const NAV_ITEMS: readonly NavigationItem[] = [
  { href: "/cwc/dashboard", label: "Dashboard", shortLabel: "Home" },
  { href: "/cwc/cadets", label: "Cadets", shortLabel: "Cadets" },
  { href: "/cwc/records", label: "Records", shortLabel: "Records" },
  { href: "/cwc/appointments", label: "Appointments", shortLabel: "Appts" },
  { href: "/cwc/duty-instructors", label: "Duty Instructor", shortLabel: "DI" },
  { href: "/cwc/bunks", label: "Bunks", shortLabel: "Bunks", separatorBefore: true },
  { href: "/cwc/parade-state", label: "Parade State", shortLabel: "Parade" },
  { href: "/cwc/troop-movement", label: "Troop Movement", shortLabel: "Move" },
  { href: "/cwc/night-study", label: "Night Study", shortLabel: "Study" },
  { href: "/cwc/announcements", label: "Announcements", shortLabel: "Msgs" },
  { href: "/cwc/current-affairs", label: "Current Affairs", shortLabel: "Current" },
  { href: "/cwc/book-in", label: "Book-In", shortLabel: "Book-In" },
  { href: "/cwc/settings", label: "Settings", shortLabel: "Settings" },
  { href: "/cwc/instructors", label: "Instructors", shortLabel: "Instr", separatorBefore: true },
] as const;
