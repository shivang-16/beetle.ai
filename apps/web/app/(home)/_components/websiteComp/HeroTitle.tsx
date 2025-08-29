"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const HeroTitle = ({ title }: { title: string }) => {
  return (
    <>
      {title.split(" ").map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            delay: index * 0.1,
            duration: 0.4,
            ease: "easeInOut",
          }}
          className={cn(
            "mr-2.5 inline-block",
            index === title.length - 1 ? "text-[#4ec6a0]" : ""
          )}>
          {word}
        </motion.span>
      ))}
    </>
  );
};

export default HeroTitle;
