type PlatformLogoProps = {
  className?: string;
  alt?: string;
};

export default function PlatformLogo({
  className = "",
  alt = "AeroConcierge logo"
}: PlatformLogoProps) {
  return <img src="/favicon.webp" alt={alt} className={className} />;
}
