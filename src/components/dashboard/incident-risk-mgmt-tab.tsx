
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
import { format, parseISO, isValid, isAfter, isBefore } from 'date-fns';
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

// PLACEHOLDER: Replace with actual custom field IDs
const LIKELIHOOD_FIELD = 'customfield_risk_likelihood'; 
const IMPACT_FIELD = 'customfield_risk_impact'; 
const SEVERITY_FIELD = 'customfield_incident_severity';
const INCIDENT_TYPE_FIELD = 'customfield_incident_type';

// Helper to map textual severity/likelihood/impact to numeric values for charting
const mapTextToNumeric = (textValue?: string | null, type: 'severity' | 'likelihood' | 'impact' = 'severity'): number => {
    if (!textValue) return 0;
    const lowerText = textValue.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('very high') || lowerText.includes('highest')) return 5;
    if (lowerText.includes('high') || lowerText.includes('major')) return 4;
    if (lowerText.includes('medium') || lowerText.includes('moderate')) return 3;
    if (lowerText.includes('low')) return 2;
    if (lowerText.includes('minor') || lowerText.includes('trivial') || lowerText.includes('very low')) return 1;
    return 0; // Unknown or not mapped
};
const numericToLabel = (num: number) : string => {
    const map = ['Unknown', 'Very Low/Minor', 'Low', 'Medium', 'High/Major', 'Very High/Critical'];
    return map[num] || String(num);
}


export function IncidentRiskMgmtTab() {
  const context = useContext(JiraDataContext);
  const [selectedIncidentType, setSelectedIncidentType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All'); // This will filter based on the text value of severity
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueIncidentTypes = useMemo(() => {
    if(!issues) return ['All'];
    return ['All', ...Array.from(new Set(issues.map(i => i[INCIDENT_TYPE_FIELD]).filter(Boolean) as string[])).sort()];
  }, [issues]);

  const uniqueSeverities = useMemo(() => {
    if(!issues) return ['All'];
    // Sort by mapped numeric value if possible, then by name
    return ['All', ...Array.from(new Set(issues.map(i => i[SEVERITY_FIELD]).filter(Boolean) as string[]))
        .sort((a,b) => mapTextToNumeric(b) - mapTextToNumeric(a) || a.localeCompare(b))];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const typeMatch = selectedIncidentType === 'All' || issue[INCIDENT_TYPE_FIELD] === selectedIncidentType;
      const severityMatch = selectedSeverity === 'All' || issue[SEVERITY_FIELD] === selectedSeverity;
      let dateMatch = true; 
      if (issue.created && isValid(parseISO(issue.created))) {
        const createdDate = parseISO(issue.created);
        if (dateRange.from && isBefore(createdDate, dateRange.from)) {
          dateMatch = false;
        }
        if (dateRange.to) {
            const toDateInclusive = new Date(dateRange.to);
            toDateInclusive.setHours(23,59,59,999);
            if (isAfter(createdDate, toDateInclusive)) {
                 dateMatch = false;
            }
        }
      } else if (dateRange.from || dateRange.to) {
          dateMatch = false;
      }
      return typeMatch && severityMatch && dateMatch;
    });
  }, [issues, selectedIncidentType, selectedSeverity, dateRange]);

  const riskMatrixData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    return filteredIssues
      .filter(i => i[LIKELIHOOD_FIELD] && i[IMPACT_FIELD]) // Only include issues with both fields
      .map(issue => ({
        id: issue.id,
        summary: issue.summary,
        likelihood: mapTextToNumeric(issue[LIKELIHOOD_FIELD] as string, 'likelihood'),
        impact: mapTextToNumeric(issue[IMPACT_FIELD] as string, 'impact'),
        // Size could be based on count of similar risks, or fixed for now
        z: 1, // Represents count of 1 for each unique risk for scatter
      })).filter(d => d.likelihood > 0 && d.impact > 0); // Only plot valid mappings
  }, [filteredIssues]);

  const incidentsBySeverityData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const severity = issue[SEVERITY_FIELD] || 'Unknown Severity';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b)=> mapTextToNumeric(b.name) - mapTextToNumeric(a.name) || a.name.localeCompare(b.name));
  }, [filteredIssues]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  if (filteredIssues.length === 0 && issues.length > 0) return <div className="p-4 text-center text-muted-foreground">No issues match the current filter criteria.</div>;


  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="irm-type-filter">Incident Type (CF: {INCIDENT_TYPE_FIELD})</Label>
            <Select value={selectedIncidentType} onValueChange={setSelectedIncidentType} disabled={uniqueIncidentTypes.length <=1}>
              <SelectTrigger id="irm-type-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueIncidentTypes.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="irm-severity-filter">Severity (CF: {SEVERITY_FIELD})</Label>
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
            <CardDescription>Visualizes risks by Likelihood and Impact. (Requires numeric mapping for these fields)</CardDescription>
          </CardHeader>
          <CardContent>
            {riskMatrixData.length > 0 ? (
              <ChartContainer config={{}} className="h-[350px] w-full">
                 <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0, 5]} ticks={[1,2,3,4,5]} tickFormatter={(val) => numericToLabel(val) } />
                    <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 5]} ticks={[1,2,3,4,5]} tickFormatter={(val) => numericToLabel(val) }/>
                    <ZAxis dataKey="z" range={[50, 200]} name="Count" unit="" />
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                                <p className="text-sm font-medium">{data.id} - {data.summary}</p>
                                <p className="text-muted-foreground">Likelihood: {numericToLabel(data.likelihood)} ({data.likelihood})</p>
                                <p className="text-muted-foreground">Impact: {numericToLabel(data.impact)} ({data.impact})</p>
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
            <CardDescription>Highlights incident distribution by severity.</CardDescription>
          </CardHeader>
          <CardContent>
            {incidentsBySeverityData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Incidents", color: "hsl(var(--chart-2))"} }} className="h-[350px] w-full">
                <BarChart data={incidentsBySeverityData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} interval={0}/>
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
        Note: This tab relies on placeholder custom field IDs (e.g., '{LIKELIHOOD_FIELD}', '{IMPACT_FIELD}', '{SEVERITY_FIELD}', '{INCIDENT_TYPE_FIELD}'). Please update these to your actual Jira custom field IDs. Risk Matrix requires textual likelihood/impact values to be mapped to numbers (1-5 example used).
      </CardDescription>
    </div>
  );
}
