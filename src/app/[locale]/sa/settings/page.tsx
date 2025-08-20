"use client";

import type { FormEvent, ReactElement } from "react";
import { useLocale } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BasicDropdown from "@/components/ui/BasicDropdown";
import { Save, X, LockKeyhole, Bell, Globe2, User2 } from "lucide-react";

export default function SuperAdminSettingsPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";

  // Account
  const [name, setName] = useState<string>("Ahmed Al-Harthy");
  const [email, setEmail] = useState<string>("ahmed.alharthy@mcsy.gov.om");
  const [phone, setPhone] = useState<string>("+968 9123 4567");
  const [employeeId, setEmployeeId] = useState<string>("MCSY-SA-0001");

  // Security (dummy)
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Notifications & Preferences
  const [emailNotif, setEmailNotif] = useState<boolean>(true);
  const [smsNotif, setSmsNotif] = useState<boolean>(false);
  const [uiLanguage, setUiLanguage] = useState<"English" | "Arabic">("English");

  function handleSave(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Demo only: no-op. Could show a toast.
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Super Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your account details, security, and preferences.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Account */}
          <section className="bg-card rounded-2xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <User2 className="text-muted-foreground size-5" />
              <h2 className="text-foreground text-base font-semibold">
                Account
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Security (dummy inputs) */}
          <section className="bg-card rounded-2xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <LockKeyhole className="text-muted-foreground size-5" />
              <h2 className="text-foreground text-base font-semibold">
                Security
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              For demo purposes, these fields are not functional.
            </p>
          </section>

          {/* Notifications */}
          <section className="bg-card rounded-2xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="text-muted-foreground size-5" />
              <h2 className="text-foreground text-base font-semibold">
                Notifications
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                />
                <span className="text-foreground">Email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={smsNotif}
                  onChange={(e) => setSmsNotif(e.target.checked)}
                />
                <span className="text-foreground">SMS notifications</span>
              </label>
              <p className="text-muted-foreground text-xs">
                Notification preferences are not saved in this demo.
              </p>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-card rounded-2xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe2 className="text-muted-foreground size-5" />
              <h2 className="text-foreground text-base font-semibold">
                Preferences
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:max-w-sm">
              <div>
                <Label>UI Language</Label>
                <BasicDropdown
                  label={uiLanguage}
                  items={[
                    { id: "English", label: "English" },
                    { id: "Arabic", label: "Arabic" },
                  ]}
                  onChange={(it) =>
                    setUiLanguage(it.id as "English" | "Arabic")
                  }
                />
                <p className="text-muted-foreground mt-2 text-xs">
                  Changing language here does not switch locales in this demo.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link
                href={`/${locale}/sa`}
                className="inline-flex items-center gap-2"
              >
                <X className="size-4" /> Cancel
              </Link>
            </Button>
            <Button type="submit" className="inline-flex items-center gap-2">
              <Save className="size-4" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
