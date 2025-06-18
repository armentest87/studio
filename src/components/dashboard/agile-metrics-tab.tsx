"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Icons } from '@/components/icons';

const chartConfig = {
  storyPoints: { label: "Story Points", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--chart-2))" },
  remaining: { label: "Remaining", color: "hsl(var(--chart-3))" },
  ideal: { label: "Ideal", color: "hsl(var(--chart-4))" },
  issues: { label: "Issues", color: "hsl(var(--chart-1))" },
  days: { label: "Days", color: "hsl(var(--chart-2))" },
  commitment: { label: "Commitment", color: "hsl(var(--chart-1))" },
  scopeChange: { label: "Scope Change", color: "hsl(var(--chart-5))" },
  leadTime: { label: "Lead Time (days)", color: "hsl(var(--chart-1))" },
  cycleTime: { label: "Cycle Time (days)", color: "hsl(var(--chart-2))" },
  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
};

const velocityData = [
  { sprint: 'Sprint 1', storyPoints: 30 },
  { sprint: 'Sprint 2', storyPoints: 45 },
  { sprint: 'Sprint 3', storyPoints: 38 },
  { sprint: 'Sprint 4', storyPoints: 52 },
];

const burndownData = [
  { day: 'Day 1', remaining: 50, ideal: 50 },
  { day: 'Day 2', remaining: 45, ideal: 45 },
  { day: 'Day 3', remaining: 38, ideal: 40 },
  { day: 'Day 4', remaining: 30, ideal: 35 },
  { day: 'Day 5', remaining: 22, ideal: 30 },
  { day: 'Day 6', remaining: 15, ideal: 25 },
  { day: 'Day 7', remaining: 8, ideal: 20 },
  { day: 'Day 8', remaining: 5, ideal: 15 },
  { day: 'Day 9', remaining: 2, ideal: 10 },
  { day: 'Day 10', remaining: 0, ideal: 5 },
];

const cycleTimeData = [
  { task: 'Task A', days: 3 },
  { task: 'Task B', days: 5 },
  { task: 'Task C', days: 2 },
  { task: 'Task D', days: 7 },
];

const throughputData = [
  { week: 'Week 1', issues: 10 },
  { week: 'Week 2', issues: 12 },
  { week: 'Week 3', issues: 8 },
  { week: 'Week 4', issues: 15 },
];

const sprintCommitmentData = [
    { sprint: 'Sprint 1', commitment: 40, completed: 35 },
    { sprint: 'Sprint 2', commitment: 50, completed: 48 },
    { sprint: 'Sprint 3', commitment: 45, completed: 40 },
];

const rollingVelocityData = [
    { period: 'P1-P3', velocity: 37.67 },
    { period: 'P2-P4', velocity: 45.00 },
];

const scopeChangeData = [
    { sprint: 'Sprint 1', added: 5, removed: 2 },
    { sprint: 'Sprint 2', added: 3, removed: 1 },
    { sprint: 'Sprint 3', added: 7, removed: 3 },
];

const leadTimeData = [
    { feature: 'Feature X', days: 10 },
    { feature: 'Feature Y', days: 15 },
    { feature: 'Feature Z', days: 8 },
];

const workingHoursData = [
    { day: 'Mon', hours: 6 }, { day: 'Tue', hours: 7 }, { day: 'Wed', hours: 5 }, { day: 'Thu', hours: 8 }, { day: 'Fri', hours: 6 }
];

const timeInStatusData = [
    { status: 'To Do', days: 2 }, { status: 'In Progress', days: 5 }, { status: 'In Review', days: 3 }, { status: 'Done', days: 1 }
];


const renderChart = (data: any[], dataKey: string, xAxisKey: string, title: string, description: string, icon: React.ElementType) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        {React.createElement(icon, { className: "h-5 w-5 text-primary"})}
        <CardTitle>{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          <Bar dataKey={dataKey} fill="var(--color-storyPoints)" radius={4} />
        </BarChart>
      </ChartContainer>
    </CardContent>
  </Card>
);

export function AgileMetricsTab() {
  return (
    <div className="p-1">
    <Tabs defaultValue="velocity" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 h-auto flex-wrap">
        <TabsTrigger value="velocity"><Icons.velocity className="mr-2" />Velocity</TabsTrigger>
        <TabsTrigger value="burndown"><Icons.burndown className="mr-2" />Burndown</TabsTrigger>
        <TabsTrigger value="cycleTime"><Icons.cycleTime className="mr-2" />Cycle Time</TabsTrigger>
        <TabsTrigger value="throughput"><Icons.throughput className="mr-2" />Throughput</TabsTrigger>
        <TabsTrigger value="sprintCommitment"><Icons.sprintCommitment className="mr-2" />Sprint Commitment</TabsTrigger>
        <TabsTrigger value="rollingVelocity"><Icons.rollingVelocity className="mr-2" />Rolling Velocity</TabsTrigger>
        <TabsTrigger value="scopeChange"><Icons.scopeChange className="mr-2" />Scope Change</TabsTrigger>
        <TabsTrigger value="leadTime"><Icons.leadTime className="mr-2" />Lead Time</TabsTrigger>
        <TabsTrigger value="workingHours"><Icons.workingHours className="mr-2" />Working Hours</TabsTrigger>
        <TabsTrigger value="timeInStatus"><Icons.timeInStatus className="mr-2" />Time in Status</TabsTrigger>
      </TabsList>

      <TabsContent value="velocity" className="mt-4">
        {renderChart(velocityData, "storyPoints", "sprint", "Velocity", "Story points completed per sprint.", Icons.velocity)}
      </TabsContent>
      <TabsContent value="burndown" className="mt-4">
         <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icons.burndown className="h-5 w-5 text-primary" />
              <CardTitle>Burndown Chart</CardTitle>
            </div>
            <CardDescription>Tracks remaining work against time in a sprint.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={burndownData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="cycleTime" className="mt-4">
        {renderChart(cycleTimeData, "days", "task", "Cycle Time", "Time taken to complete tasks from start to finish.", Icons.cycleTime)}
      </TabsContent>
      <TabsContent value="throughput" className="mt-4">
        {renderChart(throughputData, "issues", "week", "Throughput", "Number of issues completed per week.", Icons.throughput)}
      </TabsContent>
       <TabsContent value="sprintCommitment" className="mt-4">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Icons.sprintCommitment className="h-5 w-5 text-primary" />
                    <CardTitle>Sprint Commitment</CardTitle>
                </div>
                <CardDescription>Committed vs. completed story points per sprint.</CardDescription>
            </CardHeader>
            <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={sprintCommitmentData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="sprint" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="commitment" fill="var(--color-commitment)" radius={4} />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                </BarChart>
            </ChartContainer>
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rollingVelocity" className="mt-4">
        {renderChart(rollingVelocityData, "velocity", "period", "Rolling Velocity", "Average velocity over several past sprints.", Icons.rollingVelocity)}
      </TabsContent>
      <TabsContent value="scopeChange" className="mt-4">
         <Card>
            <CardHeader>
                 <div className="flex items-center gap-2">
                    <Icons.scopeChange className="h-5 w-5 text-primary" />
                    <CardTitle>Scope Change</CardTitle>
                </div>
                <CardDescription>Amount of work added or removed during a sprint.</CardDescription>
            </CardHeader>
            <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={scopeChangeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="sprint" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="added" stackId="a" fill="var(--color-destructive)" radius={[4,4,0,0]}/>
                    <Bar dataKey="removed" stackId="a" fill="var(--color-scopeChange)" radius={[4,4,0,0]} />
                </BarChart>
            </ChartContainer>
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="leadTime" className="mt-4">
        {renderChart(leadTimeData, "days", "feature", "Lead Time", "Total time from idea to delivery for features.", Icons.leadTime)}
      </TabsContent>
      <TabsContent value="workingHours" className="mt-4">
        {renderChart(workingHoursData, "hours", "day", "Working Hours", "Logged working hours per day.", Icons.workingHours)}
      </TabsContent>
      <TabsContent value="timeInStatus" className="mt-4">
        {renderChart(timeInStatusData, "days", "status", "Time in Status", "Average time issues spend in each status.", Icons.timeInStatus)}
      </TabsContent>
    </Tabs>
    </div>
  );
}
