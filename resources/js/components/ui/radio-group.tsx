import * as React from "react"
import { Radio, RadioGroup as HeadlessRadioGroup } from "@headlessui/react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof HeadlessRadioGroup>,
  React.ComponentPropsWithoutRef<typeof HeadlessRadioGroup>
>(({ className, ...props }, ref) => (
  <HeadlessRadioGroup ref={ref} className={cn("grid gap-2", className)} {...props} />
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof Radio>,
  React.ComponentPropsWithoutRef<typeof Radio>
>(({ className, ...props }, ref) => (
  <Radio
    ref={ref}
    className={cn(
      "grid h-4 w-4 shrink-0 place-content-center rounded-full border border-primary",
      "data-[checked]:bg-primary data-[checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <span className="h-2 w-2 rounded-full bg-current" />
  </Radio>
))
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
