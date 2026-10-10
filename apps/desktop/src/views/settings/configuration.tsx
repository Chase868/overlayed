import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import Config from "@/config";
import { useConfigValue } from "@/hooks/use-config-value";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Event } from "@/constants";
import type { DiscordNotificationStatus } from "@/types";

interface NotificationStatus {
  status: DiscordNotificationStatus;
  detail?: string;
}

const INITIAL_NOTIFICATION_STATUS: NotificationStatus = { status: "connecting" };

const notificationStatusLabel: Record<DiscordNotificationStatus, string> = {
  connecting: "Connecting to Discord",
  authorizing: "Waiting for Discord authorization",
  subscribing: "Enabling Discord notifications",
  active: "Discord notifications are connected",
  missing_scope: "Discord notification permission is missing",
  error: "Discord notification connection failed",
};

export const Configuration = () => {
  const { value: discordMessageNotifications } = useConfigValue("discordMessageNotifications");
  const { value: discordNotificationOpacity } = useConfigValue("discordNotificationOpacity");
  const { value: discordMessagePreviewLength } = useConfigValue("discordMessagePreviewLength");
  const { value: showOnlyTalkingUsers } = useConfigValue("showOnlyTalkingUsers");
  const { value: showMutedUsersWhenSpeaking } = useConfigValue("showMutedUsersWhenSpeaking");
  const { value: opacity } = useConfigValue("opacity");
  const { value: opacityTarget } = useConfigValue("opacityTarget");
  const { value: backgroundOpacity } = useConfigValue("backgroundOpacity");
  const { value: verticalGap } = useConfigValue("verticalGap");
  const { value: vertical } = useConfigValue("vertical");
  const { value: horizontal } = useConfigValue("horizontal");
  const { value: maxUsernameLength } = useConfigValue("maxUsernameLength");
  const { value: userScale } = useConfigValue("userScale");
  const { value: hideTaskbarWhenPinned } = useConfigValue("hideTaskbarWhenPinned");
  const { value: minimizeToTray } = useConfigValue("minimizeToTray");
  const { value: voiceToTextEnabled } = useConfigValue("voiceToTextEnabled");
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>(() => {
    try {
      return JSON.parse(localStorage.getItem("overlayed:discord-notification-status") ?? "null") ?? INITIAL_NOTIFICATION_STATUS;
    } catch {
      return INITIAL_NOTIFICATION_STATUS;
    }
  });

  useEffect(() => {
    const unlisten = listen<NotificationStatus>(Event.DiscordNotificationStatus, event => {
      setNotificationStatus(event.payload);
    });

    return () => {
      void unlisten.then(dispose => dispose());
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mt-2 h-8 mx-2">
        <label
          htmlFor="discordMessageNotifications"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show Discord message notifications
        </label>
        <Switch
          id="discordMessageNotifications"
          checked={discordMessageNotifications}
          onCheckedChange={async () => {
            const newBool = !discordMessageNotifications;
            await Config.set("discordMessageNotifications", newBool);

            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
      <div className="mx-2 flex items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <p className="text-sm font-medium">{notificationStatusLabel[notificationStatus.status]}</p>
          {notificationStatus.detail && <p className="text-xs text-zinc-400">{notificationStatus.detail}</p>}
        </div>
        <button
          type="button"
          className="shrink-0 rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50"
          disabled={notificationStatus.status === "authorizing" || notificationStatus.status === "subscribing"}
          onClick={() => emit(Event.ReauthorizeDiscordNotifications)}
        >
          Reauthorize
        </button>
      </div>
      <p className="mx-2 text-xs text-zinc-400">
        Unpin the overlay to enter full-screen preview mode, then drag the speaker and notification preview chips to set
        their pinned positions.
      </p>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="discordNotificationOpacity"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Notification box transparency
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[discordNotificationOpacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? discordNotificationOpacity;
                await Config.set("discordNotificationOpacity", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-10 text-right">
            <span className="text-sm">{discordNotificationOpacity} %</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="discordMessagePreviewLength"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Notification preview length
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[discordMessagePreviewLength]}
              min={20}
              max={300}
              step={5}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? discordMessagePreviewLength;
                await Config.set("discordMessagePreviewLength", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-12 text-right">
            <span className="text-sm">{discordMessagePreviewLength}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 h-8 mx-2">
        <label
          htmlFor="notification"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Only show users who are speaking
        </label>
        <Switch
          id="notification"
          checked={showOnlyTalkingUsers}
          onCheckedChange={async () => {
            const newBool = !showOnlyTalkingUsers;
            await Config.set("showOnlyTalkingUsers", newBool);

            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="showMutedUsersWhenSpeaking"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Keep muted users visible when speaking-only is on
        </label>
        <Switch
          id="showMutedUsersWhenSpeaking"
          checked={showMutedUsersWhenSpeaking}
          onCheckedChange={async () => {
            const newBool = !showMutedUsersWhenSpeaking;
            await Config.set("showMutedUsersWhenSpeaking", newBool);

            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="maxUsernameLength"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Max username length
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[maxUsernameLength]}
              min={4}
              max={60}
              step={1}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? maxUsernameLength;
                await Config.set("maxUsernameLength", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-10 text-right">
            <span className="text-sm">{maxUsernameLength}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="horizontal"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Anchor horizontal
        </label>
        <select
          id="horizontal"
          value={horizontal}
          onChange={async event => {
            const newTarget = event.target.value as "left" | "center" | "right";
            await Config.set("horizontal", newTarget);

            await emit("config_update", await Config.getConfig());
          }}
          className="w-40 p-1 rounded border bg-zinc-800 text-white outline-none focus:ring-0 cursor-pointer"
        >
          <option value="left" className="bg-zinc-800 text-white">
            Left
          </option>
          <option value="center" className="bg-zinc-800 text-white">
            Center
          </option>
          <option value="right" className="bg-zinc-800 text-white">
            Right
          </option>
        </select>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="vertical"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Anchor vertical
        </label>
        <select
          id="vertical"
          value={vertical}
          onChange={async event => {
            const newTarget = event.target.value as "top" | "bottom";
            await Config.set("vertical", newTarget);

            await emit("config_update", await Config.getConfig());
          }}
          className="w-40 p-1 rounded border bg-zinc-800 text-white outline-none focus:ring-0 cursor-pointer"
        >
          <option value="top" className="bg-zinc-800 text-white">
            Top
          </option>
          <option value="bottom" className="bg-zinc-800 text-white">
            Bottom
          </option>
        </select>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="opacityTarget"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Opacity target
        </label>
        <select
          id="opacityTarget"
          value={opacityTarget}
          onChange={async event => {
            const newTarget = event.target.value as "all" | "username-box";
            await Config.set("opacityTarget", newTarget);

            await emit("config_update", await Config.getConfig());
          }}
          className="p-1 rounded border bg-zinc-800 text-white outline-none focus:ring-0 cursor-pointer"
        >
          <option value="all" className="bg-zinc-800 text-white">
            Everything
          </option>
          <option value="username-box" className="bg-zinc-800 text-white">
            Username background only
          </option>
        </select>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="opacity"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Overlay opacity
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[opacity]}
              min={1}
              max={100}
              step={1}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? opacity;
                await Config.set("opacity", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-10 text-right">
            <span className="text-sm">{opacity} %</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="userScale"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Overlay element size
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[userScale]}
              min={50}
              max={200}
              step={5}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? userScale;
                await Config.set("userScale", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-16 text-right">
            <span className="text-sm">{userScale} %</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="backgroundOpacity"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Username box transparency
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[backgroundOpacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? backgroundOpacity;
                await Config.set("backgroundOpacity", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-10 text-right">
            <span className="text-sm">{backgroundOpacity} %</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="verticalGap"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Vertical spacing
        </label>
        <div className="flex items-center gap-4 w-1/2">
          <div className="flex-1">
            <Slider
              value={[verticalGap]}
              min={-20}
              max={40}
              step={1}
              onValueChange={async (val: number[]) => {
                const newVal = val[0] ?? verticalGap;
                await Config.set("verticalGap", Number(newVal));
                await emit("config_update", await Config.getConfig());
              }}
            />
          </div>
          <div className="w-10 text-right">
            <span className="text-sm">{verticalGap}px</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="voiceToTextEnabled"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show voice-to-text captions
        </label>
        <Switch
          id="voiceToTextEnabled"
          checked={voiceToTextEnabled}
          onCheckedChange={async () => {
            const newBool = !voiceToTextEnabled;
            await Config.set("voiceToTextEnabled", newBool);
            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="hideTaskbar"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Hide taskbar when pinned
        </label>
        <Switch
          id="hideTaskbar"
          checked={hideTaskbarWhenPinned}
          onCheckedChange={async () => {
            const newBool = !hideTaskbarWhenPinned;
            await Config.set("hideTaskbarWhenPinned", newBool);

            await invoke("set_hide_taskbar_when_pinned", {
              hideTaskbarWhenPinned: newBool,
            });

            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
      <div className="flex items-center justify-between h-8 mx-2">
        <label
          htmlFor="minimizeToTray"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Minimize to system tray
        </label>
        <Switch
          id="minimizeToTray"
          checked={minimizeToTray}
          onCheckedChange={async () => {
            const newBool = !minimizeToTray;
            await Config.set("minimizeToTray", newBool);

            await invoke("set_minimize_to_tray", {
              minimizeToTray: newBool,
            });

            await emit("config_update", await Config.getConfig());
          }}
        />
      </div>
    </div>
  );
};
