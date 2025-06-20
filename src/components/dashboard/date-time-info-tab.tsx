
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, differenceInDays, startOfWeek, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 p-1">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
      </Card>
    ))}
  </div>
);

export function DateTimeInfoTab() {
  const context = useContext(JiraDataContext);
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [selectedIssueType, setSelectedIssueType] = useState('All');

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueIssueTypes = useMemo(() => {
    if (!issues) return ['All'];
    const types = Array.from(new Set(issues.map(issue => issue.type?.name).filter(Boolean) as string[]));
    return ['All', ...types.sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const typeMatch = selectedIssueType === 'All' || issue.type?.name === selectedIssueType;
      let dateMatch = true; // Apply date range to created date for consistency
      if (dateRange.from && issue.created && isValid(parseISO(issue.created))) {
        dateMatch = dateMatch && parseISO(issue.created) >= dateRange.from;
      }
      if (dateRange.to && issue.created && isValid(parseISO(issue.created))) {
        const toDate = new Date(dateRange.to); toDate.setDate(toDate.getDate() + 1);
        dateMatch = dateMatch && parseISO(issue.created) < toDate;
      }
      return typeMatch && dateMatch;
    });
  }, [issues, dateRange, selectedIssueType]);

  const issuesCreatedOverTimeData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const validIssues = filteredIssues.filter(i => i.created && isValid(parseISO(i.created)));
    if (validIssues.length === 0) return [];

    const dates = validIssues.map(i => parseISO(i.created!));
    const minDate = dates.reduce((min, d) => d < min ? d : min);
    const maxDate = dates.reduce((max, d) => d > max ? d : max);
    
    if (!isValid(minDate) || !isValid(maxDate) || minDate > maxDate) return [];

    const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
    const countsPerWeek = weeks.map(weekStart => {
        const weekEndDay = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = validIssues.filter(i => {
            const createdDate = parseISO(i.created!);
            return createdDate >= weekStart && createdDate <= weekEndDay;
        }).length;
        return { date: format(weekStart, 'MMM d'), count };
    });
    return countsPerWeek;
  }, [filteredIssues]);

  const resolutionTimeHistogramData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const resolved = filteredIssues.filter(i => i.created && i.resolutiondate && isValid(parseISO(i.created)) && isValid(parseISO(i.resolutiondate)));
    if(resolved.length === 0) return [];

    const timeBuckets: Record<string, number> = { "<1d": 0, "1-3d": 0, "4-7d": 0, "8-14d": 0, "15-30d": 0, ">30d": 0 };
    resolved.forEach(issue => {
      const days = differenceInDays(parseISO(issue.resolutiondate!), parseISO(issue.created!));
      if (days < 1) timeBuckets["<1d"]++;
      else if (days <= 3) timeBuckets["1-3d"]++;
      else if (days <= 7) timeBuckets["4-7d"]++;
      else if (days <= 14) timeBuckets["8-14d"]++;
      else if (days <= 30) timeBuckets["15-30d"]++;
      else timeBuckets[">30d"]++;
    });
    return Object.entries(timeBuckets).map(([name, value]) => ({ name, value }));
  }, [filteredIssues]);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dti-date-range">Date Range (Created)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="dti-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && !dateRange.to && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (dateRange.to ? `Until ${format(dateRange.to, "LLL dd, y")}`: <span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="dti-issuetype-filter">Issue Type</Label>
            <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
              <SelectTrigger id="dti-issuetype-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueIssueTypes.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1"> {/* Changed to 1 col for better focus on line chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.lineChart className="h-5 w-5 text-primary" /><CardTitle>Issues Created Over Time</CardTitle></div>
            <CardDescription>Tracks issue creation trends (weekly).</CardDescription>
          </CardHeader>
          <CardContent>
            {issuesCreatedOverTimeData.length > 0 ? (
              <ChartContainer config={{ count: {label: "Issues", color: "hsl(var(--chart-1))"} }} className="h-[300px] w-full">
                <LineChart data={issuesCreatedOverTimeData} margin={{ left: -20, right: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                  <YAxis dataKey="count" allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8}/>
                  <Tooltip content={<ChartTooltipContent indicator="line" hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} name="Issues Created"/>
                </LineChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for issues created over time.</p>}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Resolution Time Histogram</CardTitle></div>
            <CardDescription>Shows how quickly issues are resolved.</CardDescription>
          </CardHeader>
          <CardContent>
            {resolutionTimeHistogramData.length > 0 ? (
               <ChartContainer config={{ value: {label: "Issues", color: "hsl(var(--chart-2))"} }} className="h-[300px] w-full">
                 <BarChart data={resolutionTimeHistogramData} margin={{ left: -20, right: 20 }}>
                   <CartesianGrid vertical={false} />
                   <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8}/>
                   <YAxis dataKey="value" allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8}/>
                   <Tooltip content={<ChartTooltipContent hideLabel />} />
                   <Legend content={<ChartLegendContent />} />
                   <Bar dataKey="value" name="Issues Resolved" fill="var(--color-value)" radius={4} />
                 </BarChart>
               </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for resolution time histogram.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
