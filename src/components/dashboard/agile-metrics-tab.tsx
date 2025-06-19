
"use client";

import React, { useContext, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, differenceInDays, eachWeekOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';

const chartConfig = {
  storyPoints: { label: "Story Points", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--chart-2))" },
  remaining: { label: "Remaining", color: "hsl(var(--chart-3))" },
  ideal: { label: "Ideal", color: "hsl(var(--chart-4))" },
  issues: { label: "Issues", color: "hsl(var(--chart-1))" },
  days: { label: "Days", color: "hsl(var(--chart-2))" },
  commitment: { label: "Commitment", color: "hsl(var(--chart-1))" },
  scopeChange: { label: "Scope Change", color: "hsl(var(--chart-5))" },
  leadTime: { label: "Lead Time (days)", color: "hsl(var(--chart-1))" },
  cycleTime: { label: "Cycle Time (days)", color: "hsl(var(--chart-2))" },
  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
  velocity: { label: "Velocity", color: "hsl(var(--chart-1))" },
};

const renderChart = (
  data: any[], 
  dataKey: string, 
  xAxisKey: string, 
  title: string, 
  description: string, 
  icon: React.ElementType, 
  chartColorKey: keyof typeof chartConfig = "storyPoints",
  yAxisLabel?: string
) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        {React.createElement(icon, { className: "h-5 w-5 text-primary"})}
        <CardTitle>{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}/>
            <Tooltip content={<ChartTooltipContent />} />
            <Legend content={<ChartLegendContent />} />
            <Bar dataKey={dataKey} fill={`var(--color-${chartColorKey})`} radius={4} />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground">No data available for this chart.</p>
      )}
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);


export function AgileMetricsTab() {
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const processedData = useMemo(() => {
    if (!issues || issues.length === 0) {
      return {
        velocityData: [],
        burndownData: [], // Simplified, actual burndown needs more granular data
        cycleTimeData: [],
        throughputData: [],
        leadTimeData: [],
      };
    }

    // Velocity: Story points completed per sprint (simplified: by most recent sprint found)
    const velocityMap = new Map<string, number>();
    issues.forEach(issue => {
      if (issue.sprint?.name && issue.status?.statusCategory?.key === 'done' && (issue.storyPoints || issue.customfield_12326)) {
        const sprintName = issue.sprint.name;
        const points = issue.storyPoints || issue.customfield_12326 || 0;
        velocityMap.set(sprintName, (velocityMap.get(sprintName) || 0) + points);
      }
    });
    const velocityData = Array.from(velocityMap.entries()).map(([sprint, storyPoints]) => ({ sprint, storyPoints })).slice(-5); // Show last 5

    // Lead Time: Time from creation to resolution for 'Done' issues
    const leadTimeData = issues
      .filter(issue => issue.status?.statusCategory?.key === 'done' && issue.created && issue.resolutiondate)
      .map(issue => ({
        task: issue.id,
        days: differenceInDays(parseISO(issue.resolutiondate!), parseISO(issue.created!)),
      }))
      .slice(-10); // show last 10 for chart

    // Cycle Time: (Simplified) - Time from updated (assume start) to resolution for 'Done' issues
    // A proper cycle time often uses specific status transition dates from changelog
    const cycleTimeData = issues
      .filter(issue => issue.status?.statusCategory?.key === 'done' && issue.updated && issue.resolutiondate)
      .map(issue => ({
        task: issue.id,
        days: Math.max(0, differenceInDays(parseISO(issue.resolutiondate!), parseISO(issue.updated!))), // Max 0 to avoid negative if updated is later
      }))
      .slice(-10);

    // Throughput: Issues resolved per week
    const throughputMap = new Map<string, number>();
    const resolvedIssues = issues.filter(issue => issue.status?.statusCategory?.key === 'done' && issue.resolutiondate);
    if (resolvedIssues.length > 0) {
        const firstDate = parseISO(resolvedIssues.reduce((min, p) => p.resolutiondate! < min ? p.resolutiondate! : min, resolvedIssues[0].resolutiondate!));
        const lastDate = parseISO(resolvedIssues.reduce((max, p) => p.resolutiondate! > max ? p.resolutiondate! : max, resolvedIssues[0].resolutiondate!));
        
        if (firstDate <= lastDate) {
            const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
            weeks.forEach(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const weekKey = format(weekStart, 'yyyy-MM-dd');
                throughputMap.set(weekKey, 0);
            });

            resolvedIssues.forEach(issue => {
                const resolutionDate = parseISO(issue.resolutiondate!);
                const weekStartForIssue = startOfWeek(resolutionDate, { weekStartsOn: 1 });
                const weekKey = format(weekStartForIssue, 'yyyy-MM-dd');
                if (throughputMap.has(weekKey)) {
                    throughputMap.set(weekKey, throughputMap.get(weekKey)! + 1);
                }
            });
        }
    }
    const throughputData = Array.from(throughputMap.entries())
      .map(([week, count]) => ({ week: format(parseISO(week), 'MMM d'), issues: count }))
      .sort((a,b) => parseISO(a.week).getTime() - parseISO(b.week).getTime()) // ensure chronological order
      .slice(-8); // Show last 8 weeks


    // Burndown Data (very simplified - mock for now as true burndown is complex)
    const burndownData = [
        { day: 'Day 1', remaining: 50, ideal: 50 }, { day: 'Day 10', remaining: 0, ideal: 5 },
    ];


    return { velocityData, burndownData, cycleTimeData, throughputData, leadTimeData };
  }, [issues]);


  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!issues || issues.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched. Please use the sidebar to fetch issues.</div>;
  }

  // Placeholder data for charts that are harder to compute without more detailed history
    const sprintCommitmentData = [ { sprint: 'Sprint A', commitment: 40, completed: 35 }];
    const rollingVelocityData = [ { period: 'P1-P3', velocity: 37.67 }];
    const scopeChangeData = [ { sprint: 'Sprint A', added: 5, removed: 2 }];
    const workingHoursData = [ { day: 'Mon', hours: 6 }, { day: 'Tue', hours: 7 }];
    const timeInStatusData = [ { status: 'To Do', days: 2 }, { status: 'In Progress', days: 5 }];


  return (
    <div className="p-1">
    <Tabs defaultValue="velocity" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 h-auto flex-wrap">
        <TabsTrigger value="velocity"><Icons.velocity className="mr-2" />Velocity</TabsTrigger>
        <TabsTrigger value="burndown"><Icons.burndown className="mr-2" />Burndown</TabsTrigger>
        <TabsTrigger value="cycleTime"><Icons.cycleTime className="mr-2" />Cycle Time</TabsTrigger>
        <TabsTrigger value="throughput"><Icons.throughput className="mr-2" />Throughput</TabsTrigger>
        <TabsTrigger value="leadTime"><Icons.leadTime className="mr-2" />Lead Time</TabsTrigger>
        <TabsTrigger value="sprintCommitment"><Icons.sprintCommitment className="mr-2" />Commitment</TabsTrigger>
        <TabsTrigger value="rollingVelocity"><Icons.rollingVelocity className="mr-2" />Rolling V.</TabsTrigger>
        <TabsTrigger value="scopeChange"><Icons.scopeChange className="mr-2" />Scope Change</TabsTrigger>
        <TabsTrigger value="workingHours"><Icons.workingHours className="mr-2" />Work Hours</TabsTrigger>
        <TabsTrigger value="timeInStatus"><Icons.timeInStatus className="mr-2" />Time/Status</TabsTrigger>
      </TabsList>

      <TabsContent value="velocity" className="mt-4">
        {renderChart(processedData.velocityData, "storyPoints", "sprint", "Velocity", "Story points completed per sprint.", Icons.velocity, "storyPoints", "Story Points")}
      </TabsContent>
      <TabsContent value="burndown" className="mt-4">
         <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.burndown className="h-5 w-5 text-primary" />
              <CardTitle>Burndown Chart</CardTitle>
            </div>
            <CardDescription>Tracks remaining work against time in a sprint. (Simplified/Mock)</CardDescription>
          </CardHeader>
          <CardContent>
            {processedData.burndownData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={processedData.burndownData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <Tooltip content={<ChartTooltipContent indicator="line" />} />
                    <Legend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
                </ChartContainer>
            ) : (
                 <p className="text-sm text-muted-foreground">No data available for Burndown chart.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="cycleTime" className="mt-4">
        {renderChart(processedData.cycleTimeData, "days", "task", "Cycle Time", "Simplified: Time from 'updated' to 'done' (days).", Icons.cycleTime, "days", "Days")}
      </TabsContent>
      <TabsContent value="throughput" className="mt-4">
        {renderChart(processedData.throughputData, "issues", "week", "Throughput", "Number of issues resolved per week.", Icons.throughput, "issues", "Issues")}
      </TabsContent>
      <TabsContent value="leadTime" className="mt-4">
        {renderChart(processedData.leadTimeData, "days", "task", "Lead Time", "Time from creation to resolution (days).", Icons.leadTime, "leadTime", "Days")}
      </TabsContent>
       <TabsContent value="sprintCommitment" className="mt-4">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Icons.sprintCommitment className="h-5 w-5 text-primary" />
                    <CardTitle>Sprint Commitment (Mock)</CardTitle>
                </div>
                <CardDescription>Committed vs. completed story points per sprint.</CardDescription>
            </CardHeader>
            <CardContent>
            {sprintCommitmentData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={sprintCommitmentData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="sprint" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="commitment" fill="var(--color-commitment)" radius={4} />
                        <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <p className="text-sm text-muted-foreground">No data available.</p>
            )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rollingVelocity" className="mt-4">
        {renderChart(rollingVelocityData, "velocity", "period", "Rolling Velocity (Mock)", "Average velocity over several past sprints.", Icons.rollingVelocity, "velocity")}
      </TabsContent>
      <TabsContent value="scopeChange" className="mt-4">
         <Card>
            <CardHeader>
                 <div className="flex items-center gap-2">
                    <Icons.scopeChange className="h-5 w-5 text-primary" />
                    <CardTitle>Scope Change (Mock)</CardTitle>
                </div>
                <CardDescription>Amount of work added or removed during a sprint.</CardDescription>
            </CardHeader>
            <CardContent>
            {scopeChangeData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={scopeChangeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="sprint" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="added" stackId="a" fill="var(--color-destructive)" radius={[4,4,0,0]}/>
                        <Bar dataKey="removed" stackId="a" fill="var(--color-scopeChange)" radius={[4,4,0,0]} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <p className="text-sm text-muted-foreground">No data available.</p>
            )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="workingHours" className="mt-4">
        {renderChart(workingHoursData, "hours", "day", "Working Hours (Mock)", "Logged working hours per day.", Icons.workingHours, "hours")}
      </TabsContent>
      <TabsContent value="timeInStatus" className="mt-4">
        {renderChart(timeInStatusData, "days", "status", "Time in Status (Mock)", "Average time issues spend in each status.", Icons.timeInStatus, "days")}
      </TabsContent>
    </Tabs>
    </div>
  );
}

    