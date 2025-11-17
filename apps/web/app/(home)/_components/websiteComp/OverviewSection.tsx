"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import Link from "next/link";

const OverviewSection = () => {
  return (
    <section id="overview" className="pt-10">
      <div className="py-14 md:px-6 max-w-[1563px] w-full mx-auto border border-t-0 border-b-0 border-[#333333]">
        <div className="px-4 flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex-1">
            <h2 className="text-white text-3xl font-semibold lg:max-w-xl leading-tight text-left mb-6">
              Your repo, your rules — allows you to choose the model that hunts
              down escaped bugs and heals your code before users notice{" "}
            </h2>
          </div>
          <div className="flex flex-col gap-8 justify-end">
            <p className="text-white text-md font-medium lg:max-w-xl">
              Empower your team to focus on building — we’ll hunt, fix, and
              prevent bugs with full-repo analysis, not just PR reviews, so you
              ship faster.{" "}
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
