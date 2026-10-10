import { Routes, Route, useLocation } from "react-router-dom";
import { MainView } from "./views/main";
import { ChannelView } from "./views/channel";

import { SettingsView } from "./views/settings";
import { ErrorView } from "./views/error";
import { NavBar } from "./components/nav-bar";
import { usePin } from "./hooks/use-pin";
import { useAlign } from "./hooks/use-align";
import { useDisableWebFeatures } from "./hooks/use-disable-context-menu";
import { useUpdate } from "./hooks/use-update";
import { useAppStore } from "./store";
import { Toaster } from "./components/ui/toaster";
import { useEffect } from "react";
import { useSocket } from "./rpc/manager";
import { cn } from "./utils/tw";
import Config from "./config";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Event } from "./constants";
import { NotificationOverlay } from "./views/notification-overlay";

interface DiscordNotificationPayload {
  title: string;
  body: string;
  iconUrl: string | null;
  deepLink: string;
  webUrl: string;
  notificationType: string;
}

function App() {
  useDisableWebFeatures();
  useSocket();

  const location = useLocation();
  const isSettingsWindow = location.pathname === "/settings";
  const { pin } = usePin();

  useEffect(() => {
    const styleForLog = "font-size: 20px; color: #00dffd";
    console.log(`%cOverlayed ${window.location.hash} Window`, styleForLog);
  }, []);

  useEffect(() => {
    if (location.pathname === "/notification") return;

    (async () => {
      const config = await Config.getConfig();
      await invoke("set_hide_taskbar_when_pinned", {
        hideTaskbarWhenPinned: config.hideTaskbarWhenPinned,
      });
      await invoke("set_minimize_to_tray", {
        minimizeToTray: config.minimizeToTray,
      });
    })();
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/settings" || location.pathname === "/notification") return;

    const unlisten = listen<DiscordNotificationPayload>(Event.DiscordNotification, event => {
      const payload = event.payload;
      const placementRoot = document.getElementById("channel-placement-root");
      const placementRect = placementRoot?.getBoundingClientRect();

      void Config.getConfig().then(config =>
        invoke("show_discord_notification", {
          payload,
          x: (placementRect?.left ?? 0) + config.notificationOverlayX,
          y: (placementRect?.top ?? 0) + config.notificationOverlayY,
        })
      );
    });

    return () => {
      void unlisten.then(dispose => dispose());
    };
  }, [location.pathname]);

  const { update } = useUpdate();
  const { visible } = useAppStore();

  const { horizontal, setHorizontalDirection } = useAlign();
  const visibleClass = visible ? "opacity-100" : "opacity-0";

  if (location.pathname === "/notification") {
    return <NotificationOverlay />;
  }

  return (
    <div
      className={cn(
        `text-white h-screen select-none rounded-lg flex flex-col ${visibleClass}`,
        // Only show the border on the overlay (main) window when not pinned.
        pin || isSettingsWindow ? null : "border border-zinc-600"
      )}
    >
      <NavBar
        isUpdateAvailable={update?.available ?? false}
        pin={pin}
        alignDirection={horizontal}
        setAlignDirection={setHorizontalDirection}
      />
      <Toaster />
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/channel" element={<ChannelView alignDirection={horizontal} />} />
        <Route path="/settings" element={<SettingsView update={update} />} />
        <Route path="/error" element={<ErrorView />} />
      </Routes>
    </div>
  );
}

export default App;
