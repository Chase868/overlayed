import type { DirectionLR } from "@/config";
import { User } from "../components/user";
import { cn } from "@/utils/tw";
import { useAppStore } from "../store";
import { useConfigValue } from "@/hooks/use-config-value";
import { useVoiceToText } from "@/hooks/use-voice-to-text";
import { useEffect, useState } from "react";

export const ChannelView = ({ alignDirection }: { alignDirection: DirectionLR }) => {
  const { users, me, setUserTranscript } = useAppStore();

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
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

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
            transcript={item.transcript}
          />
        ))}
      </div>
    </div>
  );
};
