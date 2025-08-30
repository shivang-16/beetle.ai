import React from "react";
import HeroTitle from "./HeroTitle";
import { Button } from "@/components/ui/button";

const heroSection = () => {
  return (
    <section className="mb-40">
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="max-w-7xl w-full mx-auto px-6 pt-[7%]">
          <div className="relative z-10 font-scandia py-10 rounded-4xl flex h-[80vh]">
            <div
              className="absolute inset-0 z-0 mask-radial-[100%_100%] mask-radial-from-[5%] mask-radial-at-right rounded-4xl"
              style={{
                backgroundImage: "url('/smoke.png')",
                backgroundSize: "cover",
                backgroundPosition: "right center",
                backgroundRepeat: "no-repeat",
              }}
              // style={{
              //   backgroundImage: `
              //     radial-gradient(circle at 1px 1px, rgba(78, 198, 160, 1) 1px, transparent 0),
              //     repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.05) 4px),
              //     repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.05) 4px),
              //     url("/smoke.png")
              //   `,
              //   backgroundSize: "4px 4px, 20px 20px, 16px 16px, cover",
              //   backgroundPosition: "top left, top left, top left, center",
              //   backgroundRepeat: "repeat, repeat, repeat, no-repeat",
              //   backgroundBlendMode: "normal, normal, normal, multiply", // apply blend to smoke
              // }}
            />
            <div className="relative z-10 flex-2 pl-4 flex flex-col justify-between">
              <h1 className="text-5xl md:text-6xl leading-tight font-bold text-white mb-6">
                <span className="sr-only">
                  Eliminate Bugs Before They Ship. Automatically.
                </span>

                <HeroTitle title="Eliminate Bugs Before They Ship. Automatically." />
              </h1>

              <div>
                <p className="text-xl md:text-2xl leading-tight text-gray-300 mb-8">
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
