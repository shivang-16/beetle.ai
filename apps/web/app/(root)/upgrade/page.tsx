'use client'

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UpgradePlanDialog } from "@/components/shared/UpgradePlanDialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { _config } from "@/lib/_config";

export default function UpgradePage() {
  const { getToken } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPlan = async () => {
      try {
        // Default to free if API base URL not configured
        if (!_config.API_BASE_URL) {
          if (!cancelled) {
            setIsFreePlan(true);
            setLoadingPlan(false);
          }
          return;
        }
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/subscription/features`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        const data = await res.json();
        const hasSubscription = Boolean(data?.hasSubscription);
        const planName: string | undefined = data?.subscription?.planName;
        const free = !hasSubscription || planName?.toLowerCase() === "free";
        if (!cancelled) {
          setIsFreePlan(Boolean(free));
          setLoadingPlan(false);
        }
      } catch (e) {
        if (!cancelled) {
          // On error, be conservative and show upgrade option
          setIsFreePlan(true);
          setLoadingPlan(false);
        }
      }
    };
    fetchPlan();
    return () => {
      cancelled = true;
    };
  }, [getToken]);
  return (
    <div className=" p-6">
      {/* Hero header */}
      <div className="relative mb-8 overflow-hidden rounded-lg border">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(16,185,129,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,.25) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
        <div className="relative z-10 px-6 py-6 md:py-14">
          <h1 className="font-bold tracking-tight text-emerald-700 text-3xl md:text-5xl">
            BEETLE PLANS
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Simple, transparent pricing for all your code assistant needs.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Great for personal use</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li>Personal account workspace</li>
              <li>Analyze repositories and pull requests</li>
              <li>Basic usage limits - 5 pr/day and 1 full repo analysis</li>
              <li>No team creation or member invites</li>
            </ul>
          </CardContent>
          <CardFooter>
            {loadingPlan ? (
              <Button variant="outline" className="w-full" disabled>
                Checking plan…
              </Button>
            ) : isFreePlan ? (
              <Button variant="outline" className="w-full" disabled>
                Current plan
              </Button>
            ) : null}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lite</CardTitle>
            <CardDescription>Teams and higher limits</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li>Create teams and invite members</li>
              <li>Increase limits: PR analysis up to 20/day</li>
              <li>Increase limits: Repo analysis up to 5/day</li>
              <li>Organization workspace with role-based access</li>
            </ul>
          </CardContent>
          <CardFooter>
            {/* Clicking this button opens the upgrade dialog */}
            {loadingPlan ? null : isFreePlan ? (
              <UpgradePlanDialog />
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Current plan
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

    </div>
  );
}