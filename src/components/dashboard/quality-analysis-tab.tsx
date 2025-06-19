
"use client";

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { format, eachWeekOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';

const chartConfig = {
  bugsReported: { label: "Bugs Reported", color: "hsl(var(--chart-1))" }, // Reddish
  bugsResolved: { label: "Bugs Resolved", color: "hsl(var(--chart-2))" }, // Greenish
};

const LoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/2 mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[350px] w-full" />
    </CardContent>
  </Card>
);

export function QualityAnalysisTab() {
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const bugTrendsData = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const bugs = issues.filter(issue => issue.type?.name?.toLowerCase() === 'bug');
    if (bugs.length === 0) return [];

    const reportedMap = new Map<string, number>();
    const resolvedMap = new Map<string, number>();

    const allDates = bugs.flatMap(bug => [
        bug.created ? parseISO(bug.created) : null,
        bug.resolutiondate ? parseISO(bug.resolutiondate) : null
    ]).filter(Boolean) as Date[];

    if (allDates.length === 0) return [];
    
    const minDate = allDates.reduce((min, d) => d < min ? d : min, allDates[0]);
    const maxDate = allDates.reduce((max, d) => d > max ? d : max, allDates[0]);

    const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
    
    weeks.forEach(weekStart => {
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        reportedMap.set(weekKey, 0);
        resolvedMap.set(weekKey, 0);
    });

    bugs.forEach(bug => {
      if (bug.created) {
        const createdDate = parseISO(bug.created);
        const weekStartForIssue = startOfWeek(createdDate, { weekStartsOn: 1 });
        const weekKey = format(weekStartForIssue, 'yyyy-MM-dd');
        if (reportedMap.has(weekKey)) {
          reportedMap.set(weekKey, reportedMap.get(weekKey)! + 1);
        }
      }
      if (bug.resolutiondate) {
        const resolvedDate = parseISO(bug.resolutiondate);
        const weekStartForIssue = startOfWeek(resolvedDate, { weekStartsOn: 1 });
        const weekKey = format(weekStartForIssue, 'yyyy-MM-dd');
        if (resolvedMap.has(weekKey)) {
          resolvedMap.set(weekKey, resolvedMap.get(weekKey)! + 1);
        }
      }
    });
    
    return Array.from(reportedMap.keys())
      .map(weekKey => ({
        week: format(parseISO(weekKey), 'MMM d'),
        bugsReported: reportedMap.get(weekKey) || 0,
        bugsResolved: resolvedMap.get(weekKey) || 0,
      }))
      .sort((a,b) => parseISO(a.week).getTime() - parseISO(b.week).getTime()) // ensure chronological order
      .slice(-12); // Show last 12 weeks

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
    <div className="p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.bugTrends className="h-5 w-5 text-primary" />
            <CardTitle>Bug Trends</CardTitle>
          </div>
          <CardDescription>Weekly trends of reported vs. resolved bugs.</CardDescription>
        </CardHeader>
        <CardContent>
          {bugTrendsData && bugTrendsData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart data={bugTrendsData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false}/>
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="bugsReported" 
                  stroke="var(--color-bugsReported)" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: "var(--color-bugsReported)" }} 
                  activeDot={{r: 7}}
                />
                <Line 
                  type="monotone" 
                  dataKey="bugsResolved" 
                  stroke="var(--color-bugsResolved)" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: "var(--color-bugsResolved)" }} 
                  activeDot={{r: 7}}
                />
              </LineChart>
            </ChartContainer>
          ) : (
             <p className="text-sm text-muted-foreground">No bug data available for these trends.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    