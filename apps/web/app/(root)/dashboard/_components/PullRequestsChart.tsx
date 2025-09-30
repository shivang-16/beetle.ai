"use client"

import { TrendingUp, GitPullRequest } from "lucide-react"
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from "recharts"

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

export function PullRequestsChart({ data }: PullRequestsChartProps) {
  // Use main dashboard metrics data
  const totalSuggested = data.full_repo_review.total_pull_request_suggested;
  const totalOpened = data.full_repo_review.pull_request_opened;
  const conversionRate = totalSuggested > 0 ? ((totalOpened / totalSuggested) * 100).toFixed(1) : "0";

  // Create chart data for visualization
  const chartData = [
    {
      category: "Pull Requests",
      suggested: totalSuggested,
      opened: totalOpened,
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5" />
          Pull Requests Trend
        </CardTitle>
        <CardDescription>
          Suggested vs Opened Pull Requests Over Time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent />} 
            />
            <Bar
              dataKey="suggested"
              fill="var(--color-suggested)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="opened"
              fill="var(--color-opened)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {conversionRate}% conversion rate <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {totalOpened} PRs opened out of {totalSuggested} suggested
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}