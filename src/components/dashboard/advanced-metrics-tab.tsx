
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
import { format, parseISO, eachDayOfInterval, isBefore, isEqual, isAfter, isValid, subDays } from 'date-fns';


const chartConfig = {
  todo: { label: "To Do", color: "hsl(var(--chart-1))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
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

    const relevantIssues = issues.filter(issue => issue.created && isValid(parseISO(issue.created))); 

    if (relevantIssues.length === 0) return [];
    
    let minDateOverall = new Date();
    let maxDateOverall = subDays(new Date(), 90); // Default to 90 days ago if no issues

    if (relevantIssues.length > 0) {
        const createdDates = relevantIssues.map(issue => parseISO(issue.created!));
        const resolvedDates = relevantIssues.filter(issue => issue.resolutiondate && isValid(parseISO(issue.resolutiondate!))).map(issue => parseISO(issue.resolutiondate!));
        const allDates = [...createdDates, ...resolvedDates];

        if (allDates.length > 0) {
            minDateOverall = allDates.reduce((min, d) => d < min ? d : min, allDates[0]);
            maxDateOverall = allDates.reduce((max, d) => d > max ? d : max, allDates[0]);
        }
    }
    // Ensure maxDate is at least today if data is very recent or only created dates exist
    if (maxDateOverall < new Date()) maxDateOverall = new Date();
    // Ensure a reasonable range, e.g., if minDateOverall is too far in past, cap it, or ensure start is not after end
    if (minDateOverall > maxDateOverall) minDateOverall = subDays(maxDateOverall, 30);


    const daySeries = eachDayOfInterval({ start: minDateOverall, end: maxDateOverall });
    if (daySeries.length === 0) return [];

    return daySeries.map(day => {
      let todo = 0;
      let inProgress = 0;
      let done = 0;

      relevantIssues.forEach(issue => {
        const createdDate = parseISO(issue.created!);
        const resolutionDate = issue.resolutiondate && isValid(parseISO(issue.resolutiondate)) ? parseISO(issue.resolutiondate) : null;
        
        if (isBefore(createdDate, day) || isEqual(createdDate, day)) {
          if (resolutionDate && (isBefore(resolutionDate, day) || isEqual(resolutionDate, day))) {
            done++;
          } else {
            // Simplified logic: If not done, it's either To Do or In Progress.
            // This needs actual status history for accuracy.
            const statusKey = issue.status?.statusCategory?.key;
            if (statusKey === 'new' || statusKey === 'todo') {
              todo++;
            } else if (statusKey === 'indeterminate' || statusKey === 'inprogress') {
              inProgress++;
            } else if (!statusKey && !resolutionDate) { // No status category, not resolved -> assume ToDo
              todo++;
            } else if (statusKey && statusKey !== 'done' && !resolutionDate){ // Has status category, not done, not resolved -> assume InProgress
                inProgress++;
            } else { // Fallback, could be a new status category or an edge case
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
    }).slice(-90); // Show last 90 data points for readability, or adjust as needed
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

  if (!issues || issues.length === 0 || cfdData.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched or data is insufficient for CFD. Please fetch issues with created dates and statuses.</div>;
  }


  return (
    <div className="p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.cfd className="h-5 w-5 text-primary" />
            <CardTitle>Cumulative Flow Diagram (CFD)</CardTitle>
          </div>
          <CardDescription>Visualizes the flow of work through different statuses over time. (Simplified: based on current status and resolution date)</CardDescription>
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
                <Area type="monotone" dataKey="inProgress" stackId="1" stroke="var(--color-inProgress)" fill="var(--color-inProgress)" fillOpacity={0.6} name="In Progress" />
                <Area type="monotone" dataKey="todo" stackId="1" stroke="var(--color-todo)" fill="var(--color-todo)" fillOpacity={0.6} name="To Do" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data to generate CFD. Requires issues with creation dates and statuses.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
