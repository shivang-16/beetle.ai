import React from "react";

const StatsSection = () => {
  return (
    <section className="">
      <div className="flex container mx-auto items-center gap-8  w-full xl:max-w-[87.25rem] xl:p-0">
        <div className="flex flex-col max-w-[45%] self-stretch justify-center md:basis-1/2-gap-6 p-8 w-full rounded-[1.25rem] bg-pink-400 dark:bg-neutral-900 border border-pink-400 dark:border-neutral-900 shadow-pink-400 dark:shadow-neutral-900">
          <h2
            className="font-bold font-scandia max-w-[75%] text-3xl text-heading-sm-sm lg:text-heading-sm"
            style={{ lineHeight: "40px" }}>
            Most installed AI App on GitHub & GitLab
          </h2>
          <p className="text-body-md">
            <span></span>
          </p>
        </div>
        <div className="flex md:basis-1/4-gap-6 font-scandia flex-col max-w-[27.5%] self-stretch justify-center w-full px-11 py-8 md:pl-6 md:py-10 md:pr-2 rounded-[1.25rem] bg-neutral-0 dark:bg-neutral-900 border even:border-orange-500 odd:border-pink-700 shadow-border even:shadow-orange-500 odd:shadow-pink-700">
          <div className="flex items-center">
            <span className="font-bold font-heading text-8xl text-heading-xl-sm lg:text-heading-xl">
              1
            </span>
            <span className="font-bold font-heading text-8xl text-heading-xl-sm lg:text-heading-xl">
              M
            </span>
          </div>
          <p className="text-body-md">
            <span style={{ fontWeight: 600 }}>Repositories</span> in review
          </p>
        </div>
        <div className="flex md:basis-1/4-gap-6 font-scandia flex-col self-stretch max-w-[27.5%] justify-center w-full px-11 py-8 md:pl-6 md:py-10 md:pr-2 rounded-[1.25rem] bg-neutral-0 dark:bg-neutral-900 border even:border-orange-500 odd:border-pink-700 shadow-border even:shadow-orange-500 odd:shadow-pink-700">
          <div className="flex items-center">
            <span className="font-bold font-heading text-8xl text-heading-xl-sm lg:text-heading-xl">
              10
            </span>
            <span className="font-bold font-heading text-8xl text-heading-xl-sm lg:text-heading-xl">
              M
            </span>
          </div>
          <p className="text-body-md">
            <span style={{ fontWeight: 600 }}>Pull</span>{" "}
            <span style={{ fontWeight: 600 }}>requests</span> reviewed
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center mt-30">
        <h2 className="font-medium text-5xl font-scandia text-center font-heading text-heading-sm-sm text-white dark:text-neutral-0">
          Trusted by <span style={{ color: "#25BAB1" }}>6,000+</span>{" "}
          <span style={{ color: "#25BAB1" }}>customers</span>
        </h2>
        <div className="flex container mx-auto w-full flex-col items-center mt-16 justify-center">
          {/* First row - 5 companies */}
          <div className="flex flex-wrap w-full items-center justify-between gap-12 mb-4">
            <span className="text-white text-3xl hover:text-gray-300 transition-colors duration-200 font-light">
              Mercury
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200 text-3xl font-light">
              Writer
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200  text-3xl font-light">
              Abnormal Security
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200 text-3xl font-light">
              Ashby
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200  text-3xl font-light">
              Chegg
            </span>
          </div>
          {/* Second row - 3 companies */}
          <div className="flex flex-wrap w-full mt-8 items-center justify-center gap-20">
            <span className="text-white hover:text-gray-300 transition-colors duration-200 text-3xl font-light">
              Sisense
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200  text-3xl font-light ">
              GitHub
            </span>
            <span className="text-white hover:text-gray-300 transition-colors duration-200  text-3xl font-light">
              GitLab
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
