import Link from "next/link";
import { Activity, CalendarDays, ClipboardList, UserRound } from "lucide-react";

const navItems = [
  { href: "/today", label: "Today", icon: Activity },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/logs", label: "Logs", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function AppNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              aria-label={item.label}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
