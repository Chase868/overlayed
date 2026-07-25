import type { DirectionLR } from "@/config";
import { User } from "../components/user";
import { cn } from "@/utils/tw";
import { useAppStore } from "../store";
import { useConfigValue } from "@/hooks/use-config-value";

export const ChannelView = ({ alignDirection }: { alignDirection: DirectionLR }) => {
  const { users, me } = useAppStore();

  const { value: showOnlyTalkingUsers } = useConfigValue("showOnlyTalkingUsers");
  const { value: showMutedUsersWhenSpeaking } = useConfigValue("showMutedUsersWhenSpeaking");
  const { value: showOwnUser } = useConfigValue("showOwnUser");
  const { value: opacity } = useConfigValue("opacity");
  const { value: opacityTarget } = useConfigValue("opacityTarget");
  const { value: userScale } = useConfigValue("userScale");
  const { value: verticalGap } = useConfigValue("verticalGap");
  const { value: vertical } = useConfigValue("vertical");

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

  return (
    <div className="h-full">
      <div
        className={cn("py-2 h-full", {
          "flex flex-wrap justify-center": alignDirection === "center",
          "flex flex-1 flex-col": alignDirection !== "center",
          "justify-end": alignDirection !== "center" && vertical === "bottom",
          "justify-start": alignDirection !== "center" && vertical !== "bottom",
          "overflow-auto": userScale === 100,
          "overflow-visible": userScale !== 100,
        })}
        style={{ maxHeight: "100%", gap: `${Math.max(verticalGap, 0)}px` }}
      >
        {userList.map(([, item], index) => (
          <User
            key={item.id}
            item={item}
            index={index}
            alignDirection={alignDirection}
            opacity={opacity}
            opacityTarget={opacityTarget}
            userScale={userScale}
            verticalGap={verticalGap}
          />
        ))}
      </div>
    </div>
  );
};
