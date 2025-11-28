import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function SecuritySection() {
  return (
    <section className="border-b border-[#333333]">
      <div className="relative mx-auto max-w-[1563px] border-[#333333] p-6 md:border-r md:border-l md:p-14">
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

        <div className="relative z-10">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl leading-tight font-medium text-white md:text-4xl lg:text-5xl">
                Security-First Design
              </h2>
            </div>
            <Link href="/security">
              <Button
                variant="outline"
                className="group border-[#1a3d2f] bg-[#051810] text-white transition-colors hover:bg-[#0a2e20] hover:text-white"
              >
                View our security policy
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Card 1: SOC 2 Compliant */}
            <FeatureCard>
              <CardHeader className="pb-3">
                <div className="p-6">
                  <div className="mb-8 flex justify-center">
                    <ShieldCheck className="text-primary size-24 stroke-[1]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-6 pt-0">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="text-primary size-5" />
                    <h3 className="font-mono font-semibold tracking-wide text-white uppercase">
                      SOC 2 Aligned
                    </h3>
                  </div>
                  <p className="leading-relaxed text-zinc-400">
                    All data is encrypted at rest and in transit. We use
                    industry-standard encryption and security practices.
                  </p>
                </div>
              </CardContent>
            </FeatureCard>

            {/* Card 2: Enterprise Grade Security */}
            <FeatureCard>
              <CardHeader className="pb-3">
                <div className="p-6">
                  <div className="mb-8 flex justify-center">
                    <Lock className="text-primary size-24 stroke-[1]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-6 pt-0">
                  <div className="mb-3 flex items-center gap-2">
                    <Lock className="text-primary size-5" />
                    <h3 className="font-mono font-semibold tracking-wide text-white uppercase">
                      Isolated Review Environments
                    </h3>
                  </div>
                  <p className="leading-relaxed text-zinc-400">
                    We analyze your code in ephemeral, secure environments that
                    are instantly destroyed after use, leaving absolutely no
                    trace.
                  </p>
                </div>
              </CardContent>
            </FeatureCard>
          </div>
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
      "group relative rounded-none border-[#333333]/50 bg-black/40 shadow-zinc-950/5 backdrop-blur-3xl",
      className,
    )}
  >
    <CardDecorator />
    {children}
  </Card>
);

const CardDecorator = () => (
  <>
    <span className="border-primary absolute -top-px -left-px block size-3 border-t-2 border-l-2"></span>
    <span className="border-primary absolute -top-px -right-px block size-3 border-t-2 border-r-2"></span>
    <span className="border-primary absolute -bottom-px -left-px block size-3 border-b-2 border-l-2"></span>
    <span className="border-primary absolute -right-px -bottom-px block size-3 border-r-2 border-b-2"></span>
  </>
);
