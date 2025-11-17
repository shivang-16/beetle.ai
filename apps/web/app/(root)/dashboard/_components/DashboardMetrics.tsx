import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardData } from "@/types/dashboard";
import { GitBranch, GitPullRequest, Bug } from "lucide-react";
import { CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";
import { format, parseISO } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";

interface DashboardMetricsProps {
  data: DashboardData;
}

export const DashboardMetrics = ({ data }: DashboardMetricsProps) => {
  const rangeDays = data.trends?.range_days ?? 7;

  const prTrendData = (data.trends?.daily_pr_reviews ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  const fullRepoTrendData = (data.trends?.daily_full_repo_reviews ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  const prCommentsAvgTrendData = (data.trends?.daily_pr_comments_avg ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  const singleSeriesConfig = {
    count: {
      label: "Count",
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Trend Chart: PR Reviews (Gradient Area) */}
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-sm">PR Reviews </CardTitle>
          <CardDescription>Daily completed PR reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={singleSeriesConfig}>
            <AreaChart
              accessibilityLayer
              data={prTrendData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <defs>
                <linearGradient id="fillCountPR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#fillCountPR)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Trend Chart: Full Repo Reviews (Gradient Area) */}
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-sm">Full Repo Reviews </CardTitle>
          <CardDescription>Daily completed full repo reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={singleSeriesConfig}>
            <AreaChart
              accessibilityLayer
              data={fullRepoTrendData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <defs>
                <linearGradient id="fillCountRepo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#fillCountRepo)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Trend Chart: Avg PR Comments per Unique PR */}
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-sm">Avg Comments per PR </CardTitle>
          <CardDescription>Daily average comments across unique PRs</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={singleSeriesConfig}>
            <AreaChart
              accessibilityLayer
              data={prCommentsAvgTrendData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <defs>
                <linearGradient id="fillCountPRAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#fillCountPRAvg)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};