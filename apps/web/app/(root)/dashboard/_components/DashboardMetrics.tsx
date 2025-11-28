import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardData } from "@/types/dashboard";
import { CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";
import { format, parseISO } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";

interface DashboardMetricsProps {
  data: DashboardData;
}

export const DashboardMetrics = ({ data }: DashboardMetricsProps) => {

  const prTrendData = (data.trends?.daily_pr_reviews ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  // Calculate total PR reviews
  const totalPRReviews = prTrendData.reduce((sum, d) => sum + d.count, 0);


  const prCommentsAvgTrendData = (data.trends?.daily_pr_comments_avg ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  const prMergeTimeAvgTrendData = (data.trends?.daily_pr_merge_time_avg ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  // Debug: Log the raw data
  console.log("Raw merge time data:", data.trends?.daily_pr_merge_time_avg);
  console.log("Processed merge time data:", prMergeTimeAvgTrendData);

  // Calculate average merge time
  const avgMergeTimeHours = prMergeTimeAvgTrendData.length > 0
    ? prMergeTimeAvgTrendData.reduce((sum, d) => sum + d.count, 0) / prMergeTimeAvgTrendData.length
    : 0;
  
  console.log("Average merge time (hours):", avgMergeTimeHours);
  
  // Format merge time as days, hours, minutes, or seconds
  const formatMergeTime = (hours: number) => {
    const totalMinutes = hours * 60;
    
    if (totalMinutes < 1) {
      // Less than 1 minute, show in seconds
      const seconds = Math.round(totalMinutes * 60);
      return `${seconds}s`;
    }
    
    if (hours < 1) {
      // Less than 60 minutes, show in minutes (ceiling to avoid 0)
      const minutes = Math.ceil(totalMinutes);
      return `${minutes}m`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${remainingHours}h`;
  };

  // Calculate average comments
  const avgComments = prCommentsAvgTrendData.length > 0
    ? prCommentsAvgTrendData.reduce((sum, d) => sum + d.count, 0) / prCommentsAvgTrendData.length
    : 0;

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
          <div className="mb-4 -mt-2">
            <p className="text-4xl font-bold">{totalPRReviews} <span className="text-sm">PR</span></p>
          </div>
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

  {/* Trend Chart: Avg PR Merge Time */}
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-sm">Avg PR Merge Time </CardTitle>
          <CardDescription>Daily average time to merge PRs (hours)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 -mt-2">
            <p className="text-4xl font-bold">{formatMergeTime(avgMergeTimeHours)}</p>
          </div>
          <ChartContainer config={singleSeriesConfig}>
            <AreaChart
              accessibilityLayer
              data={prMergeTimeAvgTrendData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <defs>
                <linearGradient id="fillCountMergeTime" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#fillCountMergeTime)"
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
          <div className="mb-4 -mt-2">
            <p className="text-4xl font-bold">{avgComments.toFixed(1)}<span className="text-sm"> / PR</span></p>
          </div>
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