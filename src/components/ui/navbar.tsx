"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useMemo, type ReactElement } from "react";
import { Menu } from "lucide-react";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import UserAccountAvatar from "@/components/ui/UserAccountAvatar";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Role } from "@/shared/rbac";

interface NavbarProps {
  readonly role: Role;
}

/**
 * Navbar
 * Role-aware responsive navigation for desktop and mobile.
 * Hides automatically on auth and onboarding routes.
 */
export function Navbar({ role }: NavbarProps): ReactElement | null {
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const t = useTranslations("nav");
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<boolean>(false);
  const me = useQuery(api.rbac.currentUser);
  const avatarSrc = me?.pictureUrl ?? me?.avatarUrl;

  // Hide on auth and onboarding pages
  const hidden = useMemo(() => {
    return pathname.includes("/auth") || pathname.includes("/onboarding");
  }, [pathname]);

  const links = useMemo(() => {
    if (role === "YOUTH") {
      return [
        { href: `/${locale}/dashboard`, label: t("dashboard") },
        { href: `/${locale}/opportunities`, label: t("opportunities") },
      ];
    }
    if (role === "ADMIN") {
      return [
        { href: `/${locale}/a`, label: t("dashboard") },
        { href: `/${locale}/a/opportunities`, label: t("opportunities") },
      ];
    }
    return [{ href: `/${locale}/sa`, label: t("dashboard") }];
  }, [role, locale, t]);

  if (hidden) return null;

  return (
    <header className="bg-card text-card-foreground sticky top-0 z-50 w-full border-b">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        {/* Left group: Logo (desktop) */}
        <div className="flex items-center gap-6">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={36} height={36} />
          </Link>
        </div>
        {/* Middle group: Menu (desktop) */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {l.label}
            </Link>
          ))}
        </div>
        {/* Right group: Switcher + Avatar (desktop) + Hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 md:flex">
            <LanguageSwitcher />
            <UserAccountAvatar
              className="p-0.5"
              avatarUrl={avatarSrc}
              role={role}
            />
          </div>
          <div className="flex items-center md:hidden">
            <button
              type="button"
              aria-label={t("openMenu", { defaultMessage: "Open menu" })}
              className="text-foreground"
              onClick={() => setOpen((v) => !v)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile drawer */}
      {open && (
        <div className="bg-card text-card-foreground border-t p-3 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground text-sm"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between">
              <LanguageSwitcher />
              <UserAccountAvatar
                className="p-0.5"
                avatarUrl={avatarSrc}
                role={role}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
