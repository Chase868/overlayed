import type { DirectionLR, OpacityTarget } from "@/config";
import { useConfigValue } from "@/hooks/use-config-value";
import type { OverlayedUser } from "../types";
import { HeadphonesOff } from "./icons/headphones-off";
import { MicOff } from "./icons/mic-off";
import { cn } from "@/utils/tw";

export const User = ({
  item,
  index,
  alignDirection,
  opacity,
  opacityTarget,
  userScale,
  verticalGap,
}: {
  item: OverlayedUser;
  index: number;
  alignDirection: DirectionLR;
  opacity: number;
  opacityTarget: OpacityTarget;
  userScale: number;
  verticalGap: number;
}) => {
  const { id, selfMuted, selfDeafened, talking, muted, deafened, avatarHash } = item;

  const avatarUrl = avatarHash ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.jpg` : "/img/default.png";

  const talkingClass = talking ? "border-green-500" : "border-zinc-800";
  const mutedClass = selfMuted || muted ? "text-zinc-400" : "";
  const opacityStyle = talking ? "100%" : `${opacity}%`;
  const scaleFactor = (userScale ?? 100) / 100;
  const avatarSize = 32;
  const iconSize = 20;
  const badgePadding = 4;
  let transformOrigin = "center center";
  if (alignDirection === "left") {
    transformOrigin = "left center";
  } else if (alignDirection === "right") {
    transformOrigin = "right center";
  }

  const { value: maxUsernameLength } = useConfigValue("maxUsernameLength");
  const { value: backgroundOpacity } = useConfigValue("backgroundOpacity");

  const displayName = (() => {
    const name = item.username ?? "";
    const limit = Number(maxUsernameLength ?? 0);
    if (!limit || name.length <= limit) return name;
    return name.slice(0, Math.max(0, limit)) + "…";
  })();

  function renderCheeseMicIcon() {
    let icon = null;

    if (selfMuted) {
      icon = <MicOff className={muted ? "fill-red-600" : "fill-neutral-400"} />;
    }

    if (selfDeafened) {
      icon = <HeadphonesOff className={deafened ? "fill-red-600" : "fill-neutral-400"} />;
    }

    if (muted) {
      icon = <MicOff className="fill-red-600" />;
    }

    if (deafened) {
      icon = <HeadphonesOff className="fill-red-600" />;
    }

    const anyState = selfMuted || selfDeafened || muted || deafened;

    return (
      <div
        className={cn(
          "absolute left-3 -bottom-2 rounded-full",
          anyState ? "bg-black/80" : "bg-transparent",
          alignDirection === "center" ? "flex" : "md:hidden"
        )}
        style={{
          padding: `${badgePadding}px`,
          minWidth: `${iconSize + badgePadding * 2}px`,
          height: `${iconSize + badgePadding * 2}px`,
        }}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 py-1 p-2 justify-start items-center transition-opacity",
        alignDirection == "right" ? "flex-row-reverse" : "flex-row"
      )}
      style={{
        ...(opacityTarget === "all" ? { opacity: opacityStyle } : {}),
        ...(index > 0 && verticalGap < 0 ? { marginTop: `${verticalGap}px` } : {}),
      }}
    >
      <div
        className="flex items-center"
        style={{
          transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
          transformOrigin: scaleFactor !== 1 ? transformOrigin : undefined,
          willChange: scaleFactor !== 1 ? "transform" : undefined,
        }}
      >
        <div className={`pointer-events-none relative rounded-full border-2 ${talkingClass}`}>
        <img
          onError={e => {
            // @ts-expect-error need to fix this prolly
            e.target.onerror = null;
            // @ts-expect-error need to fix this prolly
            e.target.src = "/img/default.png";
          }}
          src={avatarUrl}
          alt="avatar"
          className="rounded-full"
          style={{ width: avatarSize, height: avatarSize }}
        />

        {/* This is cheese string mode */}
        {renderCheeseMicIcon()}
      </div>

        {/* This is the normal list */}
        <div
          className={cn(
            "md:flex hidden pointer-events-none items-center rounded-md max-w-full",
            mutedClass,
            alignDirection === "center" ? "hidden md:hidden" : undefined
          )}
          style={{
            backgroundColor: `rgba(40, 40, 40, ${opacityTarget === "username-box" ? backgroundOpacity / 100 : 1})`,
            padding: "4px 8px",
          }}
        >
          <span className="whitespace-nowrap" style={{ fontSize: "14px" }}>
            {displayName}
          </span>
          <div className="flex">
            {(selfMuted || muted) && <MicOff className={muted ? "fill-red-600" : "fill-current"} />}
            {(selfDeafened || deafened) && <HeadphonesOff className={deafened ? "fill-red-600" : "fill-current"} />}
          </div>
        </div>
      </div>
    </div>
  );
};
