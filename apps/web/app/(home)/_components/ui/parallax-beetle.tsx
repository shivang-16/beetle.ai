"use client";

const ParallaxBeetle = () => {
  // const containerRef = useRef<HTMLDivElement>(null);
  // const textRef = useRef<HTMLDivElement>(null);

  const letters = "BEETLE".split("");

  return (
    <section className="fixed bottom-0 h-[26rem] bg-primary w-full -z-10">
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-[12rem] md:text-[22rem] lg:text-[22rem] xl:text-[28rem] font-black text-black/90 select-none leading-none tracking-tighter flex">
          {letters.map((letter, index) => (
            <span
              key={index}
              className="inline-block transition-all duration-300 ease-in-out hover:scale-x-[-1] hover:scale-y-[1.1] hover:rotate-6  cursor-pointer"
              style={{
                transformOrigin: "center center",
              }}
            >
              {letter}
            </span>
          ))}
        </h1>
      </div>
    </section>
  );
};

export default ParallaxBeetle;
