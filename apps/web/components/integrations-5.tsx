import {
  Gemini,
  ChatGPT,
  Anthropic,
  DeepSeek,
  XAI,
  Qwen
} from "@/components/logos";
import { LogoIcon } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function IntegrationsSection() {
  return (
    <section className="px-5 border-b border-[#333333]">
      <div className="mx-auto max-w-[1563px] py-24 md:py-32 px-6 border border-t-0 border-b-0 border-[#333333]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="aspect-16/10 group relative mx-auto flex max-w-[22rem] items-center justify-between sm:max-w-sm">
            <div
              role="presentation"
              className="bg-linear-to-b border-foreground/5 absolute inset-0 z-10 aspect-square animate-spin items-center justify-center rounded-full border-t from-lime-500/15 to-transparent to-25% opacity-0 duration-[3.5s] group-hover:opacity-100 dark:from-white/5"></div>
            <div
              role="presentation"
              className="bg-linear-to-b border-foreground/5 absolute inset-16 z-10 aspect-square scale-90 animate-spin items-center justify-center rounded-full border-t from-blue-500/15 to-transparent to-25% opacity-0 duration-[3.5s] group-hover:opacity-100"></div>
            <div className="bg-linear-to-b from-muted-foreground/15 absolute inset-0 flex aspect-square items-center justify-center rounded-full border-t border-[#333333] to-transparent to-25%">
              <IntegrationCard className="-translate-x-1/6 absolute left-0 top-1/4 -translate-y-1/4">
                <ChatGPT />
              </IntegrationCard>
              <IntegrationCard className="absolute top-0 -translate-y-1/2">
                <Anthropic />
              </IntegrationCard>
              <IntegrationCard className="translate-x-1/6 absolute right-0 top-1/4 -translate-y-1/4">
                <Gemini />
              </IntegrationCard>
            </div>
            <div className="bg-linear-to-b from-muted-foreground/15 absolute inset-16 flex aspect-square scale-90 items-center justify-center rounded-full border-t border-[#333333] to-transparent to-25%">
              <IntegrationCard className="absolute top-0 -translate-y-1/2">
                <DeepSeek />
              </IntegrationCard>
              <IntegrationCard className="absolute left-0 top-1/4 -translate-x-1/4 -translate-y-1/4">
                <XAI />
              </IntegrationCard>
              <IntegrationCard className="absolute left-0 top-1/4 -translate-x-1/4 -translate-y-1/4">
                <Qwen />
              </IntegrationCard>
            </div>
            <div className="absolute inset-x-0 bottom-0 mx-auto my-2 flex w-fit justify-center gap-2">
              <div className="bg-muted relative z-20 rounded-full border p-1">
                <IntegrationCard
                  className="shadow-black-950/10 dark:bg-background size-16 border-black/20 shadow-xl dark:border-white/25 dark:shadow-white/15"
                  isCenter={true}>
                  <LogoIcon className="text-blue-500" />
                </IntegrationCard>
              </div>
            </div>
          </div>
          <div className="bg-linear-to-t from-black relative z-20 mx-auto mt-12 max-w-lg space-y-6 from-55% text-center">
            <h2 className="text-balance text-3xl font-semibold md:text-4xl text-white">
              Choose your AI model
            </h2>
            <p className="text-white/60">
              Powered by the world's most advanced AI models. Beetle AI integrates 
              with leading language models to deliver intelligent, context-aware 
              responses and capabilities.
            </p>

            <Button variant="outline" size="sm" asChild>
              <Link href="#">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const IntegrationCard = ({
  children,
  className,
  isCenter = false,
}: {
  children: React.ReactNode;
  className?: string;
  position?:
    | "left-top"
    | "left-middle"
    | "left-bottom"
    | "right-top"
    | "right-middle"
    | "right-bottom";
  isCenter?: boolean;
}) => {
  return (
    <div
      className={cn(
        "relative z-30 flex size-12 rounded-full border border-[#333333] bg-white/5 shadow-sm shadow-black/5 backdrop-blur-md",
        className
      )}>
      <div className={cn("m-auto size-fit *:size-5", isCenter && "*:size-8")}>
        {children}
      </div>
    </div>
  );
};
