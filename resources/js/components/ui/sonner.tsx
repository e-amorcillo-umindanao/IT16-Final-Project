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
      toastOptions={{
        classNames: {
          toast:
            "group toast group pointer-events-auto rounded-2xl border border-white/12 bg-zinc-900/96 text-zinc-50 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          title: "text-[15px] font-medium text-zinc-50",
          description: "text-sm text-zinc-300",
          content: "gap-3",
          icon: "text-zinc-100",
          success: "border-white/12 bg-zinc-900/96 text-zinc-50 [&_[data-icon]]:text-zinc-100",
          error: "border-red-400/20 bg-zinc-900/96 text-zinc-50 [&_[data-icon]]:text-red-300",
          info: "border-white/12 bg-zinc-900/96 text-zinc-50 [&_[data-icon]]:text-zinc-100",
          warning: "border-amber-400/20 bg-zinc-900/96 text-zinc-50 [&_[data-icon]]:text-amber-300",
          loading: "border-white/12 bg-zinc-900/96 text-zinc-50 [&_[data-icon]]:text-zinc-100",
          actionButton:
            "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
          cancelButton:
            "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
          closeButton:
            "border-0 bg-transparent text-zinc-400 opacity-100 hover:bg-white/5 hover:text-zinc-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
