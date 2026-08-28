"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import Link from "next/link";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { motion } from "motion/react";

// Baseline offsets shown on top of live DB stats
const EXTRA_LINES_REVIEWED = 3_500_000;
const EXTRA_BUGS_REPORTED = 8_000;

// Format numbers: 1M for >= 1,000,000, 1K for >= 1,000
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return num.toLocaleString();
};

const OverviewSection = () => {
  const [stats, setStats] = useState<{ totalPrs: number; totalLinesReviewed: number; totalPrCommentsPosted: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        const res = await fetch(`${apiUrl}/api/analysis/global-stats`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, []);

  // Only create words array after stats are loaded
  const words = stats ? [
    { text: "We", className: "text-white" },
    { text: "Have", className: "text-white" },
    { text: "Reviewed", className: "text-white" },
    { text: formatNumber(stats.totalLinesReviewed + EXTRA_LINES_REVIEWED), className: "!text-primary" },
    { text: "Lines", className: "text-white" },
    { text: "Of", className: "text-white" },
    { text: "Code", className: "text-white" },
    { text: "and", className: "text-white" },
    { text: "Reported", className: "text-white" },
    { text: formatNumber((stats.totalPrCommentsPosted || 0) + EXTRA_BUGS_REPORTED), className: "!text-primary" },
    { text: "Bugs", className: "text-white" },
    { text: "so", className: "text-white" },
    { text: "far", className: "text-white" },
  ] : [];

  return (
    <section id="overview" className="pt-10">
      <div className="py-14 md:px-6 max-w-[1563px] w-full mx-auto border border-t-0 border-b-0 border-[#333333]">
        <div className="px-4 flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex-1">
            <h2 className="text-white text-3xl font-semibold lg:max-w-xl leading-tight text-left mb-6">
              Your repo, your standards — define custom rules that review every change
and heal your code before it hits production
{" "}
            </h2>
          </div>
          <div className="flex flex-col gap-8 justify-end">
            <p className="text-white text-md font-medium lg:max-w-xl">
              Let your team focus on building — Beetle reviews code with full-repo context,
    not just PR diffs and with custom rules, preventing issues early so you ship faster with confidence..{" "}
            </p>
            <div>
              <Link href="/signin">
                <Button
                  variant={"ghost"}
                  className="cursor-pointer border bg-white text-black hover:text-white/80">
                  Launch Agent <ArrowUpRight />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="min-h-[70vh] md:min-h-screen w-full flex flex-col items-center justify-center relative z-20 py-0 md:pt-25">
          {stats ? (
            <div className="font-bold font-mono text-center max-w-7xl leading-tight tracking-tight">
              {/* Use TypewriterEffect for static words */}
              <TypewriterEffect
                words={words}
                className="text-3xl md:text-5xl font-bold font-mono"
                cursorClassName="bg-primary"
              />
            </div>
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="inline-block rounded-sm w-[4px] h-10 md:h-12 bg-primary"
            />
          )}
        </div>

        <MacbookScroll src={"/dashboard-page.png"} />
        {/* <motion.div
          initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
          className="max-w-[1200px] aspect-[1280/832] mx-auto p-3 md:rounded-2xl mask-b-from-55% border border-input/30">
          <Image
            src={"/analysis-page-dark.png"}
            alt="Beetle Analysis Dashboard"
            width={1280}
            height={832}
            className="object-contain md:rounded-lg"
          />
        </motion.div> */}
      </div>
    </section>
  );
};

export default OverviewSection;


