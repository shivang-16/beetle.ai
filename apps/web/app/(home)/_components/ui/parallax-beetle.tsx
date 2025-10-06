"use client";

const ParallaxBeetle = () => {
  // const containerRef = useRef<HTMLDivElement>(null);
  // const textRef = useRef<HTMLDivElement>(null);

  const letters = "BEETLE".split("");

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 460px) {
            .beetle-text-1480 {
              font-size: 6rem !important;
            }
          }
          @media (min-width: 520px) {
            .beetle-text-1480 {
              font-size: 7rem !important;
            }
          }
          @media (min-width: 640px) {
            .beetle-text-1480 {
              font-size: 9rem !important;
            }
          }
          @media (min-width: 768px) {
            .beetle-text-1480 {
              font-size: 12rem !important;
            }
          }
          @media (min-width: 900px) {
            .beetle-text-1480 {
              font-size: 15rem !important;
            }
          }
          @media (min-width: 1110px) {
            .beetle-text-1480 {
              font-size: 20rem !important;
            }
          }
          @media (min-width: 1300px) {
            .beetle-text-1480 {
              font-size: 23rem !important;
            }
          }
          @media (min-width: 1420px) {
            .beetle-text-1480 {
              font-size: 24rem !important;
            }
          }
          @media (min-width: 1580px) {
            .beetle-text-1480 {
              font-size: 26rem !important;
            }
          }
        `
      }} />
      <section className="fixed bottom-0 h-[10rem] sm:h-[14rem] md:h-[20rem] lg:h-[22rem] xl:h-[24rem] xxl:h-[26rem] bg-primary w-full -z-10 -mx-2 sm:-mx-5">
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="beetle-text-1480 text-[5rem] font-black text-black/90 select-none leading-none tracking-tighter flex">
          {letters.map((letter, index) => (
            <span
              key={index}
              className="inline-block transition-all duration-300 ease-in-out hover:scale-x-[-1] hover:scale-y-[1.1] hover:rotate-6  cursor-pointer"
              style={{
                transformOrigin: "center center",
              }}>
              {letter}
            </span>
          ))}
        </h1>
      </div>
    </section>
    </>
  );
};

export default ParallaxBeetle;
