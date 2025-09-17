"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const HeroTitle = () => {
  // Split into 3 lines as shown in the image
  const lines = [
    "AI CODE REVIEWER",
    "THAT THINK LIKE", 
    "HUMANS"
  ];
  
  return (
    <div>
      {lines.map((line, lineIndex) => (
        <motion.div
          key={lineIndex}
          initial={{ opacity: 0, filter: "blur(5px)", y: 20 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            delay: lineIndex * 0.2,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="block"
        >
          {line.split(" ").map((word, wordIndex) => (
            <motion.span
              key={wordIndex}
              initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{
                delay: lineIndex * 0.2 + wordIndex * 0.1,
                duration: 0.4,
                ease: "easeInOut",
              }}
              className={cn(
                "mr-4 inline-block",
                lineIndex === 2 ? "text-primary" : "text-white"
              )}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export default HeroTitle;
