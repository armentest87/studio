
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 p-1">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
      </Card>
    ))}
  </div>
);

// PLACEHOLDER: Replace with actual custom field IDs from your Jira instance
const DESIGN_OPTION_FIELD = 'customfield_design_option'; 
const ICON_TYPE_FIELD = 'customfield_icon_type'; 
const APPLICATION_FIELD = 'customfield_application_name'; 

export function DesignUiTab() {
  const context = useContext(JiraDataContext);
  const [selectedDesignType, setSelectedDesignType] = useState('All'); // Corresponds to DESIGN_OPTION_FIELD
  const [selectedApplication, setSelectedApplication] = useState('All');

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueDesignTypes = useMemo(() => {
    if(!issues) return ['All'];
    const types = Array.from(new Set(issues.map(i => i[DESIGN_OPTION_FIELD]).filter(Boolean) as string[]));
    return ['All', ...types.sort()];
  }, [issues]);

  const uniqueApplications = useMemo(() => {
    if(!issues) return ['All'];
    const apps = Array.from(new Set(issues.map(i => i[APPLICATION_FIELD]).filter(Boolean) as string[]));
    return ['All', ...apps.sort()];
  }, [issues]);


  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const designTypeMatch = selectedDesignType === 'All' || issue[DESIGN_OPTION_FIELD] === selectedDesignType;
      const applicationMatch = selectedApplication === 'All' || issue[APPLICATION_FIELD] === selectedApplication;
      return designTypeMatch && applicationMatch;
    });
  }, [issues, selectedDesignType, selectedApplication]);

  const designOptionsData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const option = issue[DESIGN_OPTION_FIELD] || 'Unknown Design Option';
      acc[option] = (acc[option] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredIssues]);

  const iconTypesData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const iconType = issue[ICON_TYPE_FIELD] || 'Unknown Icon Type';
      acc[iconType] = (acc[iconType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a,b)=>b.value-a.value);
  }, [filteredIssues]);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  if (filteredIssues.length === 0 && issues.length > 0) return <div className="p-4 text-center text-muted-foreground">No issues match the current filter criteria.</div>;


  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dui-designtype-filter">Design Type (CF: {DESIGN_OPTION_FIELD})</Label>
            <Select value={selectedDesignType} onValueChange={setSelectedDesignType} disabled={uniqueDesignTypes.length <=1}>
              <SelectTrigger id="dui-designtype-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueDesignTypes.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dui-app-filter">Application (CF: {APPLICATION_FIELD})</Label>
            <Select value={selectedApplication} onValueChange={setSelectedApplication} disabled={uniqueApplications.length <=1}>
              <SelectTrigger id="dui-app-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueApplications.map(app => <SelectItem key={app} value={app}>{app}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.pieChart className="h-5 w-5 text-primary" /><CardTitle>Design Options Distribution</CardTitle></div>
            <CardDescription>Prevalence of different design choices.</CardDescription>
          </CardHeader>
          <CardContent>
            {designOptionsData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart> 
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={designOptionsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 3 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {designOptionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for design options. Ensure custom field '{DESIGN_OPTION_FIELD}' is populated.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Icon Types Usage</CardTitle></div>
            <CardDescription>Analysis of UI icon usage.</CardDescription>
          </CardHeader>
          <CardContent>
            {iconTypesData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Count", color: "hsl(var(--chart-2))"} }} className="h-[300px] w-full">
                <BarChart data={iconTypesData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} interval={0}/>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Count" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for icon types. Ensure custom field '{ICON_TYPE_FIELD}' is populated.</p>}
          </CardContent>
        </Card>
      </div>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab relies on placeholder custom field IDs (e.g., '{DESIGN_OPTION_FIELD}', '{ICON_TYPE_FIELD}', '{APPLICATION_FIELD}'). Please update these to your actual Jira custom field IDs in this file, `jira-actions.ts`, and `types/jira.ts`.
      </CardDescription>
    </div>
  );
}
