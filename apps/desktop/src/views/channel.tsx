import type { DirectionLR } from "@/config";
import { User } from "../components/user";
import { cn } from "@/utils/tw";
import { useAppStore } from "../store";
import { useConfigValue } from "@/hooks/use-config-value";
import { useVoiceToText } from "@/hooks/use-voice-to-text";
import { useEffect, useRef, useState } from "react";
import { usePin } from "@/hooks/use-pin";
import Config from "@/config";
import { emit } from "@tauri-apps/api/event";

const clampWithinBounds = (value: number, max: number) => Math.min(Math.max(0, value), Math.max(0, max));

export const ChannelView = ({ alignDirection }: { alignDirection: DirectionLR }) => {
  const { users, me, setUserTranscript } = useAppStore();
  const { pin } = usePin();

  const { value: showOnlyTalkingUsers } = useConfigValue("showOnlyTalkingUsers");
  const { value: showMutedUsersWhenSpeaking } = useConfigValue("showMutedUsersWhenSpeaking");
  const { value: showOwnUser } = useConfigValue("showOwnUser");
  const { value: opacity } = useConfigValue("opacity");
  const { value: opacityTarget } = useConfigValue("opacityTarget");
  const { value: userScale } = useConfigValue("userScale");
  const { value: verticalGap } = useConfigValue("verticalGap");
  const { value: vertical } = useConfigValue("vertical");
  const { value: voiceToTextEnabled } = useConfigValue("voiceToTextEnabled");
  const { value: voiceToTextLanguage } = useConfigValue("voiceToTextLanguage");
  const { value: speakerOverlayX } = useConfigValue("speakerOverlayX");
  const { value: speakerOverlayY } = useConfigValue("speakerOverlayY");
  const { value: notificationOverlayX } = useConfigValue("notificationOverlayX");
  const { value: notificationOverlayY } = useConfigValue("notificationOverlayY");
  const { value: notificationOpacity } = useConfigValue("discordNotificationOpacity");

  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakerPosition, setSpeakerPosition] = useState({ x: speakerOverlayX, y: speakerOverlayY });
  const [notificationPosition, setNotificationPosition] = useState({
    x: notificationOverlayX,
    y: notificationOverlayY,
  });
  const [draggingTarget, setDraggingTarget] = useState<"speaker" | "notification" | null>(null);

  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const positionRef = useRef({ speaker: speakerPosition, notification: notificationPosition });
  const speakerRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const allUsers = Object.entries(users);
  const shouldIncludeMutedUser = (item: (typeof users)[string]) =>
    showMutedUsersWhenSpeaking && (item.muted || item.selfMuted);

  let userList = showOnlyTalkingUsers
    ? allUsers.filter(([, item]) => item.talking || shouldIncludeMutedUser(item))
    : allUsers;

  userList = userList.filter(([, item]) => {
    if (item.id === me?.id) {
      return showOwnUser && (showOnlyTalkingUsers ? item.talking || shouldIncludeMutedUser(item) : true);
    }
    return true;
  });

  useEffect(() => {
    const nextSpeaker = userList.find(([, item]) => item.talking && item.id !== me?.id)?.[1];
    setActiveSpeakerId(nextSpeaker?.id ?? null);
  }, [me?.id, userList]);

  const voiceTargetId = voiceToTextEnabled && activeSpeakerId && activeSpeakerId !== me?.id ? activeSpeakerId : null;
  const { transcript } = useVoiceToText(Boolean(voiceTargetId), voiceToTextLanguage, voiceTargetId);

  useEffect(() => {
    if (!voiceTargetId || !transcript.trim()) return;

    setUserTranscript(voiceTargetId, transcript.trim());
  }, [setUserTranscript, transcript, voiceTargetId]);

  useEffect(() => {
    if (draggingTarget !== "speaker") {
      setSpeakerPosition({ x: speakerOverlayX, y: speakerOverlayY });
    }
  }, [speakerOverlayX, speakerOverlayY, draggingTarget]);

  useEffect(() => {
    if (draggingTarget !== "notification") {
      setNotificationPosition({ x: notificationOverlayX, y: notificationOverlayY });
    }
  }, [notificationOverlayX, notificationOverlayY, draggingTarget]);

  useEffect(() => {
    if (!draggingTarget) return;

    const onMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragOrigin.current.mouseX;
      const deltaY = event.clientY - dragOrigin.current.mouseY;
      const dragElement = draggingTarget === "speaker" ? speakerRef.current : notificationRef.current;
      const elementRect = dragElement?.getBoundingClientRect();
      const width = elementRect?.width ?? 0;
      const height = elementRect?.height ?? 0;

      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;
      const nextX = clampWithinBounds(Math.round(dragOrigin.current.startX + deltaX), maxX);
      const nextY = clampWithinBounds(Math.round(dragOrigin.current.startY + deltaY), maxY);

      if (draggingTarget === "speaker") {
        positionRef.current.speaker = { x: nextX, y: nextY };
        setSpeakerPosition({ x: nextX, y: nextY });
      } else {
        positionRef.current.notification = { x: nextX, y: nextY };
        setNotificationPosition({ x: nextX, y: nextY });
      }
    };

    const onMouseUp = () => {
      const target = draggingTarget;
      const finalPosition = positionRef.current[target];
      setDraggingTarget(null);

      void (async () => {
        if (target === "speaker") {
          await Config.set("speakerOverlayX", finalPosition.x);
          await Config.set("speakerOverlayY", finalPosition.y);
        }

        if (target === "notification") {
          await Config.set("notificationOverlayX", finalPosition.x);
          await Config.set("notificationOverlayY", finalPosition.y);
        }

        await emit("config_update", await Config.getConfig());
      })();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingTarget]);

  const startDrag = (target: "speaker" | "notification", x: number, y: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    dragOrigin.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX: x,
      startY: y,
    };
    positionRef.current[target] = { x, y };
    setDraggingTarget(target);
  };

  return (
    <div id="channel-placement-root" className="h-full relative overflow-hidden">
      {!pin && (
        <>
          <div className="absolute inset-0 bg-zinc-950/75" />
          <div className="absolute left-6 top-18 z-20 rounded-md border border-zinc-600 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-200">
            Drag each preview element to place where it should appear once pinned.
          </div>
        </>
      )}

      <div
        ref={speakerRef}
        className={cn("absolute z-10", !pin ? "cursor-move" : undefined)}
        style={{
          left: `${speakerPosition.x}px`,
          top: `${speakerPosition.y}px`,
          maxHeight: "calc(100% - 16px)",
          maxWidth: "min(440px, calc(100% - 16px))",
          minWidth: !pin ? "260px" : undefined,
          minHeight: !pin ? "92px" : undefined,
        }}
        onMouseDown={!pin ? startDrag("speaker", speakerPosition.x, speakerPosition.y) : undefined}
      >
        <div
          className={cn("py-2", {
            "flex flex-wrap justify-center": alignDirection === "center",
            "flex flex-1 flex-col": alignDirection !== "center",
            "justify-end": alignDirection !== "center" && vertical === "bottom",
            "justify-start": alignDirection !== "center" && vertical !== "bottom",
            "overflow-auto": userScale === 100,
            "overflow-visible": userScale !== 100,
          })}
          style={{ maxHeight: "100%", gap: `${Math.max(verticalGap, 0)}px` }}
        >
          {userList.length > 0
            ? userList.map(([, item], index) => (
                <User
                  key={item.id}
                  item={item}
                  index={index}
                  alignDirection={alignDirection}
                  opacity={opacity}
                  opacityTarget={opacityTarget}
                  userScale={userScale}
                  verticalGap={verticalGap}
                  transcript={item.transcript}
                />
              ))
            : !pin && (
                <div className="rounded-md border border-cyan-500/60 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100">
                  Speaker indicators preview (join a call to see live users)
                </div>
              )}
        </div>
      </div>

      {!pin && (
        <div
          ref={notificationRef}
          className="absolute z-20 cursor-move rounded-md border border-zinc-600 p-6 pr-8 shadow-lg text-sm text-white w-[360px] min-w-[360px] max-w-[360px] h-[112px] overflow-hidden"
          style={{
            left: `${notificationPosition.x}px`,
            top: `${notificationPosition.y}px`,
            backgroundColor: `rgba(24, 24, 27, ${notificationOpacity / 100})`,
          }}
          onMouseDown={startDrag("notification", notificationPosition.x, notificationPosition.y)}
        >
          <div className="grid gap-1 w-full overflow-hidden pr-2">
            <div className="text-sm font-semibold">Discord</div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <img src="/img/default.png" alt="notification source preview" className="h-7 w-7 rounded-full" />
              <span
                className="overflow-hidden break-words leading-4"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
              >
                Notification preview appears here and stays fixed size.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
