"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { motion } from "motion/react";

const OverviewSection = () => {
  const { resolvedTheme } = useTheme();

  return (
    <section className="relative z-20">
      <motion.div
        initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
        className="max-w-[1200px] aspect-[1280/832] mx-auto p-3 border rounded-2xl -mt-10 mask-b-from-55% bg-background">
        {resolvedTheme === "dark" ? (
          <Image
            src={"/analysis-page-dark.png"}
            alt="Codetector Analysis Dashboard"
            width={1280}
            height={832}
            className="object-contain"
          />
        ) : (
          <Image
            src={"/analysis-page-light.png"}
            alt="Codetector Analysis Dashboard"
            width={1280}
            height={832}
            className="object-contain"
          />
        )}
      </motion.div>
    </section>
  );
};

export default OverviewSection;
