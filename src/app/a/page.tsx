"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { type ReactElement } from "react";

export default function AdminPage(): ReactElement {
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-3xl font-bold">Admin</h1>
      </main>
    </RoleGuard>
  );
}
