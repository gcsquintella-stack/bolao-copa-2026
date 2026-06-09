"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Globe,
  Sparkles,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/copa", label: "Copa", icon: Globe },
  { href: "/bonus", label: "Bônus", icon: Sparkles },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/regras", label: "Regras", icon: BookOpen },
];

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : LINKS;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
