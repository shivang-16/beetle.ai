"use client"

import { TrendingUp, GitPullRequest } from "lucide-react"
import { CartesianGrid, XAxis, YAxis, AreaChart, Area, ScatterChart, Scatter } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { DashboardData } from "@/types/dashboard"

interface PullRequestsChartProps {
  data: DashboardData;
}

const chartConfig = {
  suggested: {
    label: "PRs Suggested",
    color: "var(--chart-3)",
  },
  opened: {
    label: "PRs Opened",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig
import { format, parseISO } from "date-fns";

export function FullRepoReviewChart({ data }: { data: DashboardData }) {

  // Create chart data for visualization
    const fullRepoTrendData = (data.trends?.daily_full_repo_reviews ?? [])
    .map((d) => ({
      date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
      count: d.count,
    }))
    .filter((d) => d.count > 0); // Only show dots for days with reviews

    const singleSeriesConfig = {
    count: {
      label: "Count",
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="rounded-md">
    <CardHeader>
          <CardTitle className="text-sm">Full Repo Reviews </CardTitle>
          <CardDescription>Daily completed full repo reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={singleSeriesConfig}>
            <ScatterChart
              accessibilityLayer
              data={fullRepoTrendData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Scatter
                dataKey="count"
                fill="var(--color-count)"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
    </Card>
  )
}