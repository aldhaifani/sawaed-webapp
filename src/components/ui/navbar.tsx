"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Role } from "@/shared/rbac";
import UserAccountAvatar from "@/components/ui/UserAccountAvatar";
import ThemeToggleButton from "@/components/ui/theme-toggle-button";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

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
  const [hovered, setHovered] = useState<number | null>(null);
  const me = useQuery(api.rbac.currentUser);
  const avatarSrc = me?.pictureUrl ?? me?.avatarUrl;

  // Hide on auth and onboarding pages
  const hidden = useMemo(() => {
    return pathname.includes("/auth") || pathname.includes("/onboarding");
  }, [pathname]);

  // Auto-close mobile drawer whenever route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = useMemo(() => {
    if (role === "YOUTH") {
      return [
        { href: `/${locale}/dashboard`, label: t("dashboard") },
        { href: `/${locale}/opportunities`, label: t("opportunities") },
        { href: `/${locale}/learning`, label: t("learning") },
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
    <header className="border-border/30 bg-background/70 supports-[backdrop-filter]:bg-background/70 sticky inset-x-0 top-0 z-50 w-full border-b backdrop-blur">
      {/* Desktop / large screens */}
      <div className="relative z-[60] mx-auto hidden w-full max-w-7xl items-center justify-between rounded-full px-4 py-2 lg:flex">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={36} height={36} />
          </Link>
        </div>
        {/* Center: Links with animated pill */}
        <nav
          className="relative flex flex-1 items-center justify-center"
          onMouseLeave={() => setHovered(null)}
        >
          <div className="relative flex items-center gap-2 text-sm font-medium">
            {links.map((l, idx) => {
              const active =
                pathname === l.href || pathname.startsWith(`${l.href}/`);
              const showPill = active || hovered === idx;
              return (
                <div key={l.href} className="relative">
                  {showPill && (
                    <motion.span
                      layoutId="nav-pill"
                      className="bg-muted/80 absolute inset-x-0 -inset-y-1 z-0 rounded-full dark:bg-neutral-800"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative z-10 rounded-full px-3 py-3 transition-colors ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onMouseEnter={() => setHovered(idx)}
                  >
                    {l.label}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
        {/* Right: Theme + Avatar */}
        <div className="hidden items-center gap-4 lg:flex">
          <ThemeToggleButton />
          <UserAccountAvatar
            className="p-0.5"
            avatarUrl={avatarSrc}
            role={role}
          />
        </div>
      </div>

      {/* Mobile */}
      <div className="relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between px-0 py-2 lg:hidden">
        <div className="flex w-full flex-row items-center justify-between px-2">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} />
          </Link>
          <button
            type="button"
            aria-label={t("openMenu", { defaultMessage: "Open menu" })}
            onClick={() => setOpen((v) => !v)}
            className="p-2"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-background mt-2 flex w-full flex-col items-start justify-start gap-3 rounded-lg px-4 py-4 shadow"
            >
              {links.map((l) => {
                const active =
                  pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`text-sm ${active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <div className="mt-2 flex w-full items-center justify-between">
                <UserAccountAvatar
                  className="p-0.5"
                  avatarUrl={avatarSrc}
                  role={role}
                />
                <ThemeToggleButton />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
