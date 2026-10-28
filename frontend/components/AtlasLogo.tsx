import Image from "next/image";
import logo from "@/public/atlas-logo.png";

type Props = { size?: number; className?: string };

export default function AtlasLogo({ size = 32, className }: Props) {
  return (
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className ?? ""}`}
    />
  );
}
