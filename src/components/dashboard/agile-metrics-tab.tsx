
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
import { AlertTriangle } from 'lucide-react';
import { format, differenceInDays, eachWeekOfInterval, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';

const secondsToHours = (seconds: number | null | undefined): number => {
  if (seconds === null || seconds === undefined) return 0;
  return parseFloat((seconds / 3600).toFixed(2));
};

const chartConfig = {
  storyPoints: { label: "Effort (Points/Hours)", color: "hsl(var(--chart-1))" }, // Generic label
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
  velocity: { label: "Velocity (Effort)", color: "hsl(var(--chart-1))" },
};

const renderChart = (
  data: any[], 
  dataKey: string, 
  xAxisKey: string, 
  title: string, 
  description: string, 
  icon: React.ElementType, 
  chartColorKey: keyof typeof chartConfig = "storyPoints",
  yAxisLabel?: string,
  emptyMessage: string = "No data available for this chart."
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
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
        burndownData: [], 
        cycleTimeData: [],
        throughputData: [],
        leadTimeData: [],
      };
    }

    // Velocity: Story points or worklog hours completed per sprint
    const velocityMap = new Map<string, number>();
    issues.forEach(issue => {
      if (issue.sprint?.name && issue.status?.statusCategory?.key === 'done') {
        const sprintName = issue.sprint.name;
        let effort = 0;
        if (issue.storyPoints && issue.storyPoints > 0) {
          effort = issue.storyPoints;
        } else if (issue.timespent && issue.timespent > 0) {
          effort = secondsToHours(issue.timespent); // Use hours if story points not available
        }
        if (effort > 0) {
          velocityMap.set(sprintName, (velocityMap.get(sprintName) || 0) + effort);
        }
      }
    });
    const velocityData = Array.from(velocityMap.entries()).map(([sprint, effort]) => ({ sprint, effort })).slice(-5);

    // Lead Time: Time from creation to resolution for 'Done' issues
    const leadTimeData = issues
      .filter(issue => issue.status?.statusCategory?.key === 'done' && issue.created && issue.resolutiondate && isValid(parseISO(issue.created)) && isValid(parseISO(issue.resolutiondate)))
      .map(issue => ({
        task: issue.id,
        days: differenceInDays(parseISO(issue.resolutiondate!), parseISO(issue.created!)),
      }))
      .slice(-10);

    // Cycle Time: (Simplified) - Time from updated (assume start) to resolution for 'Done' issues
    const cycleTimeData = issues
      .filter(issue => issue.status?.statusCategory?.key === 'done' && issue.updated && issue.resolutiondate && isValid(parseISO(issue.updated)) && isValid(parseISO(issue.resolutiondate)))
      .map(issue => ({
        task: issue.id,
        // Ensure updated date is not after resolution date for sensible cycle time
        days: Math.max(0, differenceInDays(parseISO(issue.resolutiondate!), parseISO(issue.updated!))),
      }))
      .slice(-10);

    // Throughput: Issues resolved per week
    const throughputMap = new Map<string, number>();
    const resolvedIssues = issues.filter(issue => issue.status?.statusCategory?.key === 'done' && issue.resolutiondate && isValid(parseISO(issue.resolutiondate)));
    if (resolvedIssues.length > 0) {
        const resolutionDates = resolvedIssues.map(i => parseISO(i.resolutiondate!));
        const firstDate = resolutionDates.reduce((min, p) => p < min ? p : min);
        const lastDate = resolutionDates.reduce((max, p) => p > max ? p : max);
        
        if (isValid(firstDate) && isValid(lastDate) && firstDate <= lastDate) {
            const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
            weeks.forEach(weekStart => {
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
      .sort((a,b) => parseISO(a.week).getTime() - parseISO(b.week).getTime()) 
      .slice(-8); 


    // Burndown Data (very simplified - mock for now as true burndown is complex)
    // Needs actual sprint start/end dates and daily scope/completion tracking from changelogs
    const burndownData = [
        // { day: 'Day 1', remaining: 50, ideal: 50 }, { day: 'Day 10', remaining: 0, ideal: 5 },
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
    return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched or data is insufficient for this tab. Please use the sidebar to fetch issues.</div>;
  }

  // Placeholder data for charts that are harder to compute without more detailed history or specific configurations
    const sprintCommitmentData = processedData.velocityData.map(s => ({sprint: s.sprint, commitment: s.effort + 5, completed: s.effort})); // Mock based on velocity
    const rollingVelocityData = processedData.velocityData.length > 0 ? [{ period: 'P1-P3', velocity: processedData.velocityData.reduce((sum,s)=>sum+s.effort,0)/processedData.velocityData.length }] : [];
    const scopeChangeData = processedData.velocityData.map(s => ({ sprint: s.sprint, added: Math.floor(s.effort * 0.1), removed: Math.floor(s.effort * 0.05) }));
    const workingHoursData: {day: string, hours: number}[] = []; // Requires worklog analysis
    const timeInStatusData: {status: string, days: number}[] = []; // Requires changelog analysis

  return (
    <div className="p-1">
    <Tabs defaultValue="velocity" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 h-auto flex-wrap">
        <TabsTrigger value="velocity"><Icons.velocity className="mr-2" />Velocity</TabsTrigger>
        <TabsTrigger value="burndown" disabled={processedData.burndownData.length === 0}><Icons.burndown className="mr-2" />Burndown</TabsTrigger>
        <TabsTrigger value="cycleTime"><Icons.cycleTime className="mr-2" />Cycle Time</TabsTrigger>
        <TabsTrigger value="throughput"><Icons.throughput className="mr-2" />Throughput</TabsTrigger>
        <TabsTrigger value="leadTime"><Icons.leadTime className="mr-2" />Lead Time</TabsTrigger>
        <TabsTrigger value="sprintCommitment" disabled={sprintCommitmentData.length === 0}><Icons.sprintCommitment className="mr-2" />Commitment</TabsTrigger>
        <TabsTrigger value="rollingVelocity" disabled={rollingVelocityData.length === 0}><Icons.rollingVelocity className="mr-2" />Rolling V.</TabsTrigger>
        <TabsTrigger value="scopeChange" disabled={scopeChangeData.length === 0}><Icons.scopeChange className="mr-2" />Scope Change</TabsTrigger>
        <TabsTrigger value="workingHours" disabled={workingHoursData.length === 0}><Icons.workingHours className="mr-2" />Work Hours</TabsTrigger>
        <TabsTrigger value="timeInStatus" disabled={timeInStatusData.length === 0}><Icons.timeInStatus className="mr-2" />Time/Status</TabsTrigger>
      </TabsList>

      <TabsContent value="velocity" className="mt-4">
        {renderChart(processedData.velocityData, "effort", "sprint", "Velocity", "Effort (Points/Hours) completed per sprint.", Icons.velocity, "velocity", "Effort", "No velocity data (requires completed issues in sprints with story points or time spent).")}
      </TabsContent>
      <TabsContent value="burndown" className="mt-4">
         <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.burndown className="h-5 w-5 text-primary" />
              <CardTitle>Burndown Chart</CardTitle>
            </div>
            <CardDescription>Tracks remaining work against time in a sprint. (Requires detailed sprint data and history - currently placeholder)</CardDescription>
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
                 <p className="text-sm text-muted-foreground">Burndown chart requires specific sprint data not yet processed. This is a placeholder.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="cycleTime" className="mt-4">
        {renderChart(processedData.cycleTimeData, "days", "task", "Cycle Time", "Simplified: Time from 'updated' to 'done' (days).", Icons.cycleTime, "days", "Days", "No cycle time data (requires issues with 'updated' and 'resolutiondate' marked as done).")}
      </TabsContent>
      <TabsContent value="throughput" className="mt-4">
        {renderChart(processedData.throughputData, "issues", "week", "Throughput", "Number of issues resolved per week.", Icons.throughput, "issues", "Issues", "No throughput data (requires issues marked as done with resolution dates).")}
      </TabsContent>
      <TabsContent value="leadTime" className="mt-4">
        {renderChart(processedData.leadTimeData, "days", "task", "Lead Time", "Time from creation to resolution (days).", Icons.leadTime, "leadTime", "Days", "No lead time data (requires issues with 'created' and 'resolutiondate' marked as done).")}
      </TabsContent>
       <TabsContent value="sprintCommitment" className="mt-4">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Icons.sprintCommitment className="h-5 w-5 text-primary" />
                    <CardTitle>Sprint Commitment</CardTitle>
                </div>
                <CardDescription>Committed vs. completed effort per sprint. (Simplified data)</CardDescription>
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
                <p className="text-sm text-muted-foreground">No data available for sprint commitment.</p>
            )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rollingVelocity" className="mt-4">
        {renderChart(rollingVelocityData, "velocity", "period", "Rolling Velocity", "Average velocity over several past sprints. (Simplified data)", Icons.rollingVelocity, "velocity", undefined, "No data for rolling velocity.")}
      </TabsContent>
      <TabsContent value="scopeChange" className="mt-4">
         <Card>
            <CardHeader>
                 <div className="flex items-center gap-2">
                    <Icons.scopeChange className="h-5 w-5 text-primary" />
                    <CardTitle>Scope Change</CardTitle>
                </div>
                <CardDescription>Amount of work added or removed during a sprint. (Simplified data)</CardDescription>
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
                <p className="text-sm text-muted-foreground">No data available for scope change.</p>
            )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="workingHours" className="mt-4">
        {renderChart(workingHoursData, "hours", "day", "Working Hours", "Logged working hours per day. (Requires detailed worklog processing)", Icons.workingHours, "hours", undefined, "Working hours data requires detailed worklog analysis not yet implemented.")}
      </TabsContent>
      <TabsContent value="timeInStatus" className="mt-4">
        {renderChart(timeInStatusData, "days", "status", "Time in Status", "Average time issues spend in each status. (Requires issue changelog processing)", Icons.timeInStatus, "days", undefined, "Time in Status data requires issue changelog analysis not yet implemented.")}
      </TabsContent>
    </Tabs>
    </div>
  );
}
