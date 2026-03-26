import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-neutral-300 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-primary min-h-[48px]",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
