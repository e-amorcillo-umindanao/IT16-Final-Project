import { CircleAlert, CircleCheckBig, Info, Loader2, TriangleAlert, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      closeButton
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckBig className="h-[18px] w-[18px]" strokeWidth={2} />,
        info: <Info className="h-[18px] w-[18px]" strokeWidth={2} />,
        warning: <TriangleAlert className="h-[18px] w-[18px]" strokeWidth={2} />,
        error: <CircleAlert className="h-[18px] w-[18px]" strokeWidth={2} />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />,
        close: <X className="block h-[13px] w-[13px]" strokeWidth={1.75} />,
      }}
      toastOptions={{
        style: {
          width: "auto",
          minWidth: "0",
          maxWidth: "min(360px, calc(100vw - 32px))",
        },
        classNames: {
          toast:
            "group toast pointer-events-auto !flex !items-center !gap-0 !rounded-[18px] !border !border-white/18 !bg-[#2f2e2c] !px-6 !py-4 !text-[#f5f4f1] !shadow-none",
          title: "!text-[15px] !font-medium !leading-tight !text-[#f5f4f1]",
          description: "!mt-1 !text-sm !leading-5 !text-[#c7c4bd]",
          content: "!order-2 !flex-1 !gap-0 !pr-0",
          icon: "!order-1 !mr-3 !ml-0 !h-[18px] !w-[18px] !text-[#f5f4f1] [&_svg]:!h-[18px] [&_svg]:!w-[18px]",
          success: "!border-white/18 !bg-[#2f2e2c] !text-[#f5f4f1] [&_[data-icon]]:!text-[#f5f4f1]",
          error: "!border-white/18 !bg-[#2f2e2c] !text-[#f5f4f1] [&_[data-icon]]:!text-[#f5f4f1]",
          info: "!border-white/18 !bg-[#2f2e2c] !text-[#f5f4f1] [&_[data-icon]]:!text-[#f5f4f1]",
          warning: "!border-white/18 !bg-[#2f2e2c] !text-[#f5f4f1] [&_[data-icon]]:!text-[#f5f4f1]",
          loading: "!border-white/18 !bg-[#2f2e2c] !text-[#f5f4f1] [&_[data-icon]]:!text-[#f5f4f1]",
          actionButton:
            "!rounded-lg !bg-zinc-100 !text-zinc-900 hover:!bg-zinc-200",
          cancelButton:
            "!rounded-lg !bg-zinc-700 !text-zinc-100 hover:!bg-zinc-600",
          closeButton:
            "!static !relative !top-px !order-3 !my-auto !ml-4 !mr-0 !flex !h-[18px] !w-[18px] !shrink-0 !self-center !translate-x-0 !translate-y-0 !items-center !justify-center !rounded-none !border-0 !bg-transparent !p-0 !leading-none !text-[#a9a69f] !opacity-100 !shadow-none [&_svg]:!block [&_svg]:!shrink-0 [&_svg]:translate-y-[2px] hover:!bg-transparent hover:!text-[#f5f4f1]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
