import React from "react";
import HeroTitle from "./HeroTitle";
import { Button } from "@/components/ui/button";

const heroSection = () => {
  return (
    <section className="">
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="max-w-[1563px] w-full mx-auto px-6 pt-[7%]">
          <div className="relative z-10 font-geist-sans py-10 rounded-4xl flex h-[80svh]">
            <div
              className="absolute inset-0 z-0 mask-radial-[100%_100%] mask-radial-from-[5%] mask-radial-at-right rounded-4xl"
              style={{
                backgroundImage: "url('/smoke.png')",
                backgroundSize: "cover",
                backgroundPosition: "right center",
                backgroundRepeat: "no-repeat",
              }}
            />
            <div className="relative z-10 flex-2 pl-4 flex flex-col justify-between">
              <h1 className="text-5xl md:text-6xl leading-tight font-inter font-medium text-foreground mb-6">
                <HeroTitle title="Eliminate Bugs Before They Ship. Automatically." />
              </h1>

              <div>
                <p className="text-xl md:text-2xl leading-tight text-muted-foreground mb-8">
                  Let your AI agent crawl every PR, run real browser tests, and
                  raise clean, working fixes — so your team ships with
                  confidence.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col items-start gap-6 mb-8">
                  <Button className="rounded-full dark:text-white" size={"lg"}>
                    <span className="">Get started free</span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default heroSection;
