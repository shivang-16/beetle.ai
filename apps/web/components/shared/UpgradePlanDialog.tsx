"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestUpgrade } from "@/app/(root)/dashboard/_actions/requestUpgrade";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UpgradePlanDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  // Upgrade modal open state
  const [open, setOpen] = useState(defaultOpen);

  const [startupName, setStartupName] = useState("");
  const [startupUrl, setStartupUrl] = useState("");
  const [description, setDescription] = useState("");
  const [requestStatus, setRequestStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Upgrade for free</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade Plan request</DialogTitle>
          <DialogDescription>
            Since we are in beta mode, upgradation are only for
            startups/companies. <br />
            <br />
          </DialogDescription>
          <ul className="mb-5 list-disc pl-5 text-sm">
            <li>Create teams and invite members</li>
            <li>
              Increase limits: PR analysis (20/day) and repo analysis (5/day)
            </li>
          </ul>
          <span className="text-sm">
            For assistance or a quick demo,{" "}
            <a
              href="https://cal.com/shivang-yadav/beetle"
              target="_blank"
              className="text-primary inline-block underline"
            >
              {" "}
              you can book a time{" "}
            </a>
            — We’ll be happy to help.
          </span>
        </DialogHeader>

        <div className="space-y-8 py-2">
          <div className="space-y-1">
            <p className="text-sm">Startup name</p>
            <Input
              placeholder="e.g. Acme Corp"
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm">Startup URL (where you’ll use Beetle)</p>
            <Input
              placeholder="https://github.com/acme"
              value={startupUrl}
              onChange={(e) => setStartupUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm">Description (optional)</p>
            <textarea
              placeholder="Briefly describe your organization and needs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-input bg-background placeholder:text-muted-foreground focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              rows={4}
            />
          </div>
          <div>
            <Button
              className="w-full"
              disabled={
                requestStatus === "submitting" || !startupName || !startupUrl
              }
              onClick={async () => {
                try {
                  setRequestStatus("submitting");
                  const res = await requestUpgrade({
                    startupName,
                    startupUrl,
                    description,
                  });
                  if (res?.success) {
                    setRequestStatus("success");
                    setOpen(false);
                  } else {
                    setRequestStatus("error");
                  }
                } catch {
                  setRequestStatus("error");
                }
              }}
            >
              {requestStatus === "submitting" ? "Requesting…" : "Request"}
            </Button>
            <p className="text-muted-foreground mt-6 text-xs">
              Once requested, we will verify and your plan will be upgraded in
              6–12 hours, Thanks for choosing Beetle.
            </p>
            {requestStatus === "success" && (
              <p className="mt-1 text-xs text-green-600">
                Request received — we’ll get back shortly.
              </p>
            )}
            {requestStatus === "error" && (
              <p className="mt-1 text-xs text-red-600">
                Failed to submit request, please try again.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
