
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
];

const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 p-1">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export function GeneralInfoTab() {
  const context = useContext(JiraDataContext);
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const uniqueProjects = useMemo(() => {
    if (!issues) return ['All'];
    const projects = Array.from(new Set(issues.map(issue => issue.project?.name).filter(Boolean) as string[]));
    return ['All', ...projects.sort()];
  }, [issues]);

  const uniquePriorities = useMemo(() => {
    if (!issues) return ['All'];
    const priorities = Array.from(new Set(issues.map(issue => issue.priority?.name).filter(Boolean) as string[]));
    return ['All', ...priorities.sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const projectMatch = selectedProject === 'All' || issue.project?.name === selectedProject;
      const priorityMatch = selectedPriority === 'All' || issue.priority?.name === selectedPriority;
      let dateMatch = true;
      if (dateRange.from && issue.created && isValid(parseISO(issue.created))) {
        dateMatch = dateMatch && parseISO(issue.created) >= dateRange.from;
      }
      if (dateRange.to && issue.created && isValid(parseISO(issue.created))) {
        // Add 1 day to 'to' date to include the whole day
        const toDate = new Date(dateRange.to);
        toDate.setDate(toDate.getDate() + 1);
        dateMatch = dateMatch && parseISO(issue.created) < toDate;
      }
      return projectMatch && priorityMatch && dateMatch;
    });
  }, [issues, selectedProject, selectedPriority, dateRange]);

  const issueTypeData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const typeName = issue.type?.name || 'Unknown Type';
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIssues]);

  const statusData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const statusName = issue.status?.name || 'Unknown Status';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredIssues]);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched. Please use the sidebar.</div>;

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="gi-project-filter">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="gi-project-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gi-priority-filter">Priority</Label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger id="gi-priority-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniquePriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gi-date-range">Date Range (Created)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="gi-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && !dateRange.to && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (dateRange.to ? `Until ${format(dateRange.to, "LLL dd, y")}`: <span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.pieChart className="h-5 w-5 text-primary" />
              <CardTitle>Issue Type Distribution</CardTitle>
            </div>
            <CardDescription>Proportion of different issue types.</CardDescription>
          </CardHeader>
          <CardContent>
            {issueTypeData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={issueTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 5 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {issueTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for issue type distribution.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.barChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Status Distribution</CardTitle>
            </div>
            <CardDescription>Number of issues in each status.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Issues", color: "hsl(var(--chart-1))"} }} className="h-[300px] w-full">
                <BarChart data={statusData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Issues" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for status distribution.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
