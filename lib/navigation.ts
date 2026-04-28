export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  separatorBefore?: boolean;
};

export const NAV_ITEMS: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home" },
  { href: "/cadets", label: "Cadets", shortLabel: "Cadets" },
  { href: "/records", label: "Records", shortLabel: "Records" },
  { href: "/appointments", label: "Appointments", shortLabel: "Appts" },
  { href: "/duty-instructors", label: "Duty Instructor", shortLabel: "DI" },
  { href: "/bunks", label: "Bunks", shortLabel: "Bunks", separatorBefore: true },
  { href: "/parade-state", label: "Parade State", shortLabel: "Parade" },
  { href: "/troop-movement", label: "Troop Movement", shortLabel: "Move" },
  { href: "/night-study", label: "Night Study", shortLabel: "Study" },
  { href: "/announcements", label: "Announcements", shortLabel: "Msgs" },
  { href: "/current-affairs", label: "Current Affairs", shortLabel: "Current" },
  { href: "/book-in", label: "Book-In", shortLabel: "Book-In" },
  { href: "/settings", label: "Settings", shortLabel: "Settings" },
  { href: "/instructors", label: "Instructors", shortLabel: "Instr", separatorBefore: true },
] as const;
