
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const secondsToHours = (seconds: number | null | undefined): number => {
  if (seconds === null || seconds === undefined) return 0;
  return parseFloat((seconds / 3600).toFixed(2));
};

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

export function TimeTrackingTab() {
  const context = useContext(JiraDataContext);
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedSprint, setSelectedSprint] = useState('All'); // Sprint name
  const [selectedUser, setSelectedUser] = useState('All'); // Assignee display name

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueProjects = useMemo(() => {
    if (!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i.project?.name).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const uniqueSprints = useMemo(() => {
    if (!issues) return ['All'];
    const sprintNames = new Set<string>();
    issues.forEach(i => {
      if(i.sprint?.name) sprintNames.add(i.sprint.name);
      (i.closedSprints || []).forEach(s => { if(s.name) sprintNames.add(s.name); });
    });
    return ['All', ...Array.from(sprintNames).sort()];
  }, [issues]);

  const uniqueUsers = useMemo(() => {
    if (!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i.assignee?.displayName).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const projectMatch = selectedProject === 'All' || issue.project?.name === selectedProject;
      const userMatch = selectedUser === 'All' || issue.assignee?.displayName === selectedUser;
      const sprintMatch = selectedSprint === 'All' || 
                          issue.sprint?.name === selectedSprint || 
                          (issue.closedSprints || []).some(s => s.name === selectedSprint);
      return projectMatch && userMatch && sprintMatch;
    });
  }, [issues, selectedProject, selectedSprint, selectedUser]);

  const estimateVsTimeSpentData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    // For simplicity, group by project if "All Projects" is selected, else show top 10 issues by estimate
    // Or group by issue type within a project for a more aggregated view.
    // The spec "X-axis: issuekey or project.key" is tricky. Let's group by project.
    
    const projectSummary: Record<string, { name: string, originalEstimate: number, timeSpent: number }> = {};
    filteredIssues.forEach(issue => {
        const projectName = issue.project?.name || 'Unknown Project';
        if (!projectSummary[projectName]) {
            projectSummary[projectName] = { name: projectName, originalEstimate: 0, timeSpent: 0 };
        }
        projectSummary[projectName].originalEstimate += secondsToHours(issue.timeoriginalestimate);
        projectSummary[projectName].timeSpent += secondsToHours(issue.timespent);
    });

    return Object.values(projectSummary).filter(p => p.originalEstimate > 0 || p.timeSpent > 0);

  }, [filteredIssues]);

  // Burndown chart data is complex and often requires daily snapshots or detailed changelog analysis.
  // This is a highly simplified placeholder.
  const burndownData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0 || selectedSprint === 'All') return [];
    // Mock data for demonstration
    const totalEstimate = filteredIssues.reduce((sum, issue) => sum + secondsToHours(issue.timeoriginalestimate), 0);
    if (totalEstimate === 0) return [];
    return [
      { day: 'Start', remaining: totalEstimate, ideal: totalEstimate },
      { day: 'Mid', remaining: totalEstimate / 2, ideal: totalEstimate / 2 },
      { day: 'End', remaining: 0, ideal: 0 },
    ];
  }, [filteredIssues, selectedSprint]);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  
  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tt-project-filter">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="tt-project-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tt-sprint-filter">Sprint</Label>
            <Select value={selectedSprint} onValueChange={setSelectedSprint} disabled={uniqueSprints.length <=1}>
              <SelectTrigger id="tt-sprint-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueSprints.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tt-user-filter">User (Assignee)</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser} disabled={uniqueUsers.length <=1}>
              <SelectTrigger id="tt-user-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Estimate vs. Time Spent (by Project)</CardTitle></div>
            <CardDescription>Compares planned vs. actual effort in hours.</CardDescription>
          </CardHeader>
          <CardContent>
            {estimateVsTimeSpentData.length > 0 ? (
              <ChartContainer config={{ originalEstimate: {label: "Est. Hours", color: "hsl(var(--chart-1))"}, timeSpent: {label: "Spent Hours", color: "hsl(var(--chart-2))"} }} className="h-[300px] w-full">
                <BarChart data={estimateVsTimeSpentData} margin={{left: -10, right:10}}>
                  <CartesianGrid vertical={false}/>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-15} textAnchor="end" height={50}/>
                  <YAxis unit="h" tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip content={<ChartTooltipContent indicator="line" />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="originalEstimate" stackId="a" fill="var(--color-originalEstimate)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="timeSpent" stackId="a" fill="var(--color-timeSpent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No time tracking data for selected filters.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.burndown className="h-5 w-5 text-primary" /><CardTitle>Burndown Chart (Simplified)</CardTitle></div>
            <CardDescription>Tracks progress. (Select a specific sprint to see placeholder data)</CardDescription>
          </CardHeader>
          <CardContent>
            {burndownData.length > 0 ? (
              <ChartContainer config={{ remaining: { label: "Remaining", color: "hsl(var(--chart-3))"}, ideal: { label: "Ideal", color: "hsl(var(--chart-4))"} }} className="h-[300px] w-full">
                <LineChart data={burndownData}>
                  <CartesianGrid vertical={false}/>
                  <XAxis dataKey="day" />
                  <YAxis unit="h"/>
                  <Tooltip content={<ChartTooltipContent indicator="line" />} />
                  <Legend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} />
                  <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeDasharray="5 5" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">Select a specific sprint for burndown chart or no data available. (Currently placeholder data)</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
