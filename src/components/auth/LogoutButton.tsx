"use client";

import { type ReactElement, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

/**
 * LogoutButton renders a Shadcn button that signs the current user out using Convex Auth.
 */
export function LogoutButton(): ReactElement {
  const { signOut } = useAuthActions();
  const handleClick = useCallback(async (): Promise<void> => {
    await signOut();
  }, [signOut]);
  return (
    <Button variant="destructive" onClick={handleClick}>
      Logout
    </Button>
  );
}
