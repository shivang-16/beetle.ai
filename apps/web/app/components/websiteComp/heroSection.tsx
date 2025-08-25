import React from "react";
import Image from "next/image";
import roundstar from "../../../public/Exclude.png";
import bluecircle from "../../../public/Mask group.png";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";

const heading = "Eliminate Bugs Before They Ship. Automatically.".split(" ");

const heroSection = () => {
  return (
    <section className="mb-40">
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto mt-[8%] px-6">
          <div className="relative z-10 font-scandia py-10 rounded-4xl flex">
            <div
              className="absolute inset-0 z-0 mask-radial-[100%_100%] mask-radial-from-[5%] mask-radial-at-right rounded-4xl"
              style={{
                backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(78, 198, 160, 1) 1px, transparent 0),
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.05) 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.05) 4px)
              `,
                backgroundSize: "6px 6px, 32px 32px, 32px 32px",
              }}
            />
            <div className="relative z-10 flex-2 pl-4">
              <h1 className="text-5xl md:text-6xl leading-tight font-bold text-white mb-6">
                <span className="sr-only">
                  Eliminate Bugs Before They Ship. Automatically.
                </span>
                {heading.map((word, index) => (
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
                      index === heading.length - 1 ? "text-[#4ec6a0]" : ""
                    )}>
                    {word}
                  </motion.span>
                ))}
              </h1>

              <p className="text-xl md:text-2xl leading-tight text-gray-300 mb-8">
                Let your AI agent crawl every PR, run real browser tests, and
                raise clean, working fixes — so your team ships with confidence.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-start gap-6 mb-8">
                <button className="relative px-8 py-3 text-lg rounded-full font-medium bg-[#4ec6a0] text-[#010010] transition-all hover:text-black hover:cursor-pointer duration-700 ease-in-out overflow-hidden">
                  <span className="">Get started free</span>
                </button>
              </div>

              {/* Features */}
              <div className="mt-12 text-white flex flex-col sm:flex-row items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>14-day free trial</span>
                </div>
                <div className="hidden sm:block text-gray-600">•</div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>No credit card needed</span>
                </div>
                <div className="hidden sm:block text-gray-600">•</div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>2-click signup with GitHub/GitLab</span>
                </div>
              </div>
            </div>
            <div className="flex-1"></div>
          </div>
        </div>
      </div>
      <div className="mt-16 mb-16 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-scandia font-bold text-white mb-8">
            See CodeDetector in Action
          </h2>

          <div className="absolute top-50 -left-30 z-0">
            <Image
              src={bluecircle}
              alt="Decorative Star"
              width={200}
              height={200}
              className="transform rotate-180"
            />
          </div>

          <div className="absolute -bottom-12 -right-12 z-0">
            <Image
              src={roundstar}
              alt="Decorative Star"
              width={200}
              height={200}
              className="transform rotate-45"
            />
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 z-10">
            <video
              className="w-full h-auto"
              controls
              poster="/video-poster.jpg"
              preload="metadata">
              <source src="/sample-video.mp4" type="video/mp4" />
              <source src="/sample-video.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>

            {/* Optional overlay for custom play button */}
            {/* <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-all duration-300 cursor-pointer">
              <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l8-5-8-5z"/>
                </svg>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default heroSection;
