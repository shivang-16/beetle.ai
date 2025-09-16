"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";

const OverviewSection = () => {
  return (
    <section className="px-5 border-b border-[#333333]">
      <div className="py-14 md:px-6 max-w-[1563px] w-full mx-auto border border-t-0 border-b-0 border-[#333333]">
        <div className="px-4 pb-20 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex-1">
            <h2 className="text-white text-4xl font-semibold max-w-xl leading-tight text-left">
              The Lyra ecosystem brings together our models
            </h2>
          </div>
          <div className="flex-1 flex justify-end">
            <p className="text-white text-xl font-medium max-w-xl">
              Empower your team with workflows that adapt to your needs, whether
              you prefer git synchronization or a AI Agents interface.
            </p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
          className="max-w-[1200px] aspect-[1280/832] mx-auto p-3 md:rounded-2xl mask-b-from-55% border border-input/30">
          <Image
            src={"/analysis-page-dark.png"}
            alt="Codetector Analysis Dashboard"
            width={1280}
            height={832}
            className="object-contain md:rounded-lg"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default OverviewSection;
