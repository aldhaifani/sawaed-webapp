"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { type ReactElement } from "react";

export default function SuperAdminPage(): ReactElement {
  return (
    <RoleGuard allow={["SUPER_ADMIN"]}>
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-3xl font-bold">Super Admin</h1>
      </main>
    </RoleGuard>
  );
}
