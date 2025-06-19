
"use client";

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react'; // For error icon
import { format, eachWeekOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';


const chartConfig = {
  openIssues: { label: "Open Issues", color: "hsl(var(--chart-1))" },
  completionRate: { label: "Completion Rate (Issues)", color: "hsl(var(--chart-2))" },
};

const LoadingSkeleton = () => (
  <div className="grid gap-6 p-1 md:grid-cols-1 lg:grid-cols-2">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);


export function TeamWorkloadTab() {
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const processedData = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { assigneeWorkloadData: [], taskCompletionRateData: [] };
    }

    // Assignee Workload: Number of open (not 'done') issues per assignee
    const assigneeMap = new Map<string, number>();
    issues.forEach(issue => {
      if (issue.status?.statusCategory?.key !== 'done' && issue.assignee?.displayName) {
        const assigneeName = issue.assignee.displayName;
        assigneeMap.set(assigneeName, (assigneeMap.get(assigneeName) || 0) + 1);
      }
    });
    const assigneeWorkloadData = Array.from(assigneeMap.entries()).map(([assignee, count]) => ({ assignee, openIssues: count }));

    // Task Completion Rate: Issues completed per week
    const completionMap = new Map<string, number>();
    const resolvedIssues = issues.filter(issue => issue.status?.statusCategory?.key === 'done' && issue.resolutiondate);
    
    if (resolvedIssues.length > 0) {
        const firstDate = parseISO(resolvedIssues.reduce((min, p) => p.resolutiondate! < min ? p.resolutiondate! : min, resolvedIssues[0].resolutiondate!));
        const lastDate = parseISO(resolvedIssues.reduce((max, p) => p.resolutiondate! > max ? p.resolutiondate! : max, resolvedIssues[0].resolutiondate!));

        if (firstDate <= lastDate) {
            const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
            weeks.forEach(weekStart => {
                const weekKey = format(weekStart, 'yyyy-MM-dd'); // Use a consistent key format
                completionMap.set(weekKey, 0);
            });

            resolvedIssues.forEach(issue => {
                const resolutionDate = parseISO(issue.resolutiondate!);
                const weekStartForIssue = startOfWeek(resolutionDate, { weekStartsOn: 1 });
                const weekKey = format(weekStartForIssue, 'yyyy-MM-dd');
                if (completionMap.has(weekKey)) {
                    completionMap.set(weekKey, completionMap.get(weekKey)! + 1);
                }
            });
        }
    }
    const taskCompletionRateData = Array.from(completionMap.entries())
      .map(([week, count]) => ({ week: format(parseISO(week), 'MMM d'), completionRate: count }))
      .sort((a,b) => parseISO(a.week).getTime() - parseISO(b.week).getTime()) // ensure chronological order
      .slice(-8); // Show last 8 weeks


    return { assigneeWorkloadData, taskCompletionRateData };
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

  return (
    <div className="grid gap-6 p-1 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.assigneeWorkload className="h-5 w-5 text-primary" />
            <CardTitle>Assignee Workload</CardTitle>
          </div>
          <CardDescription>Number of open issues per assignee.</CardDescription>
        </CardHeader>
        <CardContent>
          {processedData.assigneeWorkloadData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart data={processedData.assigneeWorkloadData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis dataKey="assignee" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="openIssues" fill="var(--color-openIssues)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No open issues found or no assignees with open issues.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.taskCompletion className="h-5 w-5 text-primary" />
            <CardTitle>Task Completion Rate</CardTitle>
          </div>
          <CardDescription>Weekly issues completed.</CardDescription>
        </CardHeader>
        <CardContent>
          {processedData.taskCompletionRateData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <LineChart data={processedData.taskCompletionRateData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis unit="" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="completionRate" stroke="var(--color-completionRate)" strokeWidth={3} dot={{ r: 5, fill: "var(--color-completionRate)" }} activeDot={{r: 7}} name="Issues Completed" />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No completed issues found to calculate rate.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    