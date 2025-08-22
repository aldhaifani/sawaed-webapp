"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  // Detect document direction to support RTL thumb movement
  const [isRtl, setIsRtl] = React.useState<boolean>(false);
  React.useEffect(() => {
    const dir =
      typeof document !== "undefined"
        ? (document.documentElement.getAttribute("dir") ?? document.dir)
        : "ltr";
    setIsRtl(dir === "rtl");
  }, []);

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 relative box-content inline-flex h-[1.15rem] w-8 shrink-0 items-center overflow-hidden rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 rounded-full ring-0 transition-all duration-200",
          isRtl
            ? "right-[2px] left-auto data-[state=checked]:right-[calc(100%-1rem-2px)] data-[state=unchecked]:right-[2px]"
            : "right-auto left-[2px] data-[state=checked]:left-[calc(100%-1rem-2px)] data-[state=unchecked]:left-[2px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
