import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { cn } from "@/lib/utils";
import { Calendar, LucideIcon, MapIcon } from "lucide-react";
import Image from "next/image";
import { ReactNode } from "react";

const loadingStates = [
  {
    text: "Securly cloning Git repository",
  },
  {
    text: "Parsing Abstract Syntax Trees",
  },
  {
    text: "Analysing Git history for better context",
  },
  {
    text: "Indexing codebase structure",
  },
  {
    text: "LLM connection established - a workflow that acts as humans",
  },
  {
    text: "Building analysis context - feed to Agent",
  },
  {
    text: "Processing streaming AI analysis",
  },
  {
    text: "Generating Github Issues along with Suggest Fix for those",
  },
  {
    text: "Let's F***** Go",
  },
];

export default function Features() {
  return (
    <section className="px-5 border-b border-[#333333]">
      <div className="relative mx-auto max-w-[1563px] md:p-14 p-6  border border-t-0 border-b-0 border-[#333333]">
        {/* Dark White Dotted Grid Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#000000",
            backgroundImage: `
              radial-gradient(circle, rgba(255, 255, 255, 0.1) 1.5px, transparent 1.5px)
            `,
            backgroundSize: "25px 25px",
            backgroundPosition: "0 0",
          }}
        />

        {/* Hero Text Section */}
        <div className="relative z-10 py-2 pb-48">
            {/* Main Heading */}
            <div className="space-y-1 text-white text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
              <div>
                We're not just static reviewer. We're
              </div>
              <div>
                engineering agent that think like humans,
              </div>
              <div>
                and work better with them.
              </div>
            </div>

            {/* Description Paragraphs */}
            <div className="space-y-6 text-white/80 text-lg leading-relaxed flex pt-72">
              <div className="w-[50%]">
              </div>
              <div className="text-[1rem] w-[50%]">
              <p className="mb-5">
                At <span className="text-primary">Beetle AI</span>, we believe intelligence isn't just about generating answers—it's about understanding context, reasoning through complexity, and acting with intent.
              </p>
              <p>
                True AI should be controllable, predictable in behavior, steerable by design, and fully auditable in every step. It must be context-aware, able to learn from interactions and adapt over time. And it has to be tool-native, seamlessly operating within real environments, not isolated sandboxes.
              </p>
              </div>
           
            </div>
        </div>

        <div className="mx-auto grid gap-4 lg:grid-cols-2">
          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={MapIcon}
                title="Auto Github Issues and Pull Requests"
                description="Generate Github Issues and Pull Requests based on the analysis."
              />
            </CardHeader>

            <div className="relative border-t border-[#333333] border-dashed max-sm:mb-6">
              <div
                aria-hidden
                className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,var(--color-primary),var(--color-white)_100%)]"
              />
              <div className="aspect-76/59 p-1 px-6">
                <DualModeImage
                  darkSrc="/analysis-page-dark.png"
                  alt="analysis illustration"
                  width={1207}
                  height={929}
                />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={Calendar}
                title="Advanced Analysis"
                description="Multi-step analysis process, providing the best insights about your codebase."
              />
            </CardHeader>

            <CardContent>
              <div className="relative max-sm:mb-6">
                <div className="aspect-76/59 h-max overflow-hidden rounded-lg border border-[#333333]/50">
                  <MultiStepLoader
                    loadingStates={loadingStates}
                    loading
                    loop
                    duration={2000}
                  />
                </div>
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard className="p-6 lg:col-span-2">
            <p className="mx-auto my-6 max-w-md text-balance text-center text-2xl font-semibold text-zinc-400">
              Smart scheduling with automated reminders for maintenance.
            </p>

            <div className="flex justify-center gap-6 overflow-hidden">
              <CircularUI
                label="Inclusion"
                circles={[{ pattern: "border" }, { pattern: "border" }]}
              />

              <CircularUI
                label="Inclusion"
                circles={[{ pattern: "none" }, { pattern: "primary" }]}
              />

              <CircularUI
                label="Join"
                circles={[{ pattern: "blue" }, { pattern: "none" }]}
              />

              <CircularUI
                label="Exclusion"
                circles={[{ pattern: "primary" }, { pattern: "none" }]}
                className="hidden sm:block"
              />
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  children: ReactNode;
  className?: string;
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
  <Card
    className={cn(
      "group relative rounded-none shadow-zinc-950/5 bg-black/40 backdrop-blur-3xl border-[#333333]/50",
      className
    )}>
    <CardDecorator />
    {children}
  </Card>
);

const CardDecorator = () => (
  <>
    <span className="border-primary absolute -left-px -top-px block size-3 border-l-2 border-t-2"></span>
    <span className="border-primary absolute -right-px -top-px block size-3 border-r-2 border-t-2"></span>
    <span className="border-primary absolute -bottom-px -left-px block size-3 border-b-2 border-l-2"></span>
    <span className="border-primary absolute -bottom-px -right-px block size-3 border-b-2 border-r-2"></span>
  </>
);

interface CardHeadingProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
  <div className="p-6">
    <span className="text-white flex items-center gap-2">
      <Icon className="size-4" />
      {title}
    </span>
    <p className="mt-8 text-2xl text-zinc-400 font-semibold">{description}</p>
  </div>
);

interface DualModeImageProps {
  darkSrc: string;
  // lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const DualModeImage = ({
  darkSrc,
  // lightSrc,
  alt,
  width,
  height,
  className,
}: DualModeImageProps) => (
  <>
    <Image
      src={darkSrc}
      className={cn("", className)}
      alt={`${alt} dark`}
      width={width}
      height={height}
    />
    {/* <Image
      src={lightSrc}
      className={cn("shadow dark:hidden", className)}
      alt={`${alt} light`}
      width={width}
      height={height}
    /> */}
  </>
);

interface CircleConfig {
  pattern: "none" | "border" | "primary" | "blue";
}

interface CircularUIProps {
  label: string;
  circles: CircleConfig[];
  className?: string;
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
  <div className={className}>
    <div className="bg-linear-to-b from-[#090909] size-fit rounded-2xl to-transparent p-px">
      <div className="bg-linear-to-b from-[#030303] to-muted/25 relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] p-4">
        {circles.map((circle, i) => (
          <div
            key={i}
            className={cn("size-7 rounded-full border sm:size-8", {
              "border-primary": circle.pattern === "none",
              "border-primary bg-[repeating-linear-gradient(-45deg,var(--color-border),var(--color-border)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "border",
              "border-primary bg-background bg-[repeating-linear-gradient(-45deg,var(--color-primary),var(--color-primary)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "primary",
              "bg-background z-1 border-blue-500 bg-[repeating-linear-gradient(-45deg,var(--color-blue-500),var(--color-blue-500)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "blue",
            })}></div>
        ))}
      </div>
    </div>
    <span className="text-muted-foreground mt-1.5 block text-center text-sm">
      {label}
    </span>
  </div>
);
