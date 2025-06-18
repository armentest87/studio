
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';

const chartConfig = {
  bugsReported: { label: "Bugs Reported", color: "hsl(var(--chart-1))" }, // Reddish
  bugsResolved: { label: "Bugs Resolved", color: "hsl(var(--chart-2))" }, // Greenish
};

const bugTrendsData = [
  { week: 'W1', bugsReported: 15, bugsResolved: 10 },
  { week: 'W2', bugsReported: 12, bugsResolved: 14 },
  { week: 'W3', bugsReported: 18, bugsResolved: 12 },
  { week: 'W4', bugsReported: 10, bugsResolved: 16 },
  { week: 'W5', bugsReported: 20, bugsResolved: 15 },
  { week: 'W6', bugsReported: 14, bugsResolved: 18 },
];

export function QualityAnalysisTab() {
  return (
    <div className="p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icons.bugTrends className="h-5 w-5 text-primary" />
            <CardTitle>Bug Trends</CardTitle>
          </div>
          <CardDescription>Weekly trends of reported vs. resolved bugs.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <LineChart data={bugTrendsData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip content={<ChartTooltipContent indicator="line" />} />
              <Legend content={<ChartLegendContent />} />
              <Line 
                type="monotone" 
                dataKey="bugsReported" 
                stroke="var(--color-bugsReported)" 
                strokeWidth={3} 
                dot={{ r: 5, fill: "var(--color-bugsReported)" }} 
                activeDot={{r: 7}}
              />
              <Line 
                type="monotone" 
                dataKey="bugsResolved" 
                stroke="var(--color-bugsResolved)" 
                strokeWidth={3} 
                dot={{ r: 5, fill: "var(--color-bugsResolved)" }} 
                activeDot={{r: 7}}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
