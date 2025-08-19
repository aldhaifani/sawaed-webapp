"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [isRtl, setIsRtl] = React.useState(false);

  React.useEffect(() => {
    if (!rootRef.current) return;
    const node = rootRef.current;
    const update = () => {
      const rtl = !!node.closest('[dir="rtl"]');
      setIsRtl(rtl);
    };
    update();
    // Observe attribute changes up the tree in case dir changes at runtime
    const observer = new MutationObserver(update);
    let root: HTMLElement | null = node;
    const observed: HTMLElement[] = [];
    while (root) {
      observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
      observed.push(root);
      root = root.parentElement;
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      ref={rootRef}
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{
          transform: isRtl
            ? `translateX(${100 - (value ?? 0)}%)`
            : `translateX(-${100 - (value ?? 0)}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
