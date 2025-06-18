"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Icons } from '@/components/icons';

const chartConfig = {
  count: { label: "Count", color: "hsl(var(--chart-1))" },
};

const customFieldData = {
  priority: [
    { name: 'Highest', count: 25 },
    { name: 'High', count: 60 },
    { name: 'Medium', count: 150 },
    { name: 'Low', count: 80 },
    { name: 'Lowest', count: 30 },
  ],
  region: [
    { name: 'North America', count: 120 },
    { name: 'Europe', count: 95 },
    { name: 'Asia', count: 70 },
    { name: 'South America', count: 40 },
    { name: 'Australia', count: 20 },
  ],
  productLine: [
    { name: 'Core Platform', count: 200 },
    { name: 'Mobile App', count: 75 },
    { name: 'API Services', count: 50 },
    { name: 'Integrations', count: 25 },
  ]
};

type CustomFieldKey = keyof typeof customFieldData;

export function CustomAnalysisTab() {
  const [selectedField, setSelectedField] = React.useState<CustomFieldKey>('priority');

  const currentData = customFieldData[selectedField];

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icons.customFieldDist className="h-5 w-5 text-primary" />
                <CardTitle>Custom Field Distribution</CardTitle>
            </div>
            <div className="w-1/3">
              <Label htmlFor="custom-field-select" className="sr-only">Select Custom Field</Label>
              <Select value={selectedField} onValueChange={(value) => setSelectedField(value as CustomFieldKey)}>
                <SelectTrigger id="custom-field-select">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="productLine">Product Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>Distribution of issues based on the selected custom field.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={currentData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} />
              <Tooltip content={<ChartTooltipContent indicator="line" />} />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
