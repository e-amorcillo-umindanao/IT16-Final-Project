import * as React from "react"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLProgressElement,
  React.ComponentPropsWithoutRef<"progress">
>(({ className, max = 100, value = 0, ...props }, ref) => (
  <progress
    ref={ref}
    max={max}
    value={typeof value === "number" ? value : 0}
    className={cn(
      "secure-progress block h-2 w-full overflow-hidden rounded-full appearance-none border-none bg-primary/20",
      className
    )}
    {...props}
  />
))
Progress.displayName = "Progress"

export { Progress }
