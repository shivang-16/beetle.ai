import Image from "next/image";
import React from "react";
import sample from "../../../public/Group 11.png"
import bluecircle from '../../../public/Shape-14.png'

const FeaturesSection = () => {
  return (
    <div className="space-y-20 !mt-20">
      <h1 className="flex justify-center text-5xl font-scandia self-center font-bold font-heading text-heading-sm md:text-heading-lg-sm text-white">
        AI Code Reviews
      </h1>
      
      <div className="container mx-auto" id="features">
        <div className="mx-auto w-full max-w-7xl">
          <div className="space-y-6">
            
            {/* Row 1: 25% left, 75% right */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Feature 1 - Catch fast. Fix fast. (25% left) */}
              <div className="relative p-6 md:p-8 border border-pink-700 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col gap-6 w-full lg:w-1/4 min-h-full">
                <div className="mb-auto">
                  <h2 className="font-bold text-2xl font-scandia text-white font-heading text-subtitle">
                    Hands-free production testing.
                  </h2>
                  <p className="mt-4 text-gray-300 text-lg text-body-md-sm lg:text-body-md">
                    A headless browser crawls your live app like a real user—clicking buttons, submitting forms, and catching UI or functionality breakage before your users do.
                  </p>
                </div>
              </div>

              {/* Feature 2 - Your reviews. Your way. (75% right) */}
              <div className="relative p-6 md:p-12 border border-cream-600 dark:border-neutral-800 shadow-cream-600 dark:shadow-neutral-900 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col lg:flex-row gap-8 w-full lg:w-3/4 min-h-full">
                <div className="space-y-4 lg:w-1/2 flex flex-col">
                  <h2 className="font-bold font-scandia text-2xl font-heading text-heading-sm-sm lg:text-subtitle text-white">
                   Your tests. Auto-fixed.
                  </h2>
                  <p className="text-lg text-gray-300">
                    Every PR is scanned for bugs, build issues, and production errors. If something breaks, the agent opens a clean, fixed PR—ready to merge.
                  </p>
                </div>
                <div className="lg:w-1/2 flex">
                  <Image 
                    src={sample} 
                    alt="Code review automation interface" 
                    className="rounded-[1.25rem] object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: 75% left, 25% right */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Feature 3 - Simple PR summaries (75% left) */}
              <div className="relative p-6 md:p-12 border border-cream-600 dark:border-neutral-800 shadow-cream-600 dark:shadow-neutral-900 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col lg:flex-row-reverse gap-8 w-full lg:w-3/4 min-h-full">
                <div className="space-y-4 lg:w-1/2">
                  <h2 className="font-bold text-2xl font-scandia font-heading text-heading-sm-sm lg:text-subtitle text-white">
                    One-click QA at scale.
                  </h2>
                  <p className="text-xl text-gray-300">
                    Connect your repo. The agent reviews every PR with full code context, learns from your feedback, and follows your team’s conventions—automatically.
                  </p>
                </div>
              </div>

              {/* Feature 4 - Know what has been changed (25% right) */}
              <div className="relative p-6 md:p-12 border border-orange-500 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col gap-6 w-full lg:w-1/4 min-h-full">
                <div>
                  <h2 className="font-bold text-2xl font-scandia text-white font-heading text-subtitle">
                    Break it, fix it, PR it.
                  </h2>
                  <p className="mt-4 text-xl text-gray-300 text-body-md-sm lg:text-body-md">
                    From flaky flows to fatal exceptions, your agent finds the root cause, applies a fix, and pushes a new branch. No triage. No ticket. Just clean code
                  </p>
                </div>
              </div>
            </div>

            {/* Row 3: 25% left, 75% right */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Feature 5 - More signal. Less noise. (25% left) */}
              <div className="relative p-6 md:p-12 border border-pink-700 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col gap-6 w-full lg:w-1/4 min-h-full">
                <div className="mb-auto">
                  <h2 className="font-bold text-2xl font-scandia text-white font-heading text-subtitle">
                   Built to adapt.
                  </h2>
                  <p className="mt-4 text-gray-300 text-xl text-body-md-sm lg:text-body-md">
                    Configure instructions, toggle tools, and fine-tune review depth. The more you interact, the sharper it gets—tailored for your codebase, not someone else’s.
                  </p>
                </div>
              </div>

              {/* Feature 6 - Ship faster with agentic Chat (75% right) */}
              <div className="relative p-6 md:p-12 border border-cream-600 dark:border-neutral-800 shadow-cream-600 dark:shadow-neutral-900 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col lg:flex-row gap-8 w-full lg:w-3/4 min-h-full">
                <div className="space-y-4 lg:w-1/2">
                  <h2 className="font-bold text-2xl font-scandia font-heading text-heading-sm-sm lg:text-subtitle text-white">
                    One interface. Full oversight.
                  </h2>
                  <p className="text-body-md-sm text-lg lg:text-body-md text-gray-300">
                    Monitor, manage, and control all agent activity, PR scans, and live errors in real time—from one unified interface.
                  </p>
                </div>
              </div>
            </div>

            {/* Row 4: 75% left, 25% right */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Feature 7 - Code as usual. Receive smart reports. (75% left) */}
              <div className="relative p-6 md:p-12 border border-cream-600 dark:border-neutral-800 shadow-cream-600 dark:shadow-neutral-900 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col lg:flex-row-reverse gap-8 w-full lg:w-3/4 min-h-full">
                <div className="w-full space-y-4 lg:w-1/2">
                  <h2 className="font-bold text-2xl font-scandia font-heading text-heading-sm-sm lg:text-heading-md text-white">
                    Code as usual. Receive smart reports.
                  </h2>
                  <ul className="mt-4 text-xl  space-y-3">
                    <li className="flex items-start gap-2 list-none">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-body-md-sm lg:text-body-md text-gray-300">
                        Pull request summaries & sequence diagrams.
                      </p>
                    </li>
                    <li className="flex items-start gap-2 list-none">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-body-md-sm lg:text-body-md text-gray-300">
                        Linear & Jira issue validation.
                      </p>
                    </li>
                    <li className="flex items-start gap-2 list-none">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-body-md-sm lg:text-body-md text-gray-300">
                        Autogenerated release notes, daily standup reports, and sprint reviews.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 8 - Vibe check your code (25% right) */}
              <div className="relative  p-6 md:p-12 border border-orange-500 rounded-[1.25rem] overflow-hidden bg-neutral-0 dark:bg-neutral-900 flex flex-col gap-6 w-full lg:w-1/4 min-h-full">
                <div>
                  <h2 className="font-bold  text-2xl font-scandia text-white font-heading text-subtitle">
                    Vibe check your code.
                  </h2>
                  <p className="mt-4 text-xl text-gray-300 text-body-md-sm lg:text-body-md">
                    Free AI code reviews directly in your code editor. Fix bugs and defects introduced by vibe coding, without breaking your flow state.
                  </p>
                  <button className="group inline-flex items-center justify-center px-6 py-3 rounded-full cursor-pointer gap-x-3 font-heading font-bold bg-orange-500 text-white hover:bg-gradient-to-r from-orange-500 to-pink-500 focus:bg-pink-600 focus:outline-pink-600 focus:outline-offset-4 active:bg-aqua-500 w-full !mt-6 h-12 text-sm">
                    Learn More
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white group-hover:text-white rotate-0">
                      <path d="M20.2896 11.7569C16.0056 11.7569 12.5327 8.28404 12.5327 4" stroke="currentColor" strokeWidth="1.55139"></path>
                      <path d="M20.2896 11.757C16.0056 11.757 12.5327 15.2299 12.5327 19.5139" stroke="currentColor" strokeWidth="1.55139"></path>
                      <path d="M17.9625 11.7568L4 11.7568" stroke="currentColor" strokeWidth="1.55139"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
