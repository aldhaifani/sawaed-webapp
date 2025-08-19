"use client";

import { useCallback, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { LogOut, Settings, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";

export interface UserData {
  name: string;
  email: string;
  avatar: string;
}

export interface UserAccountAvatarProps {
  user?: UserData;
  avatarUrl?: string;
  className?: string;
}

const initialUserData: UserData = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "👤",
};

export default function UserAccountAvatar({
  user = initialUserData,
  avatarUrl,
  className = "",
}: UserAccountAvatarProps) {
  const [userData] = useState<UserData>(user);
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const t = useTranslations("userMenu");
  const router = useRouter();
  const { signOut } = useAuthActions();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`bg-background flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border ${className}`}
        >
          {(() => {
            const src: string = avatarUrl ?? userData.avatar;
            const isImage =
              typeof src === "string" && /^(https?:|data:|\/)/.test(src);
            if (isImage) {
              return (
                <Image
                  src={src}
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              );
            }
            return (
              <div className="text-foreground flex h-8 w-8 items-center justify-center">
                <span aria-hidden>👤</span>
              </div>
            );
          })()}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-background w-48 overflow-hidden rounded-lg border text-sm shadow-lg"
          sideOffset={5}
        >
          <div className="flex flex-col p-2">
            <button
              className="hover:bg-smooth-200 rounded-sm p-2 text-start"
              onClick={() => router.push(`/${locale}/profile`)}
            >
              <User size={16} className="mr-2 inline" />{" "}
              {t("profile", { defaultMessage: "Profile" })}
            </button>
            <button
              className="hover:bg-smooth-200 rounded-sm p-2 text-start"
              onClick={() => router.push(`/${locale}/settings`)}
            >
              <Settings size={16} className="mr-2 inline" />{" "}
              {t("settings", { defaultMessage: "Settings" })}
            </button>
            <button
              className="hover:bg-smooth-200 rounded-sm p-2 text-start"
              onClick={useCallback(async () => {
                await signOut();
              }, [signOut])}
            >
              <LogOut size={16} className="mr-2 inline" />{" "}
              {t("logout", { defaultMessage: "Logout" })}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
