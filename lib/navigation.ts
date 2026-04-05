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
  { href: "/parade-state", label: "Parade State", shortLabel: "Parade", separatorBefore: true },
  { href: "/troop-movement", label: "Troop Movement", shortLabel: "Move" },
  { href: "/announcements", label: "Announcements", shortLabel: "Msgs" },
  { href: "/book-in", label: "Book-In", shortLabel: "Book-In" },
  { href: "/settings", label: "Settings", shortLabel: "Settings" },
] as const;
