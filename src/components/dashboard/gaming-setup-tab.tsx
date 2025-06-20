
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
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

// Custom field ID from doc: customfield_12804 (Number of Tables)
// Named custom fields: Location, Game Type
const LOCATION_FIELD = 'customfield_physical_location'; // Example ID
const GAME_TYPE_FIELD = 'customfield_game_type'; // Example ID
const NUM_TABLES_FIELD = 'customfield_12804';

export function GamingSetupTab() {
  const context = useContext(JiraDataContext);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedGameType, setSelectedGameType] = useState('All');

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueLocations = useMemo(() => {
    if(!issues) return ['All'];
    const locs = Array.from(new Set(issues.map(i => i[LOCATION_FIELD]).filter(Boolean) as string[]));
    return ['All', ...locs.sort()];
  }, [issues]);

  const uniqueGameTypes = useMemo(() => {
    if(!issues) return ['All'];
    const types = Array.from(new Set(issues.map(i => i[GAME_TYPE_FIELD]).filter(Boolean) as string[]));
    return ['All', ...types.sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const locationMatch = selectedLocation === 'All' || issue[LOCATION_FIELD] === selectedLocation;
      const gameTypeMatch = selectedGameType === 'All' || issue[GAME_TYPE_FIELD] === selectedGameType;
      return locationMatch && gameTypeMatch;
    });
  }, [issues, selectedLocation, selectedGameType]);

  const tablesPerLocationData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const summary = filteredIssues.reduce((acc, issue) => {
      const location = issue[LOCATION_FIELD] || 'Unknown Location';
      // Assuming customfield_12804 holds the number of tables for *that specific issue/record*
      // If it's a sum per location, the data structure in Jira might be different.
      // This sums up customfield_12804 if multiple issues share a location.
      const numTables = typeof issue[NUM_TABLES_FIELD] === 'number' ? issue[NUM_TABLES_FIELD] : 0;
      acc[location] = (acc[location] || 0) + numTables;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a,b)=>b.value-a.value);
  }, [filteredIssues]);

  const gameTypeDistributionData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const gameType = issue[GAME_TYPE_FIELD] || 'Unknown Game Type';
      acc[gameType] = (acc[gameType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredIssues]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gs-location-filter">Location (e.g., CF: {LOCATION_FIELD})</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={uniqueLocations.length <=1}>
              <SelectTrigger id="gs-location-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gs-gametype-filter">Game Type (e.g., CF: {GAME_TYPE_FIELD})</Label>
            <Select value={selectedGameType} onValueChange={setSelectedGameType} disabled={uniqueGameTypes.length <=1}>
              <SelectTrigger id="gs-gametype-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueGameTypes.map(gt => <SelectItem key={gt} value={gt}>{gt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Tables per Location</CardTitle></div>
            <CardDescription>Tracks table distribution (uses CF {NUM_TABLES_FIELD}).</CardDescription>
          </CardHeader>
          <CardContent>
            {tablesPerLocationData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Tables", color: "hsl(var(--chart-1))"} }} className="h-[300px] w-full">
                <BarChart data={tablesPerLocationData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Tables" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for tables per location. Ensure custom fields '{LOCATION_FIELD}' and '{NUM_TABLES_FIELD}' are populated.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.pieChart className="h-5 w-5 text-primary" /><CardTitle>Game Type Distribution</CardTitle></div>
            <CardDescription>Shows variety of games.</CardDescription>
          </CardHeader>
          <CardContent>
            {gameTypeDistributionData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={gameTypeDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 3 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {gameTypeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for game type distribution. Ensure custom field '{GAME_TYPE_FIELD}' is populated.</p>}
          </CardContent>
        </Card>
      </div>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab relies on specific custom fields like '{NUM_TABLES_FIELD}' and example names like '{LOCATION_FIELD}', '{GAME_TYPE_FIELD}'. Please update these to your actual Jira custom field IDs/names.
      </CardDescription>
    </div>
  );
}
