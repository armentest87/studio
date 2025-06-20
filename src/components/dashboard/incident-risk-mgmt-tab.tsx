
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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

// Example custom field names
const LIKELIHOOD_FIELD = 'customfield_risk_likelihood'; // e.g., Low, Medium, High (map to numbers)
const IMPACT_FIELD = 'customfield_risk_impact'; // e.g., Low, Medium, High (map to numbers)
const SEVERITY_FIELD = 'customfield_incident_severity';
const INCIDENT_TYPE_FIELD = 'customfield_incident_type';

const mapSeverityToValue = (severity?: string | null): number => {
    if (!severity) return 0;
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity.includes('critical') || lowerSeverity.includes('highest')) return 5;
    if (lowerSeverity.includes('high') || lowerSeverity.includes('major')) return 4;
    if (lowerSeverity.includes('medium') || lowerSeverity.includes('moderate')) return 3;
    if (lowerSeverity.includes('low')) return 2;
    if (lowerSeverity.includes('minor') || lowerSeverity.includes('trivial')) return 1;
    return 0;
}

export function IncidentRiskMgmtTab() {
  const context = useContext(JiraDataContext);
  const [selectedIncidentType, setSelectedIncidentType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueIncidentTypes = useMemo(() => {
    if(!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i[INCIDENT_TYPE_FIELD]).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const uniqueSeverities = useMemo(() => {
    if(!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i[SEVERITY_FIELD]).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const typeMatch = selectedIncidentType === 'All' || issue[INCIDENT_TYPE_FIELD] === selectedIncidentType;
      const severityMatch = selectedSeverity === 'All' || issue[SEVERITY_FIELD] === selectedSeverity;
      let dateMatch = true; 
      if (dateRange.from && issue.created && isValid(parseISO(issue.created))) {
        dateMatch = dateMatch && parseISO(issue.created) >= dateRange.from;
      }
      if (dateRange.to && issue.created && isValid(parseISO(issue.created))) {
        const toDate = new Date(dateRange.to); toDate.setDate(toDate.getDate() + 1);
        dateMatch = dateMatch && parseISO(issue.created) < toDate;
      }
      return typeMatch && severityMatch && dateMatch;
    });
  }, [issues, selectedIncidentType, selectedSeverity, dateRange]);

  // Risk Matrix: Simplified as a scatter plot
  // X-axis: Likelihood, Y-axis: Impact. Requires mapping text values to numbers.
  const riskMatrixData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    return filteredIssues
      .filter(i => i[LIKELIHOOD_FIELD] && i[IMPACT_FIELD])
      .map(issue => ({
        id: issue.id,
        summary: issue.summary,
        likelihood: mapSeverityToValue(issue[LIKELIHOOD_FIELD] as string), // Reuse mapping or create new
        impact: mapSeverityToValue(issue[IMPACT_FIELD] as string), // Reuse mapping or create new
        // Size could be based on another factor, e.g., number of affected users, or fixed
        z: 100, // Fixed size for scatter plot points
      })).filter(d => d.likelihood > 0 && d.impact > 0);
  }, [filteredIssues]);

  const incidentsBySeverityData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const severity = issue[SEVERITY_FIELD] || 'Unknown Severity';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b)=> mapSeverityToValue(b.name) - mapSeverityToValue(a.name));
  }, [filteredIssues]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="irm-type-filter">Incident Type (e.g., CF: {INCIDENT_TYPE_FIELD})</Label>
            <Select value={selectedIncidentType} onValueChange={setSelectedIncidentType} disabled={uniqueIncidentTypes.length <=1}>
              <SelectTrigger id="irm-type-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueIncidentTypes.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="irm-severity-filter">Severity (e.g., CF: {SEVERITY_FIELD})</Label>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity} disabled={uniqueSeverities.length <=1}>
              <SelectTrigger id="irm-severity-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueSeverities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="irm-date-range">Date Range (Created)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="irm-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && !dateRange.to && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (dateRange.to ? `Until ${format(dateRange.to, "LLL dd, y")}`: <span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.alertTriangle className="h-5 w-5 text-primary" /><CardTitle>Risk Matrix (Simplified)</CardTitle></div>
            <CardDescription>Assesses risk levels. (Likelihood/Impact need numeric mapping)</CardDescription>
          </CardHeader>
          <CardContent>
            {riskMatrixData.length > 0 ? (
              <ChartContainer config={{}} className="h-[350px] w-full">
                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0,5]} ticks={[1,2,3,4,5]} tickFormatter={(val) => ['Trivial','Low','Medium','High','Critical'][val-1] || val } />
                    <YAxis type="number" dataKey="impact" name="Impact" domain={[0,5]} ticks={[1,2,3,4,5]} tickFormatter={(val) => ['Trivial','Low','Medium','High','Critical'][val-1] || val }/>
                    <ZAxis type="number" dataKey="z" range={[50, 200]} name="Count" unit="" />
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <p className="text-sm font-medium">{data.id} - {data.summary}</p>
                                <p className="text-xs text-muted-foreground">Likelihood: {data.likelihood}</p>
                                <p className="text-xs text-muted-foreground">Impact: {data.impact}</p>
                            </div>
                            );
                        }
                        return null;
                    }} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Risks" data={riskMatrixData} fill="hsl(var(--chart-3))" />
                </ScatterChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for risk matrix. Ensure custom fields '{LIKELIHOOD_FIELD}' and '{IMPACT_FIELD}' are populated and mapped to numeric values.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Incidents by Severity</CardTitle></div>
            <CardDescription>Highlights incident distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            {incidentsBySeverityData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Incidents", color: "hsl(var(--chart-2))"} }} className="h-[350px] w-full">
                <BarChart data={incidentsBySeverityData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Incidents" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for incidents by severity. Ensure custom field '{SEVERITY_FIELD}' is populated.</p>}
          </CardContent>
        </Card>
      </div>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab relies on example custom field names like '{LIKELIHOOD_FIELD}', '{IMPACT_FIELD}', '{SEVERITY_FIELD}', '{INCIDENT_TYPE_FIELD}'. Please update these to your actual Jira custom field IDs/names. Risk Matrix requires textual likelihood/impact values to be mapped to numbers (1-5 used as example).
      </CardDescription>
    </div>
  );
}
