
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, differenceInBusinessDays, isAfter, isBefore } from 'date-fns';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 p-1">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
      </Card>
    ))}
  </div>
);

export function ProjectTaskMgmtTab() {
  const context = useContext(JiraDataContext);
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedTaskType, setSelectedTaskType] = useState('All');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({}); // For due date

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueProjects = useMemo(() => {
    if(!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i.project?.name).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const uniqueTaskTypes = useMemo(() => {
    if(!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i.type?.name).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const projectMatch = selectedProject === 'All' || issue.project?.name === selectedProject;
      const taskTypeMatch = selectedTaskType === 'All' || issue.type?.name === selectedTaskType;
      let dateMatch = true; 
      if (issue.duedate && isValid(parseISO(issue.duedate))) {
        const dueDate = parseISO(issue.duedate);
        if (dateRange.from && isBefore(dueDate, dateRange.from)) {
          dateMatch = false;
        }
        if (dateRange.to) {
            const toDateInclusive = new Date(dateRange.to);
            toDateInclusive.setHours(23,59,59,999);
            if (isAfter(dueDate, toDateInclusive)) {
                dateMatch = false;
            }
        }
      } else if (dateRange.from || dateRange.to) {
          dateMatch = false;
      }
      return projectMatch && taskTypeMatch && dateMatch;
    });
  }, [issues, selectedProject, selectedTaskType, dateRange]);

  const projectTimelineData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    return filteredIssues
      .filter(i => i.startdate && i.duedate && isValid(parseISO(i.startdate)) && isValid(parseISO(i.duedate)))
      .map(issue => {
        const startDate = parseISO(issue.startdate!);
        const dueDate = parseISO(issue.duedate!);
        const duration = differenceInBusinessDays(dueDate, startDate) + 1; 
        return {
          name: `${issue.id} - ${issue.summary.substring(0,25)}${issue.summary.length > 25 ? "..." : ""}`,
          id: issue.id,
          startDate: format(startDate, 'yyyy-MM-dd'),
          duration: Math.max(1, duration), 
          project: issue.project?.name || "Unknown Project"
        };
      })
      .slice(0, 15); // Limit for display to keep it readable
  }, [filteredIssues]);

  const taskCompletionProgressData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const projectsSummary: Record<string, {name: string, total: number, completed: number}> = {};
    filteredIssues.forEach(issue => {
      const projectName = issue.project?.name || 'Unknown Project';
      if(!projectsSummary[projectName]) projectsSummary[projectName] = {name: projectName, total: 0, completed: 0};
      projectsSummary[projectName].total++;
      if(issue.status?.statusCategory?.key === 'done' || issue.status?.name?.toLowerCase() === 'closed' || issue.status?.name?.toLowerCase() === 'resolved') {
        projectsSummary[projectName].completed++;
      }
    });
    return Object.values(projectsSummary).map(p => ({
        ...p,
        percentage: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
    })).sort((a,b) => b.percentage - a.percentage);
  }, [filteredIssues]);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  if (filteredIssues.length === 0 && issues.length > 0) return <div className="p-4 text-center text-muted-foreground">No issues match the current filter criteria.</div>;


  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="ptm-project-filter">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={uniqueProjects.length <=1}>
              <SelectTrigger id="ptm-project-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ptm-tasktype-filter">Task Type</Label>
            <Select value={selectedTaskType} onValueChange={setSelectedTaskType} disabled={uniqueTaskTypes.length <=1}>
              <SelectTrigger id="ptm-tasktype-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueTaskTypes.map(tt => <SelectItem key={tt} value={tt}>{tt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ptm-date-range">Due Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="ptm-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && !dateRange.to && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (dateRange.to ? `Until ${format(dateRange.to, "LLL dd, y")}`: <span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Icons.ganttChartSquare className="h-5 w-5 text-primary" /><CardTitle>Project Timeline (Simplified Gantt)</CardTitle></div>
          <CardDescription>Visualizes task durations (start to due date). Shows top 15 tasks matching filters.</CardDescription>
        </CardHeader>
        <CardContent>
          {projectTimelineData.length > 0 ? (
            <ChartContainer config={{ duration: {label: "Duration (days)", color: "hsl(var(--chart-1))"} }} className="h-[400px] w-full">
              <BarChart data={projectTimelineData} layout="vertical" margin={{ left: 150, right: 20, bottom:20 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" dataKey="duration" name="Duration (days)" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} interval={0}/>
                <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <p className="text-sm font-medium">{data.id}</p>
                            <p className="text-xs text-muted-foreground">Project: {data.project}</p>
                            <p className="text-xs text-muted-foreground">Start: {data.startDate}</p>
                            <p className="text-xs text-muted-foreground">Duration: {data.duration} days</p>
                        </div>
                        );
                    }
                    return null;
                }} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="duration" name="Duration (days)" fill="var(--color-duration)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : <p className="text-sm text-muted-foreground">No data for project timeline. Ensure issues have 'startdate' and 'duedate'.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-2"><Icons.clipboardList className="h-5 w-5 text-primary" /><CardTitle>Task Completion Progress by Project</CardTitle></div>
            <CardDescription>Percentage of tasks completed per project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {taskCompletionProgressData.length > 0 ? taskCompletionProgressData.map(proj => (
                <div key={proj.name}>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{proj.name}</span>
                        <span className="text-sm text-muted-foreground">{proj.completed}/{proj.total} ({proj.percentage}%)</span>
                    </div>
                    <Progress value={proj.percentage} aria-label={`${proj.name} completion ${proj.percentage}%`} />
                </div>
            )) : <p className="text-sm text-muted-foreground">No task completion data available for the current filters.</p>}
        </CardContent>
      </Card>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: Gantt chart is a simplified representation of task durations. Ensure 'startdate' and 'duedate' fields are available in Jira issues.
      </CardDescription>
    </div>
  );
}
