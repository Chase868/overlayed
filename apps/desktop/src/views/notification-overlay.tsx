import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Event } from "@/constants";
import { useConfigValue } from "@/hooks/use-config-value";

interface DiscordNotificationPayload {
  title: string;
  body: string;
  iconUrl: string | null;
  deepLink: string;
  webUrl: string;
  notificationType: string;
}

function truncateMessage(value: string, previewLength: number) {
  const limit = Math.min(300, Math.max(1, previewLength));
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

export function NotificationOverlay() {
  const [notification, setNotification] = useState<DiscordNotificationPayload | null>(null);
  const { value: opacity } = useConfigValue("discordNotificationOpacity");
  const { value: previewLength } = useConfigValue("discordMessagePreviewLength");

  useEffect(() => {
    const unlisten = listen<DiscordNotificationPayload>(Event.DisplayDiscordNotification, event => {
      setNotification(event.payload);
    });

    return () => {
      void unlisten.then(dispose => dispose());
    };
  }, []);

  if (!notification) return null;

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent text-white pointer-events-none">
      <section
        className="box-border flex h-[112px] w-[360px] items-center overflow-hidden rounded-md border border-zinc-600 p-6 pr-8 shadow-lg"
        style={{ backgroundColor: `rgba(24, 24, 27, ${opacity / 100})` }}
      >
        <div className="grid w-full gap-1 overflow-hidden pr-2">
          <h2 className="truncate text-sm font-semibold">{notification.title}</h2>
          <div className="flex min-w-0 items-center gap-2 text-sm opacity-90">
            <img
              src={notification.iconUrl ?? "/img/default.png"}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full"
              onError={event => {
                const image = event.currentTarget;
                image.onerror = null;
                image.src = "/img/default.png";
              }}
            />
            <span
              className="overflow-hidden break-words leading-4"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
            >
              {truncateMessage(notification.body, previewLength)}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
