import * as React from "react"
import { Popover as HeadlessPopover, PopoverButton, PopoverPanel } from "@headlessui/react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const Popover = HeadlessPopover

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverButton>,
  React.ComponentPropsWithoutRef<typeof PopoverButton> & {
    asChild?: boolean
  }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <PopoverButton as={Comp} ref={ref} className={className} {...props} />
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPanel>,
  React.ComponentPropsWithoutRef<typeof PopoverPanel> & {
    align?: "start" | "center" | "end"
  }
>(({ className, align = "center", ...props }, ref) => (
  <PopoverPanel
    ref={ref}
    anchor={{
      to:
        align === "start"
          ? "bottom start"
          : align === "end"
            ? "bottom end"
            : "bottom",
      gap: 8,
    }}
    transition
    className={cn(
      "z-50 w-80 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-none outline-none transition duration-200 ease-out",
      "data-[closed]:scale-95 data-[closed]:opacity-0",
      className
    )}
    {...props}
  />
))
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
