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
    text: "Generating Context-driven Code Suggestion for your code",
  },
  {
    text: "Let's F***** Go",
  },
];

export default function Features() {
  return (
    <section className="border-b border-[#333333]">
      <div className="relative mx-auto max-w-[1563px] md:p-14 p-6 md:border-l md:border-r border-[#333333]">
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
            <div className="space-y-1 text-white text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
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
              <div className="text-[1rem] w-[100%] sm:w-[50%]">
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
                title="Pull Requests Reviews"
                description="Smart, context-driven code review comments tailored to your PRs"
              />
            </CardHeader>

            <div className="relative border-t border-[#333333] border-dashed max-sm:mb-6">
              <div
                aria-hidden
                className="absolute inset-0 [background:radial-gradient(125%_200%_at_50%_0%,transparent_40%,var(--color-primary),var(--color-white)_100%)]"
              />
              <div className="aspect-76/59 p-1 px-6">
                <DualModeImage
                  darkSrc="/pr_review_3.png"
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

          <div className="lg:col-span-2 grid gap-4 lg:grid-cols-3">
            <FeatureCard className="p-2 lg:col-span-2">
                 <CardHeader className="pb-3">
              <CardHeading
                icon={MapIcon}
                title="Chat in Pull Request"
                description="Ship faster with agentic Chat!"

              />
            </CardHeader>
              <div className="flex flex-col items-center justify-center gap-8 ">
                
                  {/* <p className="text-zinc-400 text-lg px-12  ">
Start chatting and watch the workflow build itself. Code, tests, issues, reviews — done faster, and smarter with every use.                  </p>
                   */}
                   <DualModeImage
                      darkSrc="/pr_review.png"
                      alt="analysis illustration"
                      width={700}
                      height={600}
                      className="m-auto border-2 rounded-md"
                    />               
              </div>
            </FeatureCard>

            <FeatureCard className="p-2 lg:col-span-1">         
              <CardHeader className="pb-3">
              <CardHeading
                icon={MapIcon}
                title="Tag Beetle"
                description="Got a question? Just ask @Beetle."

              />
            </CardHeader>
                  <div className="mb-6 w-full flex justify-center">
                    <Image
                      src="/@beetle.png"
                      alt="beetle card"
                      width={308}
                      height={308}
                      className="rounded-md"
                    />
                  </div>
                {/* <h3 className="text-white text-2xl md:text-3xl font-semibold">
                  More signal. Less noise.
                </h3>
                <p className="mt-4 text-zinc-400 text-lg">
                  Automatically runs popular static analyzers, linters, and security tools combined with Gen-AI's advanced reasoning models. Code graph analysis enhances context for deeper code understanding, delivering best-in-class signal-to-noise ratio.
                </p> */}
              
            </FeatureCard>
          </div>
              <FeatureCard className="p-2 lg:col-span-2">         
              <CardHeader className="pb-3">
              <CardHeading
                icon={MapIcon}
                title="Full Repo Reviews"
                description="Say hello to Beetle’s end-to-end repo analysis."

              />
            </CardHeader>
                  <div className="mb-6 w-full flex justify-center">
                    <Image
                      src="/analysis-page.png"
                      alt="beetle card"
                      width={1100}
                      height={700}
                      className="rounded-md"
                    />
                  </div>
                {/* <h3 className="text-white text-2xl md:text-3xl font-semibold">
                  More signal. Less noise.
                </h3>
                <p className="mt-4 text-zinc-400 text-lg">
                  Automatically runs popular static analyzers, linters, and security tools combined with Gen-AI's advanced reasoning models. Code graph analysis enhances context for deeper code understanding, delivering best-in-class signal-to-noise ratio.
                </p> */}
              
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
