"use client";

import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { type ReactElement, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDashboardPathForRole } from "@/lib/rbac";

export default function HomePage(): ReactElement {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const me = useQuery(api.rbac.currentUser);

  const handleLogout = async (): Promise<void> => {
    await signOut();
    router.push("/auth");
  };

  useEffect(() => {
    if (me === undefined) return; // loading
    if (me === null) return; // unauthenticated; show marketing/home
    if (me.isDeleted || me.isBlocked) {
      void signOut();
      router.replace("/auth");
      return;
    }
    router.replace(getDashboardPathForRole(me.role));
  }, [me, router, signOut]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          Sawaed
        </h1>
        <Button onClick={handleLogout} variant="secondary">
          Logout
        </Button>
      </div>
    </main>
  );
}
