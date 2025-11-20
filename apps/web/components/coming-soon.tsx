"use client";

import React from "react";
import { DottedGlowBackground } from "./ui/dotted-glow-background";

const ComingSoon = () => {
  return (
    <div className="relative h-full">
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-80% mask-radial-at-center opacity-20 dark:opacity-100"
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-500"
        glowColorDarkVar="--color-sky-800"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.6}
        speedScale={1}
      />
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center space-y-6 px-8 py-16 text-center">
        <h2 className="from-muted-foreground/90 inline-block bg-gradient-to-b to-transparent bg-clip-text text-4xl font-bold text-transparent sm:text-6xl lg:text-7xl">
          COMING SOON
        </h2>
        <p className="text-muted-foreground mx-auto w-full max-w-2xl text-center text-base font-medium md:text-lg">
          We are still working on this feature to make it more smarter and will
          be making this feature live soon. We really appreciate your patience.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
