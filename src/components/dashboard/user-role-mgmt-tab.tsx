
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

// PLACEHOLDER: Replace with actual custom field IDs from your Jira instance
const ROLE_CUSTOM_FIELD = 'customfield_user_role'; 
const DEPARTMENT_CUSTOM_FIELD = 'customfield_user_department';

export function UserRoleMgmtTab() {
  const context = useContext(JiraDataContext);
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }
  const { issues, isLoading, error } = context;

  const uniqueUsers = useMemo(() => {
    if (!issues) return ['All'];
    const users = new Set<string>();
    issues.forEach(issue => {
      if (issue.assignee?.displayName) users.add(issue.assignee.displayName);
      if (issue.reporter?.displayName) users.add(issue.reporter.displayName);
    });
    return ['All', ...Array.from(users).sort()];
  }, [issues]);
  
  const uniqueRoles = useMemo(() => {
    if(!issues) return ['All'];
    const roles = Array.from(new Set(issues.map(i => i[ROLE_CUSTOM_FIELD]).filter(Boolean) as string[]));
    return ['All', ...roles.sort()];
  }, [issues]);

  const uniqueDepartments = useMemo(() => {
    if(!issues) return ['All'];
    const depts = Array.from(new Set(issues.map(i => i[DEPARTMENT_CUSTOM_FIELD]).filter(Boolean) as string[]));
    return ['All', ...depts.sort()];
  }, [issues]);


  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const userMatch = selectedUserFilter === 'All' || 
                        issue.assignee?.displayName === selectedUserFilter || 
                        issue.reporter?.displayName === selectedUserFilter;
      const roleMatch = selectedRole === 'All' || issue[ROLE_CUSTOM_FIELD] === selectedRole;
      const departmentMatch = selectedDepartment === 'All' || issue[DEPARTMENT_CUSTOM_FIELD] === selectedDepartment;
      return userMatch && roleMatch && departmentMatch;
    });
  }, [issues, selectedUserFilter, selectedRole, selectedDepartment]);

  const issuesPerAssigneeData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const assigneeName = issue.assignee?.displayName || 'Unassigned';
      acc[assigneeName] = (acc[assigneeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b)=> b.value - a.value);
  }, [filteredIssues]);

  const issuesByReporterData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const reporterName = issue.reporter?.displayName || 'Unknown Reporter';
      acc[reporterName] = (acc[reporterName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value);
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
            <Label htmlFor="urm-user-filter">User (Assignee/Reporter)</Label>
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter} disabled={uniqueUsers.length <=1}>
              <SelectTrigger id="urm-user-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="urm-role-filter">Role (CF: {ROLE_CUSTOM_FIELD})</Label>
             <Select value={selectedRole} onValueChange={setSelectedRole} disabled={uniqueRoles.length <=1}>
              <SelectTrigger id="urm-role-filter"><SelectValue placeholder="N/A if no data"/></SelectTrigger>
              <SelectContent>{uniqueRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="urm-dept-filter">Department (CF: {DEPARTMENT_CUSTOM_FIELD})</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={uniqueDepartments.length <=1}>
              <SelectTrigger id="urm-dept-filter"><SelectValue placeholder="N/A if no data"/></SelectTrigger>
              <SelectContent>{uniqueDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.assignee className="h-5 w-5 text-primary" /><CardTitle>Issues per Assignee</CardTitle></div>
            <CardDescription>Workload distribution across team members.</CardDescription>
          </CardHeader>
          <CardContent>
            {issuesPerAssigneeData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Issues", color: "hsl(var(--chart-1))"} }} className="h-[300px] w-full">
                <BarChart data={issuesPerAssigneeData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} interval={0}/>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Issues" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for issues per assignee with current filters.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.pieChart className="h-5 w-5 text-primary" /><CardTitle>Issues by Reporter</CardTitle></div>
            <CardDescription>Who is reporting issues most frequently.</CardDescription>
          </CardHeader>
          <CardContent>
            {issuesByReporterData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={issuesByReporterData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 3 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {issuesByReporterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for issues by reporter with current filters.</p>}
          </CardContent>
        </Card>
      </div>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: 'Role' and 'Department' filters depend on specific custom fields (e.g., `{ROLE_CUSTOM_FIELD}`, `{DEPARTMENT_CUSTOM_FIELD}`) being present and correctly identified in your Jira data and `jira-actions.ts`.
      </CardDescription>
    </div>
  );
}
