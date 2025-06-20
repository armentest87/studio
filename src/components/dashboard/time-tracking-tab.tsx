
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
    
    let groupedData: JiraIssue[];
    if (selectedProject !== 'All') {
      groupedData = filteredIssues.filter(issue => issue.project?.name === selectedProject);
    } else if (selectedUser !== 'All') {
      groupedData = filteredIssues.filter(issue => issue.assignee?.displayName === selectedUser);
    } else {
      // If no specific project or user, group by project as a default
      const projectSummary: Record<string, { name: string, originalEstimate: number, timeSpent: number, issueCount: number }> = {};
      filteredIssues.forEach(issue => {
          const key = issue.project?.name || 'Unknown Project';
          if (!projectSummary[key]) {
              projectSummary[key] = { name: key, originalEstimate: 0, timeSpent: 0, issueCount: 0 };
          }
          projectSummary[key].originalEstimate += secondsToHours(issue.timeoriginalestimate);
          projectSummary[key].timeSpent += secondsToHours(issue.timespent);
          projectSummary[key].issueCount++;
      });
      return Object.values(projectSummary).filter(p => p.originalEstimate > 0 || p.timeSpent > 0).slice(0,15); // limit display
    }

    return groupedData.map(issue => ({
        name: issue.id, // issue.key
        summary: issue.summary.substring(0,30) + (issue.summary.length > 30 ? "..." : ""),
        originalEstimate: secondsToHours(issue.timeoriginalestimate),
        timeSpent: secondsToHours(issue.timespent)
    })).filter(d => d.originalEstimate > 0 || d.timeSpent > 0).slice(0, 15); // Limit number of issues shown directly

  }, [filteredIssues, selectedProject, selectedUser]);


  const burndownData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0 || selectedSprint === 'All') return [];
    
    const sprintIssues = filteredIssues.filter(issue => issue.sprint?.name === selectedSprint || (issue.closedSprints || []).some(s => s.name === selectedSprint));
    if(sprintIssues.length === 0) return [];

    const totalEstimate = sprintIssues.reduce((sum, issue) => sum + secondsToHours(issue.storyPoints || issue.timeoriginalestimate || 0), 0); // Prefer Story Points if available
    if (totalEstimate === 0) return [];
    
    // Simplified Burndown: Requires daily snapshots or complex changelog analysis.
    // This is a placeholder showing a linear burndown.
    // For a real burndown, you'd need to process changelogs to see when work was logged or issues resolved.
    let currentSprint = sprintIssues[0].sprint; // try to get current sprint details
    if (!currentSprint) { // if not found, try to find in closedSprints
        currentSprint = (sprintIssues[0].closedSprints || []).find(s => s.name === selectedSprint) || null;
    }

    const days = [];
    let remaining = totalEstimate;
    const dayCount = currentSprint?.startDate && currentSprint?.endDate ? 
                     (new Date(currentSprint.endDate).getTime() - new Date(currentSprint.startDate).getTime()) / (1000 * 3600 * 24) + 1 
                     : 5; // Default to 5 "days" if no sprint dates

    for(let i=0; i < dayCount; i++){
        days.push({
            day: `Day ${i+1}`,
            remaining: Math.max(0, totalEstimate - (totalEstimate/ (dayCount-1)) * i), // Linear burndown
            ideal: Math.max(0, totalEstimate - (totalEstimate/ (dayCount-1)) * i)
        });
    }
    if (days.length === 0) return [{day: 'Start', remaining: totalEstimate, ideal: totalEstimate}];


    return days;
  }, [filteredIssues, selectedSprint]);


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
            <Label htmlFor="tt-project-filter">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={uniqueProjects.length <=1}>
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
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Estimate vs. Time Spent</CardTitle></div>
            <CardDescription>Compares planned vs. actual effort in hours (by Issue Key or Project).</CardDescription>
          </CardHeader>
          <CardContent>
            {estimateVsTimeSpentData.length > 0 ? (
              <ChartContainer config={{ originalEstimate: {label: "Est. Hours", color: "hsl(var(--chart-1))"}, timeSpent: {label: "Spent Hours", color: "hsl(var(--chart-2))"} }} className="h-[300px] w-full">
                <BarChart data={estimateVsTimeSpentData} margin={{left: -10, right:10, bottom: 50}}>
                  <CartesianGrid vertical={false}/>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" interval={0} height={70}/>
                  <YAxis unit="h" tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip content={<ChartTooltipContent 
                    formatter={(value, name, props) => {
                        if (props.payload.summary) {
                            return (
                                <>
                                    <div className="font-medium">{props.payload.summary} ({props.payload.name})</div>
                                    <div className="text-muted-foreground">{`${name}: ${value}h`}</div>
                                </>
                            )
                        }
                        return `${name}: ${value}h`;
                    }}
                    indicator="line" 
                  />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="originalEstimate" fill="var(--color-originalEstimate)" radius={[4, 4, 0, 0]} name="Est. Hours"/>
                  <Bar dataKey="timeSpent" fill="var(--color-timeSpent)" radius={[4, 4, 0, 0]} name="Spent Hours"/>
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No time tracking data for selected filters.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.burndown className="h-5 w-5 text-primary" /><CardTitle>Burndown Chart</CardTitle></div>
            <CardDescription>Tracks progress for a selected sprint. (Simplified representation)</CardDescription>
          </CardHeader>
          <CardContent>
            {burndownData.length > 0 ? (
              <ChartContainer config={{ remaining: { label: "Remaining", color: "hsl(var(--chart-3))"}, ideal: { label: "Ideal", color: "hsl(var(--chart-4))"} }} className="h-[300px] w-full">
                <LineChart data={burndownData}>
                  <CartesianGrid vertical={false}/>
                  <XAxis dataKey="day" />
                  <YAxis unit={selectedSprint !== 'All' ? " (Est. Units)" : "h"}/>
                  <Tooltip content={<ChartTooltipContent indicator="line" />} />
                  <Legend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} dot={true} name="Remaining"/>
                  <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeDasharray="5 5" strokeWidth={2} dot={true} name="Ideal"/>
                </LineChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">Select a specific sprint for burndown chart or no data available. (Currently placeholder/linear data)</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
