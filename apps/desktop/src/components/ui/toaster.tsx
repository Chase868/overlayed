import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useConfigValue } from "@/hooks/use-config-value";
import { cn } from "@/utils/tw";
import { useEffect, useState } from "react";

export function Toaster() {
  const { toasts } = useToast();
  const { value: notificationOverlayX } = useConfigValue("notificationOverlayX");
  const { value: notificationOverlayY } = useConfigValue("notificationOverlayY");
  const { value: notificationOpacity } = useConfigValue("discordNotificationOpacity");
  const [channelOffset, setChannelOffset] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const updateOffset = () => {
      const channelRoot = document.getElementById("channel-placement-root");
      if (!channelRoot) {
        setChannelOffset({ left: 0, top: 0 });
        return;
      }

      const rect = channelRoot.getBoundingClientRect();
      setChannelOffset({ left: rect.left, top: rect.top });
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    window.addEventListener("hashchange", updateOffset);

    return () => {
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("hashchange", updateOffset);
    };
  }, []);

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, className, style, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className={cn("border-zinc-600 text-white w-[360px] min-w-[360px] max-w-[360px] h-[112px]", className)}
            style={{
              ...style,
              backgroundColor: `rgba(24, 24, 27, ${notificationOpacity / 100})`,
            }}
          >
            <div className="grid gap-1 w-full overflow-hidden pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport
        className="left-0 top-0 flex-col items-start"
        style={{
          left: `${channelOffset.left + notificationOverlayX}px`,
          top: `${channelOffset.top + notificationOverlayY}px`,
        }}
      />
    </ToastProvider>
  );
}
