"use client"

import { TrendingUp, Activity } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { format, parseISO } from "date-fns"

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

interface ActivityOverviewChartProps {
  data: DashboardData;
}

const chartConfig = {
  issues_suggested: {
    label: "Issues Suggested",
    color: "var(--chart-1)",
  },
  issues_opened: {
    label: "Issues Opened",
    color: "var(--chart-2)",
  },
  prs_suggested: {
    label: "PRs Suggested",
    color: "var(--chart-3)",
  },
  prs_opened: {
    label: "PRs Opened",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function ActivityOverviewChart({ data }: ActivityOverviewChartProps) {
  // Transform the data for the chart
  const chartData = data.recent_activity.full_repo
    .map((repo) => ({
      date: format(parseISO(repo.date), "MMM dd"),
      fullDate: repo.date,
      issues_suggested: repo.total_github_issues_suggested,
      issues_opened: repo.github_issues_opened,
      prs_suggested: repo.total_pull_request_suggested,
      prs_opened: repo.pull_request_opened,
      repo_name: repo.repo_name,
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    .slice(-7); // Show last 7 data points

  // Calculate overall metrics
  const totalIssuesSuggested = chartData.reduce((sum, item) => sum + item.issues_suggested, 0);
  const totalIssuesOpened = chartData.reduce((sum, item) => sum + item.issues_opened, 0);
  const totalPRsSuggested = chartData.reduce((sum, item) => sum + item.prs_suggested, 0);
  const totalPRsOpened = chartData.reduce((sum, item) => sum + item.prs_opened, 0);
  
  const overallActivity = totalIssuesSuggested + totalPRsSuggested;
  const overallImplemented = totalIssuesOpened + totalPRsOpened;
  const implementationRate = overallActivity > 0 ? ((overallImplemented / overallActivity) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Overview
        </CardTitle>
        <CardDescription>
          Complete view of Issues and Pull Requests activity over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent 
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.repo_name} - ${value}`;
                  }
                  return value;
                }}
              />} 
            />
            <Line
              dataKey="issues_suggested"
              type="monotone"
              stroke="var(--color-issues_suggested)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-issues_suggested)",
                strokeWidth: 2,
                r: 3,
              }}
              strokeDasharray="5 5"
            />
            <Line
              dataKey="issues_opened"
              type="monotone"
              stroke="var(--color-issues_opened)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-issues_opened)",
                strokeWidth: 2,
                r: 4,
              }}
            />
            <Line
              dataKey="prs_suggested"
              type="monotone"
              stroke="var(--color-prs_suggested)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-prs_suggested)",
                strokeWidth: 2,
                r: 3,
              }}
              strokeDasharray="5 5"
            />
            <Line
              dataKey="prs_opened"
              type="monotone"
              stroke="var(--color-prs_opened)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-prs_opened)",
                strokeWidth: 2,
                r: 4,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {implementationRate}% implementation rate <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {overallImplemented} items implemented out of {overallActivity} suggested
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}