
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const chartConfig = {
  count: { label: "Count", color: "hsl(var(--chart-1))" },
};

// For now, we'll keep the selectable fields static, but derive data dynamically.
// A more advanced version could discover custom fields.
const MOCK_CUSTOM_FIELDS_AVAILABLE = [
    { value: 'priority.name', name: 'Priority Name' },
    { value: 'status.name', name: 'Status Name' },
    { value: 'type.name', name: 'Issue Type Name' },
    { value: 'assignee.displayName', name: 'Assignee Name' },
    { value: 'project.name', name: 'Project Name' },
    { value: 'labels', name: 'Labels (Exploded)'}, // Special handling for arrays
];

type CustomFieldKey = typeof MOCK_CUSTOM_FIELDS_AVAILABLE[number]['value'];


const LoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3 mb-1" />
        <Skeleton className="h-10 w-1/3" />
      </div>
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[350px] w-full" />
    </CardContent>
  </Card>
);


export function CustomAnalysisTab() {
  const context = useContext(JiraDataContext);
  const [selectedField, setSelectedField] = useState<CustomFieldKey>(MOCK_CUSTOM_FIELDS_AVAILABLE[0].value);


  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const currentData = useMemo(() => {
    if (!issues || issues.length === 0 || !selectedField) return [];

    const valueCounts = new Map<string, number>();

    issues.forEach(issue => {
      let value: any;
      if (selectedField.includes('.')) {
        const parts = selectedField.split('.');
        value = issue;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
      } else {
        value = issue[selectedField];
      }
      
      if (selectedField === 'labels' && Array.isArray(value)) {
        if (value.length === 0) {
            const valStr = 'No Labels';
            valueCounts.set(valStr, (valueCounts.get(valStr) || 0) + 1);
        } else {
            value.forEach((label: string) => {
                const valStr = String(label || 'N/A');
                valueCounts.set(valStr, (valueCounts.get(valStr) || 0) + 1);
            });
        }
      } else if (value !== undefined && value !== null) {
        const valStr = String(value);
        valueCounts.set(valStr, (valueCounts.get(valStr) || 0) + 1);
      } else {
        const valStr = 'N/A';
        valueCounts.set(valStr, (valueCounts.get(valStr) || 0) + 1);
      }
    });

    return Array.from(valueCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count); // Sort by count descending

  }, [issues, selectedField]);

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
  
  if (!issues || issues.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched. Please use the sidebar to fetch issues.</div>;
  }

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icons.customFieldDist className="h-5 w-5 text-primary" />
                <CardTitle>Field Distribution</CardTitle>
            </div>
            <div className="w-1/3 md:w-1/4">
              <Label htmlFor="custom-field-select" className="sr-only">Select Field</Label>
              <Select value={selectedField} onValueChange={(value) => setSelectedField(value as CustomFieldKey)}>
                <SelectTrigger id="custom-field-select">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CUSTOM_FIELDS_AVAILABLE.map(field => (
                    <SelectItem key={field.value} value={field.value}>{field.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>Distribution of issues based on the selected field.</CardDescription>
        </CardHeader>
        <CardContent>
          {currentData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart data={currentData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false}/>
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No data available for the selected field or filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    