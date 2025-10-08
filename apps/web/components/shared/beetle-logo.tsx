import { cn } from "@/lib/utils";
import Image from "next/image";
import React from "react";

const BeetleLogo = ({ className }: { className?: string }) => {
  return (
    <Image
      src="/beetle.png"
      alt="Codebear logo"
      width={32}
      height={32}
      className={`${className}`}
      priority
    />
  );
};

export default BeetleLogo;
