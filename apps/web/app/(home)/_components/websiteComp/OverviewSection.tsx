"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

const OverviewSection = () => {
  return (
    <section className="relative z-20">
      <motion.div
        initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
        className="max-w-[1200px] aspect-[1280/832] mx-auto p-3 rounded-2xl -mt-10 mask-b-from-55% bg-[#010010]">
        <Image
          src={"/analysis-page-dark.png"}
          alt="Codetector Analysis Dashboard"
          width={1280}
          height={832}
          className="object-contain rounded-lg"
        />
      </motion.div>
    </section>
  );
};

export default OverviewSection;
