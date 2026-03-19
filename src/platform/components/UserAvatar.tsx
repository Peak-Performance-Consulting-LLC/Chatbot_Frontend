import { useEffect, useMemo, useState } from "react";

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function getUserInitials(name?: string | null, fallback = "AC") {
  const value = name?.trim();
  if (!value) {
    return fallback;
  }

  const initials = value
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || fallback;
}

export default function UserAvatar({
  name,
  avatarUrl,
  className = "",
  imageClassName = "",
  fallbackClassName = ""
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const initials = useMemo(() => getUserInitials(name), [name]);
  const canShowImage = Boolean(avatarUrl && !imageFailed);

  return (
    <div className={className}>
      {canShowImage ? (
        <img
          src={avatarUrl ?? undefined}
          alt={name ? `${name} avatar` : "Profile avatar"}
          className={imageClassName}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={fallbackClassName}>{initials}</span>
      )}
    </div>
  );
}
