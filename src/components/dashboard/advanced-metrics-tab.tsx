
"use client";

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO, eachDayOfInterval, isBefore, isEqual, isAfter } from 'date-fns';


const chartConfig = {
  todo: { label: "To Do", color: "hsl(var(--chart-1))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
  // inReview: { label: "In Review", color: "hsl(var(--chart-3))" }, // Simplified CFD, not using In Review explicitly
  done: { label: "Done", color: "hsl(var(--chart-4))" },
};


const LoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/2 mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[400px] w-full" />
    </CardContent>
  </Card>
);

export function AdvancedMetricsTab() {
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const cfdData = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const relevantIssues = issues.filter(issue => issue.created); // Only consider issues with a creation date

    if (relevantIssues.length === 0) return [];

    const dates = relevantIssues.map(issue => parseISO(issue.created!));
    if (relevantIssues.some(issue => issue.resolutiondate)) {
        relevantIssues.filter(issue => issue.resolutiondate).forEach(issue => dates.push(parseISO(issue.resolutiondate!)));
    }
    
    const minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
    const maxDate = new Date(); // Today or last relevant date
    
    // Create an interval of days (e.g., last 30 days or based on data range)
    const startDate = relevantIssues.length > 0 
                      ? parseISO(relevantIssues.reduce((earliest, issue) => issue.created! < earliest ? issue.created! : earliest, relevantIssues[0].created!))
                      : new Date(new Date().setDate(new Date().getDate() - 30)); // fallback to last 30 days
    const endDate = new Date(); // today

    if (startDate > endDate) return [];

    const daySeries = eachDayOfInterval({ start: startDate, end: endDate });

    return daySeries.map(day => {
      let todo = 0;
      let inProgress = 0;
      let done = 0;

      relevantIssues.forEach(issue => {
        const createdDate = parseISO(issue.created!);
        const resolutionDate = issue.resolutiondate ? parseISO(issue.resolutiondate) : null;
        
        // Is the issue created by this 'day'?
        if (isBefore(createdDate, day) || isEqual(createdDate, day)) {
          if (resolutionDate && (isBefore(resolutionDate, day) || isEqual(resolutionDate, day))) {
            done++;
          } else {
            // Approximation: if not done, check status category
            // 'new' -> To Do, 'indeterminate' -> In Progress
            // This is a simplification; true CFD needs status history.
            if (issue.status?.statusCategory?.key === 'new' || issue.status?.statusCategory?.key === 'todo') {
              todo++;
            } else if (issue.status?.statusCategory?.key === 'indeterminate' || issue.status?.statusCategory?.key === 'inprogress') {
              // Further check: if it was resolved *after* current 'day', it was in progress on 'day'
              if (resolutionDate && isAfter(resolutionDate, day)){
                 inProgress++;
              } else if (!resolutionDate) { // if not resolved yet at all
                 inProgress++;
              } else { // resolved before or on 'day', already counted in 'done'
                 todo++; // if it's not done and not in progress, assume todo
              }
            } else { // if no clear status or other category, assume todo if not done
                todo++;
            }
          }
        }
      });
      return {
        date: format(day, 'yyyy-MM-dd'),
        todo,
        inProgress,
        done,
      };
    }).slice(-60); // Show last 60 data points for readability
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
            <Icons.cfd className="h-5 w-5 text-primary" />
            <CardTitle>Cumulative Flow Diagram (CFD)</CardTitle>
          </div>
          <CardDescription>Visualizes the flow of work through different statuses over time. (Simplified)</CardDescription>
        </CardHeader>
        <CardContent>
          {cfdData && cfdData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[450px] w-full">
              <AreaChart data={cfdData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="done" stackId="1" stroke="var(--color-done)" fill="var(--color-done)" fillOpacity={0.6} name="Done" />
                {/* <Area type="monotone" dataKey="inReview" stackId="1" stroke="var(--color-inReview)" fill="var(--color-inReview)" fillOpacity={0.6} name="In Review" /> */}
                <Area type="monotone" dataKey="inProgress" stackId="1" stroke="var(--color-inProgress)" fill="var(--color-inProgress)" fillOpacity={0.6} name="In Progress" />
                <Area type="monotone" dataKey="todo" stackId="1" stroke="var(--color-todo)" fill="var(--color-todo)" fillOpacity={0.6} name="To Do" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data to generate CFD.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    