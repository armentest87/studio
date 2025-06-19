
"use client";

import React, { useState, useContext, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, addDays, subDays } from 'date-fns';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue, JiraUser } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


const chartConfig = {
  workload: { label: "Tasks", color: "hsl(var(--chart-1))" },
  worklog: { label: "Worklog (hours)", color: "hsl(var(--chart-2))" },
  estimatedHours: { label: "Est. Hours", color: "hsl(var(--chart-3))"},
  spentHours: { label: "Spent Hours", color: "hsl(var(--chart-4))"},
  remainingHours: { label: "Rem. Hours", color: "hsl(var(--chart-5))"},
};

// Helper to convert seconds to hours
const secondsToHours = (seconds: number | null | undefined): number => {
  if (seconds === null || seconds === undefined) return 0;
  return Math.round((seconds / 3600) * 100) / 100; // Round to 2 decimal places
};

const LoadingSkeleton = () => (
    <div className="space-y-6 p-1">
        <Card><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-10 w-3/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[150px] w-full" /></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[200px] w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[200px] w-full" /></CardContent></Card>
    </div>
);


export function UserWorkloadReportTab() {
  const context = useContext(JiraDataContext);

  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState('All'); // Store assignee accountId or displayName
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const uniqueProjects = useMemo(() => {
    if (!issues) return ['All'];
    const projects = Array.from(new Set(issues.map(issue => issue.project?.name).filter(Boolean) as string[]));
    return ['All', ...projects.sort()];
  }, [issues]);

  const uniqueStatuses = useMemo(() => {
    if (!issues) return ['All'];
    const statuses = Array.from(new Set(issues.map(issue => issue.status?.name).filter(Boolean) as string[]));
    return ['All', ...statuses.sort()];
  }, [issues]);

  const uniqueAssignees = useMemo(() => {
    if (!issues) return [{ value: 'All', name: 'All Assignees' }];
    const assigneesMap = new Map<string, string>(); // Store accountId -> displayName
    issues.forEach(issue => {
      if (issue.assignee?.accountId && issue.assignee?.displayName) {
        assigneesMap.set(issue.assignee.accountId, issue.assignee.displayName);
      } else if (issue.assignee?.displayName && !assigneesMap.has(issue.assignee.displayName)) { // Fallback if no accountId
        assigneesMap.set(issue.assignee.displayName, issue.assignee.displayName);
      }
    });
    const assigneesList = Array.from(assigneesMap.entries()).map(([value, name]) => ({ value, name }));
    return [{ value: 'All', name: 'All Assignees' }, ...assigneesList.sort((a,b) => a.name.localeCompare(b.name))];
  }, [issues]);


  const filteredData = useMemo(() => {
    if (!issues) return [];
    return issues.filter(item => {
      const projectMatch = selectedProject === 'All' || item.project?.name === selectedProject;
      const statusMatch = selectedStatus === 'All' || item.status?.name === selectedStatus;
      const assigneeMatch = selectedAssignee === 'All' || item.assignee?.accountId === selectedAssignee || item.assignee?.displayName === selectedAssignee;
      
      let dateMatch = true;
      if (dateRange.from && item.created) {
         dateMatch = dateMatch && parseISO(item.created) >= dateRange.from;
      }
      // If we want to filter by date range based on when the issue was *active* or *updated*,
      // this logic would need to be more complex (e.g., checking updated or resolutiondate)
      // For now, filtering by creation date.
      if (dateRange.to && item.created) {
         dateMatch = dateMatch && parseISO(item.created) <= addDays(dateRange.to,1); // include the whole 'to' day
      }

      return projectMatch && statusMatch && assigneeMatch && dateMatch;
    });
  }, [issues, selectedProject, selectedStatus, selectedAssignee, dateRange]);

  const summary = useMemo(() => {
    return {
      totalTasks: filteredData.length,
      totalEstimatedHours: filteredData.reduce((sum, item) => sum + secondsToHours(item.timeoriginalestimate), 0),
      totalSpentHours: filteredData.reduce((sum, item) => sum + secondsToHours(item.timespent), 0),
      totalRemainingHours: filteredData.reduce((sum, item) => sum + secondsToHours(item.timeestimate), 0),
    };
  }, [filteredData]);

  const workloadByAssigneeChartData = useMemo(() => {
    const assigneeSummary = new Map<string, { tasks: number, estimatedHours: number, spentHours: number }>();
    filteredData.forEach(item => {
        const assigneeName = item.assignee?.displayName || 'Unassigned';
        const current = assigneeSummary.get(assigneeName) || { tasks: 0, estimatedHours: 0, spentHours: 0 };
        current.tasks += 1;
        current.estimatedHours += secondsToHours(item.timeoriginalestimate);
        current.spentHours += secondsToHours(item.timespent);
        assigneeSummary.set(assigneeName, current);
    });
    return Array.from(assigneeSummary.entries()).map(([assignee, data]) => ({
        assignee,
        tasks: data.tasks,
        estimatedHours: data.estimatedHours,
        spentHours: data.spentHours,
    })).filter(item => item.tasks > 0);
  }, [filteredData]);


  // Daily Worklog Data (Simplified - based on issue updated dates as proxy for activity for now)
  const dailyWorklogData = useMemo(() => {
    const worklogMap = new Map<string, number>();
    if (!dateRange.from || !dateRange.to) return [];

    filteredData.forEach(issue => {
        // This is a placeholder; real worklog aggregation would sum Jira worklog entries
        // For simplicity, let's assume 'timespent' on an issue is spread over its active period or on its update day
        if (issue.updated && issue.timespent && issue.timespent > 0) {
            const updatedDate = parseISO(issue.updated);
            if (isWithinInterval(updatedDate, { start: dateRange.from!, end: dateRange.to! })) {
                const dayKey = format(updatedDate, 'yyyy-MM-dd');
                const hoursSpent = secondsToHours(issue.timespent); // This is total, not daily. Needs refinement.
                // A better approach would be to iterate through actual worklog entries if fetched.
                // For now, let's just log some activity on the update day.
                worklogMap.set(dayKey, (worklogMap.get(dayKey) || 0) + hoursSpent / filteredData.length); // Arbitrary division
            }
        }
    });
    
    return Array.from(worklogMap.entries())
        .map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(2)) }))
        .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  }, [filteredData, dateRange]);


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

  if (!issues) { // Initial state before any fetch attempt or if issues is explicitly null
    return <div className="p-4 text-center text-muted-foreground">Please configure and fetch Jira issues using the sidebar.</div>;
  }
  
  // After fetch attempt, if issues array is empty
  if (issues.length === 0 && !isLoading) {
     return <div className="p-4 text-center text-muted-foreground">No Jira issues found for the current JQL query or filters.</div>;
  }


  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.filter className="h-5 w-5 text-primary" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="report-project">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="report-project"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="report-status"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-assignee">Assignee</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger id="report-assignee"><SelectValue placeholder="Select Assignee" /></SelectTrigger>
              <SelectContent>{uniqueAssignees.map(a => <SelectItem key={a.value} value={a.value}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-date-range">Date Range (Created)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="report-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Total Tasks</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.totalTasks.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Total Est. Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.totalEstimatedHours.toFixed(2)}h</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Total Spent Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.totalSpentHours.toFixed(2)}h</p></CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
            <Icons.assignee className="h-5 w-5 text-primary" />
            <CardTitle>User Workload Chart</CardTitle>
            </div>
            <CardDescription>Tasks and hours per assignee based on current filters.</CardDescription>
        </CardHeader>
        <CardContent>
            {workloadByAssigneeChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={workloadByAssigneeChartData} layout="vertical" margin={{left: 10, right: 30}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="assignee" type="category" width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="tasks" fill="var(--color-workload)" radius={4} name="Tasks" />
                <Bar dataKey="estimatedHours" fill="var(--color-estimatedHours)" radius={4} name="Est. Hours" />
                <Bar dataKey="spentHours" fill="var(--color-spentHours)" radius={4} name="Spent Hours" />
                </BarChart>
            </ChartContainer>
            ) : (
                <p className="text-sm text-muted-foreground">No workload data to display for current filters.</p>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.table className="h-5 w-5 text-primary" />
            <CardTitle>Detailed Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Summary</TableHead>
                <TableHead>Assignee</TableHead><TableHead>Project</TableHead>
                <TableHead>Status</TableHead><TableHead>Est. Hours</TableHead>
                <TableHead>Spent Hours</TableHead><TableHead>Rem. Hours</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.slice(0, 20).map((item: JiraIssue) => ( // Display first 20 for brevity
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.summary}</TableCell>
                  <TableCell>{item.assignee?.displayName || 'N/A'}</TableCell>
                  <TableCell>{item.project?.name || 'N/A'}</TableCell>
                  <TableCell>{item.status?.name || 'N/A'}</TableCell>
                  <TableCell>{secondsToHours(item.timeoriginalestimate).toFixed(2)}h</TableCell>
                  <TableCell>{secondsToHours(item.timespent).toFixed(2)}h</TableCell>
                  <TableCell>{secondsToHours(item.timeestimate).toFixed(2)}h</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={8} className="text-center">No data matches filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <Icons.lineChart className="h-5 w-5 text-primary" />
                <CardTitle>Daily Worklog Timeline (Simplified)</CardTitle>
            </div>
            <CardDescription>Estimated activity per day based on issue updates (very approximate).</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyWorklogData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <LineChart data={dailyWorklogData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(value) => format(parseISO(value), "MMM d")} tickLine={false} axisLine={false} />
                        <YAxis unit="h" />
                        <Tooltip content={<ChartTooltipContent indicator="line" />} />
                        <Legend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="hours" stroke="var(--color-worklog)" strokeWidth={2} name="Activity Hours (Approx.)" />
                    </LineChart>
                </ChartContainer>
            ): (
                 <p className="text-sm text-muted-foreground">Not enough data for daily worklog timeline.</p>
            )}
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <Icons.users className="h-5 w-5 text-primary" />
                <CardTitle>Cascading View (Workload by User & Project)</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
          {uniqueAssignees.filter(a => a.value !== 'All').length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {uniqueAssignees.filter(a => a.value !== 'All').map(assigneeObj => {
                const userIssues = filteredData.filter(d => d.assignee?.accountId === assigneeObj.value || d.assignee?.displayName === assigneeObj.value);
                const userProjects = Array.from(new Set(userIssues.map(d => d.project?.name).filter(Boolean)));
                if (userIssues.length === 0) return null;

                return (
                  <AccordionItem value={assigneeObj.value} key={assigneeObj.value}>
                    <AccordionTrigger className="font-medium text-base hover:bg-muted/50 px-4 py-3 rounded-md">
                      <div className="flex items-center gap-2">
                          <Icons.assignee className="h-5 w-5" /> {assigneeObj.name} ({userIssues.length} tasks)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0 pl-8 pr-4">
                      {userProjects.map(project => {
                         const projectTasks = userIssues.filter(d => d.project?.name === project);
                         const totalTasks = projectTasks.length;
                         const totalEstHours = projectTasks.reduce((sum, item) => sum + secondsToHours(item.timeoriginalestimate), 0);
                         const totalSpentHours = projectTasks.reduce((sum, item) => sum + secondsToHours(item.timespent), 0);
                         if (totalTasks === 0) return null;

                         return (
                           <div key={project} className="border-l pl-4 py-2 mb-2 last:mb-0">
                             <h4 className="font-semibold text-sm mb-1 text-primary/80 flex items-center gap-1.5"><Icons.project className="h-4 w-4"/>Project: {project}</h4>
                             <p className="text-xs text-muted-foreground">Tasks: {totalTasks}, Est: {totalEstHours.toFixed(1)}h, Spent: {totalSpentHours.toFixed(1)}h</p>
                             <ul className="list-disc list-inside mt-1 text-xs">
                                 {projectTasks.slice(0,5).map((task, idx) => ( // Show first 5 tasks per project
                                     <li key={idx} className="truncate" title={task.summary}>{task.id}: {task.summary} ({task.status?.name})</li>
                                 ))}
                                 {projectTasks.length > 5 && <li>...and {projectTasks.length - 5} more.</li>}
                             </ul>
                           </div>
                         )
                      })}
                      {userProjects.length === 0 && <p className="text-xs text-muted-foreground pl-4">No projects with assigned tasks for this user and current filters.</p>}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">No assignees with tasks match the current filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    