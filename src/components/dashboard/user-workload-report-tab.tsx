
"use client";

import React, { useState } from 'react';
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
import { format } from 'date-fns';

const chartConfig = {
  workload: { label: "Workload (tasks)", color: "hsl(var(--chart-1))" },
  worklog: { label: "Worklog (hours)", color: "hsl(var(--chart-2))" },
};

const workloadData = [
  { assignee: 'Alice B.', project: 'Alpha', status: 'To Do', tasks: 5, estimatedHours: 20 },
  { assignee: 'Alice B.', project: 'Alpha', status: 'In Progress', tasks: 3, estimatedHours: 15 },
  { assignee: 'Bob C.', project: 'Beta', status: 'In Progress', tasks: 7, estimatedHours: 30 },
  { assignee: 'Charlie D.', project: 'Alpha', status: 'To Do', tasks: 2, estimatedHours: 8 },
  { assignee: 'Charlie D.', project: 'Gamma', status: 'In Review', tasks: 4, estimatedHours: 12 },
];

const dailyWorklogData = [
  { date: '2024-07-01', hours: 6.5 }, { date: '2024-07-02', hours: 7.0 },
  { date: '2024-07-03', hours: 5.5 }, { date: '2024-07-04', hours: 8.0 },
  { date: '2024-07-05', hours: 6.0 }, { date: '2024-07-06', hours: 0.0 },
  { date: '2024-07-07', hours: 0.0 },
];

const projects = ['All', 'Alpha', 'Beta', 'Gamma'];
const statuses = ['All', 'To Do', 'In Progress', 'In Review', 'Done'];
const assignees = ['All', 'Alice B.', 'Bob C.', 'Charlie D.'];


export function UserWorkloadReportTab() {
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const filteredData = workloadData.filter(item => 
    (selectedProject === 'All' || item.project === selectedProject) &&
    (selectedStatus === 'All' || item.status === selectedStatus) &&
    (selectedAssignee === 'All' || item.assignee === selectedAssignee)
  );

  const summary = {
    totalTasks: filteredData.reduce((sum, item) => sum + item.tasks, 0),
    totalHours: filteredData.reduce((sum, item) => sum + item.estimatedHours, 0),
  };

  const workloadByAssignee = assignees.slice(1).map(assignee => ({
    assignee,
    tasks: filteredData.filter(d => d.assignee === assignee).reduce((sum, item) => sum + item.tasks, 0)
  })).filter(item => item.tasks > 0);

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
              <SelectContent>{projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="report-status"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-assignee">Assignee</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger id="report-assignee"><SelectValue /></SelectTrigger>
              <SelectContent>{assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-date-range">Date Range</Label>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Overall Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p>Total Tasks: <span className="font-bold">{summary.totalTasks}</span></p>
            <p>Total Estimated Hours: <span className="font-bold">{summary.totalHours}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.assignee className="h-5 w-5 text-primary" />
              <CardTitle>User Workload Chart</CardTitle>
            </div>
            <CardDescription>Tasks per assignee based on current filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={workloadByAssignee} layout="vertical" margin={{left: 10, right: 20}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="assignee" type="category" width={80} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="tasks" fill="var(--color-workload)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.table className="h-5 w-5 text-primary" />
            <CardTitle>Detailed Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Assignee</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Tasks</TableHead><TableHead>Est. Hours</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.assignee}</TableCell><TableCell>{item.project}</TableCell>
                  <TableCell>{item.status}</TableCell><TableCell>{item.tasks}</TableCell>
                  <TableCell>{item.estimatedHours}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="text-center">No data matches filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <Icons.lineChart className="h-5 w-5 text-primary" />
                <CardTitle>Daily Worklog Timeline (Sample)</CardTitle>
            </div>
            <CardDescription>Logged hours per day for selected user (placeholder).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={dailyWorklogData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "MMM d")} tickLine={false} axisLine={false} />
                    <YAxis unit="h" />
                    <Tooltip content={<ChartTooltipContent indicator="line" />} />
                    <Legend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="hours" stroke="var(--color-worklog)" strokeWidth={2} name="Logged Hours" />
                </LineChart>
            </ChartContainer>
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
          <Accordion type="single" collapsible className="w-full">
            {assignees.slice(1).map(assignee => {
              const userProjects = Array.from(new Set(filteredData.filter(d => d.assignee === assignee).map(d => d.project)));
              if (userProjects.length === 0) return null;
              return (
                <AccordionItem value={assignee} key={assignee}>
                  <AccordionTrigger className="font-medium text-base hover:bg-muted/50 px-4 py-3 rounded-md">
                    <div className="flex items-center gap-2">
                        <Icons.assignee className="h-5 w-5" /> {assignee}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0 pl-8 pr-4">
                    {userProjects.map(project => {
                       const projectTasks = filteredData.filter(d => d.assignee === assignee && d.project === project);
                       const totalTasks = projectTasks.reduce((sum, item) => sum + item.tasks, 0);
                       const totalHours = projectTasks.reduce((sum, item) => sum + item.estimatedHours, 0);
                       if (totalTasks === 0) return null;
                       return (
                         <div key={project} className="border-l pl-4 py-2 mb-2 last:mb-0">
                           <h4 className="font-semibold text-sm mb-1 text-primary/80 flex items-center gap-1.5"><Icons.project className="h-4 w-4"/>Project: {project}</h4>
                           <p className="text-xs text-muted-foreground">Tasks: {totalTasks}, Est. Hours: {totalHours}</p>
                           <ul className="list-disc list-inside mt-1 text-xs">
                               {projectTasks.map((task, idx) => (
                                   <li key={idx}>{task.status}: {task.tasks} tasks ({task.estimatedHours}h)</li>
                               ))}
                           </ul>
                         </div>
                       )
                    })}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

    </div>
  );
}

