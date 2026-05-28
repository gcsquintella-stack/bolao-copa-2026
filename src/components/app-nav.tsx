"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/ranking", label: "Ranking", icon: Trophy },
];

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : LINKS;
  return (
    <nav className="flex gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
