import Image from 'next/image';

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  align?: "left" | "center";
}

export function Logo({ size = "md", align = "center" }: LogoProps) {
  const dimensions = {
    sm: { width: 100, height: 30 },
    md: { width: 150, height: 45 },
    lg: { width: 200, height: 60 },
    xl: { width: 300, height: 90 },
  };

  const { width, height } = dimensions[size];
  const justifyClass = align === "left" ? "justify-start" : "justify-center";

  return (
    <div className={`flex items-center ${justifyClass}`}>
      <Image
        src="/savr-logo.png"
        alt="Savr Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
}
