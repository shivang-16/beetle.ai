"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function ReportIssuePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">🪲 Report a Bug</h1>
        <p className="text-muted-foreground">
          Thanks for using Beetle AI. We’re an engineering agent that thinks
          like humans and works better with them. If something isn’t behaving as
          expected on{" "}
          <span className="font-semibold">https://beetleai.dev</span>, let us
          know — your feedback helps us improve.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">How to Report</h2>
          <div className="space-y-3">
            <p>You can report issues in two ways:</p>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                <span className="font-medium">GitHub Issues:</span> Open the
                repository’s issues and file a new ticket.
                <br />
                <a
                  href="https://github.com/beetles-ai/report-a-bug/issues/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  github.com/beetles-ai/report-a-bug/issues/new
                </a>
              </li>
              <li>
                <span className="font-medium">Direct Form:</span> Use the button
                below to prefill a new issue from our site and finish
                attachments on GitHub.
              </li>
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            You can email for any kind of issue you face or anything you’d like
            to discuss about Beetle. If you prefer a quick chat, feel free to
            schedule a call.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Email:{" "}
              <a
                href="mailto:shivang@beetleai.dev"
                className="text-primary underline"
              >
                shivang@beetleai.dev
              </a>
            </li>
            <li>
              Schedule:{" "}
              <a
                href="https://cal.com/shivang-yadav/beetle"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                cal.com/shivang-yadav/beetle
              </a>
            </li>
          </ul>
        </div>

        <a
          href="https://github.com/beetles-ai/report-a-bug/issues/new"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-start gap-2"
        >
          <Button className="cursor-pointer">Open an Issue</Button>
        </a>
        <blockquote className="rounded-md border p-4 text-sm leading-relaxed">
          Thanks again for your feedback and valuable time to report an issue.
          Together, we make Beetle AI better 🪲✨
        </blockquote>

        <div className="space-y-4"></div>
      </div>
    </div>
  );
}
