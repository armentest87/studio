
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';

const chartConfig = {
  todo: { label: "To Do", color: "hsl(var(--chart-1))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
  inReview: { label: "In Review", color: "hsl(var(--chart-3))" },
  done: { label: "Done", color: "hsl(var(--chart-4))" },
};

const cfdData = [
  { date: '2024-07-01', todo: 30, inProgress: 10, inReview: 5, done: 50 },
  { date: '2024-07-02', todo: 28, inProgress: 12, inReview: 6, done: 52 },
  { date: '2024-07-03', todo: 25, inProgress: 15, inReview: 7, done: 55 },
  { date: '2024-07-04', todo: 22, inProgress: 16, inReview: 8, done: 60 },
  { date: '2024-07-05', todo: 20, inProgress: 18, inReview: 7, done: 65 },
  { date: '2024-07-06', todo: 18, inProgress: 15, inReview: 10, done: 70 },
  { date: '2024-07-07', todo: 15, inProgress: 12, inReview: 8, done: 78 },
];

export function AdvancedMetricsTab() {
  return (
    <div className="p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.cfd className="h-5 w-5 text-primary" />
            <CardTitle>Cumulative Flow Diagram (CFD)</CardTitle>
          </div>
          <CardDescription>Visualizes the flow of work through different statuses over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[450px] w-full">
            <AreaChart data={cfdData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip content={<ChartTooltipContent indicator="line" />} />
              <Legend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="done" stackId="1" stroke="var(--color-done)" fill="var(--color-done)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="inReview" stackId="1" stroke="var(--color-inReview)" fill="var(--color-inReview)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="inProgress" stackId="1" stroke="var(--color-inProgress)" fill="var(--color-inProgress)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="todo" stackId="1" stroke="var(--color-todo)" fill="var(--color-todo)" fillOpacity={0.6} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
