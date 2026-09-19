import React, { useState, useEffect } from "react";
import { usePlayerAvatar, type PlatformHint } from "../utils/playerAvatar";

export interface PlayerAvatarProps {
  username?: string | null;
  platformHint?: PlatformHint;
  color?: "white" | "black" | null;
  size?: number;
  compact?: boolean;
  showColorBadge?: boolean;
  className?: string;
  avatarUrl?: string | null;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  username,
  platformHint,
  color,
  size,
  compact = false,
  showColorBadge = false,
  className = "",
  avatarUrl: explicitAvatarUrl,
}) => {
  const effectiveSize = size ?? (compact ? 18 : 22);
  const { avatarUrl: fetchedAvatarUrl } = usePlayerAvatar(
    explicitAvatarUrl ? null : username,
    platformHint
  );
  const activeUrl = explicitAvatarUrl ?? fetchedAvatarUrl;
  const [imageError, setImageError] = useState(false);

  // Reset image error if url changes
  useEffect(() => {
    setImageError(false);
  }, [activeUrl]);

  const cleanName = username?.trim() ?? "";
  const initial = (cleanName[0] || "?").toUpperCase();

  const fontSize = Math.max(9, Math.round(effectiveSize * 0.52));
  const badgeSize = Math.max(6, Math.round(effectiveSize * 0.36));

  const hasImage = Boolean(activeUrl) && !imageError;

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-full select-none ${className}`}
      style={{
        width: `${effectiveSize}px`,
        height: `${effectiveSize}px`,
      }}
      title={cleanName || undefined}
    >
      {hasImage ? (
        <img
          src={activeUrl!}
          alt={cleanName ? `${cleanName} avatar` : "Player avatar"}
          className={`h-full w-full rounded-full object-cover transition-opacity duration-200 ${
            color === "white"
              ? "ring-1 ring-white/40"
              : color === "black"
                ? "ring-1 ring-black/60"
                : "ring-1 ring-white/20"
          }`}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full text-center leading-none tracking-tight transition-colors duration-150 ${
            color === "white"
              ? "border border-white/60 bg-gradient-to-b from-[#f5f3ec] to-[#ded9cd] font-bold text-[#22201d] shadow-sm"
              : color === "black"
                ? "border border-stone-700/60 bg-gradient-to-b from-[#2a2825] to-[#1a1917] font-bold text-[#e8e6df] shadow-sm"
                : "border border-white/10 bg-gradient-to-b from-[#33312e] to-[#22201e] font-semibold text-[#d6d3cd] shadow-sm"
          }`}
          style={{ fontSize: `${fontSize}px` }}
          aria-hidden
        >
          {initial}
        </div>
      )}

      {showColorBadge && color && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full pointer-events-none transition-transform"
          style={{
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            backgroundColor: color === "white" ? "#f5f3ec" : "#1a1917",
            border:
              color === "white"
                ? "1px solid rgba(0,0,0,0.3)"
                : "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 0.5px 2px rgba(0,0,0,0.4)",
          }}
          aria-hidden
        />
      )}
    </div>
  );
};
