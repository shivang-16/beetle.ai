import React from 'react'
import Image from 'next/image'
import roundstar from "../../../public/Exclude.png"
import bluecircle from "../../../public/Mask group.png"

const heroSection = () => {
  return (
    <section className='mb-40'>
         <div className="pt-[12%] px-6 relative z-10">
        {/* Hero Section */}
        <div className="max-w-4xl font-scandia mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Eliminate Bugs Before They Ship. Automatically.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Let your AI agent crawl every PR, run real browser tests, and raise clean, working fixes — so your team ships with confidence.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <button
                className="relative px-12 py-4 text-lg rounded-full font-semibold bg-[#FF6A75] text-white transition-all hover:text-black hover:cursor-pointer duration-700 ease-in-out grainy-hover overflow-hidden"
            >
                <span className="">Get started free</span>
            </button>
            
            <p className="text-gray-400 hover:text-gray-300 transition-colors duration-200 cursor-pointer">
              Want in-editor reviews? → Learn More
            </p>
          </div>
          
          {/* Features */}
          <div className="mt-12 text-white flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
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
              preload="metadata"
            >
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
   
  )
}

export default heroSection
