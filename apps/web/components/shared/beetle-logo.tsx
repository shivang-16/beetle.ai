import { cn } from "@/lib/utils";
import Image from "next/image";
import React from "react";

const BeetleLogo = ({ className }: { className?: string }) => {
  return (
    <Image
import { cn } from "@/lib/utils";
import Image from "next/image";
import React from "react";
const BeetleLogo = ({ className }: { className?: string }) => {
return (
<Image
src="/beetle.png"
alt="Beetle Logo"
width={40}
height={40}
className={cn("dark:invert", className)}
/>
);
};
export default BeetleLogo;
export default BeetleLogo;
