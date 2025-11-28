import React from "react";
import FooterSection from "../_components/ui/footer";
import NavbarWeb from "../_components/ui/navbarWeb";
import ParallaxBeetle from "../_components/ui/parallax-beetle";
import SecurityTOC from "./toc";
import { Shield, Server, Lock, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#010010] text-white">
      <NavbarWeb />

      <div className="relative border-b border-[#333333]">
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
          <div className="relative z-10 py-12 md:py-20">
            <h1 className="mb-6 text-4xl font-medium md:text-6xl">
              Security Practices
            </h1>
            <p className="max-w-2xl text-xl text-zinc-400">
              Learn about our robust security policies and compliance standards.
              We are committed to transparency and protecting your data.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1563px] border-[#333333] md:border-r md:border-l">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar / Table of Contents */}
          {/* Sidebar / Table of Contents */}
          <SecurityTOC />

          {/* Main Content */}
          <div className="p-6 md:p-14 lg:w-3/4">
            <div className="prose prose-invert max-w-none space-y-16">
              <section id="hosting" className="scroll-mt-24">
                <div className="mb-6 flex items-center gap-3">
                  <Server className="text-primary size-6" />
                  <h2 className="m-0 text-3xl font-medium">
                    Infrastructure and Deployment
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-zinc-400">
                  Beetle is currently available as a cloud-based service, and we
                  are actively working on a self-hosted ("bring-your-own-cloud")
                  solution.
                </p>

                <div className="mt-8">
                  <h3 className="mb-4 text-xl font-medium text-white">
                    Cloud-based (hosted) services
                  </h3>
                  <div className="space-y-6 text-zinc-400">
                    <p className="leading-relaxed">
                      Our entire backend architecture is hosted on AWS EC2
                      instances, secured by Amazon Security. We use secured E2B
                      sandboxes for analysis execution, ensuring complete
                      isolation.
                    </p>

                    <div className="space-y-4">
                      <h4 className="font-medium text-white">
                        How Beetle Handles Your Code End-to-End Securely
                      </h4>
                      <ul className="list-disc space-y-2 pl-5">
                        <li>
                          <strong className="text-zinc-200">
                            Secure, Isolated Sandbox Execution:
                          </strong>{" "}
                          Every analysis runs inside a fully isolated sandbox
                          (powered by e2b). Your code never touches our main
                          servers.
                        </li>
                        <li>
                          <strong className="text-zinc-200">
                            Direct, Temporary Repo Cloning:
                          </strong>{" "}
                          We clone your repository directly into the sandbox,
                          using short-lived, read-only GitHub tokens.
                        </li>
                        <li>
                          <strong className="text-zinc-200">
                            Automatic Deletion After Review:
                          </strong>{" "}
                          Once the analysis is done, the entire sandbox,
                          including cloned code, logs, and temporary files — is
                          completely destroyed.
                        </li>
                        <li>
                          <strong className="text-zinc-200">
                            Built on SOC 2–Aligned Infrastructure:
                          </strong>{" "}
                          Beetle uses SOC 2 Type II certified platforms (like
                          MongoDB Atlas).
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-md border border-[#333333] bg-[#0a0a0a] p-4">
                      <p className="mb-1 font-medium text-white">In short:</p>
                      <p>
                        Beetle never stores your code, never exposes it, and
                        never reuses it. Everything happens in a secure sandbox…
                        and then disappears.
                      </p>
                    </div>

<p className="leading-relaxed">
This infrastructure for Beetle is provided and hosted by
Amazon Web Services, Inc. ("AWS"). Information about
security provided by AWS is available from the{" "}
<a
href="https://aws.amazon.com/security/"
target="_blank"
rel="noopener noreferrer"
className="text-primary hover:underline"
>
AWS Security website
</a>
. Information about security and privacy-related audits
and certifications received by AWS, including information
on SOC reports, is available from the{" "}
<a
href="https://aws.amazon.com/compliance/"
target="_blank"
rel="noopener noreferrer"
className="text-primary hover:underline"
>
AWS Compliance website
</a>
.
</p>

                  </div>
                </div>
              </section>

              <section id="ml-data" className="scroll-mt-24">
                <div className="mb-6 flex items-center gap-3">
                  <Shield className="text-primary size-6" />
                  <h2 className="m-0 text-3xl font-medium">
                    AI Models and Data Privacy
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-zinc-400">
                  We leverage enterprise-grade AI models provided by Amazon
                  Bedrock and Google Vertex AI. We take the security of customer
                  data very seriously. We do not train our models on customer
                  code. Your code is processed in ephemeral environments and is
                  not stored longer than necessary for the analysis.
                </p>
              </section>

              <section id="confidentiality" className="scroll-mt-24">
                <div className="mb-6 flex items-center gap-3">
                  <Lock className="text-primary size-6" />
                  <h2 className="m-0 text-3xl font-medium">
                    Data Protection and Security Measures
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-zinc-400">
                  We use MongoDB Atlas for our database infrastructure,
                  leveraging its robust security features:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">
                      End-to-End Encryption:
                    </strong>{" "}
                    Data is encrypted at rest (using AES-256) and in transit
                    (via TLS 1.2+).
                  </li>
                  <li>
                    <strong className="text-zinc-200">
                      Network Isolation:
                    </strong>{" "}
                    Database clusters run in a dedicated VPC with IP
                    whitelisting and peering.
                  </li>
                  <li>
                    <strong className="text-zinc-200">
                      Role-Based Access Control (RBAC):
                    </strong>{" "}
                    Strict granular permissions ensure least-privilege access.
                  </li>
                  <li>
                    <strong className="text-zinc-200">
                      Compliance & Auditing:
                    </strong>{" "}
                    MongoDB Atlas is SOC 2 Type II and ISO 27001 certified, with
                    comprehensive audit logs.
                  </li>
                </ul>
              </section>

              <section id="monitoring" className="scroll-mt-24">
                <div className="mb-6 flex items-center gap-3">
                  <Eye className="text-primary size-6" />
                  <h2 className="m-0 text-3xl font-medium">
                    Monitoring and Validation
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-zinc-400">
                  We employ continuous monitoring and automated vulnerability
                  scanning to ensure the security of our platform. We also
                  conduct regular third-party penetration testing and security
                  audits.
                </p>
              </section>

              <div className="mt-12 rounded-lg border border-[#333333] bg-[#0a0a0a] p-6">
                <h3 className="mb-2 text-lg font-medium text-white">
                  Have security questions?
                </h3>
                <p className="text-zinc-400">
                  If you have additional questions regarding security, we are
                  happy to answer them. Please write to{" "}
                  <a
                    href="mailto:shivang@beetleai.dev"
                    className="text-primary hover:underline"
                  >
                    shivang@beetleai.dev
                  </a>{" "}
                  and we will respond as quickly as we can.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterSection />
      <ParallaxBeetle />
    </main>
  );
}
