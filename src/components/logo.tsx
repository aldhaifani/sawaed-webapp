"use client";

import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";

/**
 * LogoIcon renders the project logo from `/public/logo.svg`.
 */
export const LogoIcon: FC<{ href?: string; className?: string }> = ({
  href = "/",
  className,
}) => {
  return (
    <Link href={href} aria-label="Home" className={className}>
      <Image src="/logo.svg" alt="Sawaed" width={40} height={40} priority />
    </Link>
  );
};
