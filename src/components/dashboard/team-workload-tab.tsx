"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Icons } from '@/components/icons';

const chartConfig = {
  openIssues: { label: "Open Issues", color: "hsl(var(--chart-1))" },
  completionRate: { label: "Completion Rate (%)", color: "hsl(var(--chart-2))" },
};

const assigneeWorkloadData = [
  { assignee: 'Alice', openIssues: 12 },
  { assignee: 'Bob', openIssues: 8 },
  { assignee: 'Charlie', openIssues: 15 },
  { assignee: 'David', openIssues: 5 },
  { assignee: 'Eve', openIssues: 10 },
];

const taskCompletionRateData = [
  { week: 'Week 1', completionRate: 75 },
  { week: 'Week 2', completionRate: 82 },
  { week: 'Week 3', completionRate: 70 },
  { week: 'Week 4', completionRate: 88 },
  { week: 'Week 5', completionRate: 92 },
];

export function TeamWorkloadTab() {
  return (
    <div className="grid gap-6 p-1 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.assigneeWorkload className="h-5 w-5 text-primary" />
            <CardTitle>Assignee Workload</CardTitle>
          </div>
          <CardDescription>Number of open issues per assignee.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart data={assigneeWorkloadData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis dataKey="assignee" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="openIssues" fill="var(--color-openIssues)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.taskCompletion className="h-5 w-5 text-primary" />
            <CardTitle>Task Completion Rate</CardTitle>
          </div>
          <CardDescription>Weekly task completion percentage.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart data={taskCompletionRateData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis unit="%" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Legend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="completionRate" stroke="var(--color-completionRate)" strokeWidth={3} dot={{ r: 5, fill: "var(--color-completionRate)" }} activeDot={{r: 7}} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
