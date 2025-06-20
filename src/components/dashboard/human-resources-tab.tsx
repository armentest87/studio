
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; 
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

// PLACEHOLDER: Replace with actual custom field IDs
const DEPARTMENT_FIELD = 'customfield_user_department'; 
const POSITION_FIELD = 'customfield_employee_position';
const CATEGORY_FIELD = 'customfield_employee_category';
const SALARY_FIELD = 'customfield_employee_salary'; 

export function HumanResourcesTab() {
  const context = useContext(JiraDataContext);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');


  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueDepartments = useMemo(() => {
    if(!issues) return ['All'];
    const depts = Array.from(new Set(issues.map(i => i[DEPARTMENT_FIELD]).filter(Boolean) as string[]));
    return ['All', ...depts.sort()];
  }, [issues]);

  const uniquePositions = useMemo(() => {
    if(!issues) return ['All'];
    const pos = Array.from(new Set(issues.map(i => i[POSITION_FIELD]).filter(Boolean) as string[]));
    return ['All', ...pos.sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const departmentMatch = selectedDepartment === 'All' || issue[DEPARTMENT_FIELD] === selectedDepartment;
      const positionMatch = selectedPosition === 'All' || issue[POSITION_FIELD] === selectedPosition;
      let salaryMatch = true;
      const salary = typeof issue[SALARY_FIELD] === 'number' ? issue[SALARY_FIELD] : null;
      if (salary !== null) {
        if (minSalary && salary < parseFloat(minSalary)) salaryMatch = false;
        if (maxSalary && salary > parseFloat(maxSalary)) salaryMatch = false;
      } else if (minSalary || maxSalary) { 
          salaryMatch = false;
      }
      return departmentMatch && positionMatch && salaryMatch;
    });
  }, [issues, selectedDepartment, selectedPosition, minSalary, maxSalary]);

  const employeeCategoryData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const category = issue[CATEGORY_FIELD] || 'Unknown Category';
      acc[category] = (acc[category] || 0) + 1; 
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredIssues]);

  const salariesByPositionData = useMemo(() => {
    if (!filteredIssues || filteredIssues.length === 0) return [];
    const summary: Record<string, {name: string, totalSalary: number, count: number}> = {};
    filteredIssues.forEach(issue => {
        const position = issue[POSITION_FIELD] || 'Unknown Position';
        const salary = typeof issue[SALARY_FIELD] === 'number' ? issue[SALARY_FIELD] : 0;
        if (!summary[position]) {
            summary[position] = { name: position, totalSalary: 0, count: 0 };
        }
        summary[position].totalSalary += salary;
        if(salary > 0) summary[position].count++; // Only count if salary is present
    });
    // For bar chart, let's use total salary for now, average could be another option
    return Object.values(summary)
        .map(s => ({ name: s.name, value: s.totalSalary})) // Using 'value' for bar chart dataKey
        .filter(d => d.value > 0).sort((a,b)=>b.value - a.value);
  }, [filteredIssues]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  if (filteredIssues.length === 0 && issues.length > 0) return <div className="p-4 text-center text-muted-foreground">No issues match the current filter criteria.</div>;


  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="hr-dept-filter">Department (CF: {DEPARTMENT_FIELD})</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={uniqueDepartments.length <=1}>
              <SelectTrigger id="hr-dept-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueDepartments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hr-pos-filter">Position (CF: {POSITION_FIELD})</Label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={uniquePositions.length <=1}>
              <SelectTrigger id="hr-pos-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniquePositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-2"> {/* Salary Range might need more space */}
            <Label>Salary Range (CF: {SALARY_FIELD})</Label>
            <div className="flex gap-2">
                <Input type="number" placeholder="Min Salary" value={minSalary} onChange={e => setMinSalary(e.target.value)} className="w-1/2"/>
                <Input type="number" placeholder="Max Salary" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} className="w-1/2"/>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.pieChart className="h-5 w-5 text-primary" /><CardTitle>Employee Category Distribution</CardTitle></div>
            <CardDescription>Breaks down employee types.</CardDescription>
          </CardHeader>
          <CardContent>
            {employeeCategoryData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={employeeCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 3 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {employeeCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for employee categories. Ensure custom field '{CATEGORY_FIELD}' is populated.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Total Salaries by Position</CardTitle></div>
            <CardDescription>Compares compensation across roles.</CardDescription>
          </CardHeader>
          <CardContent>
            {salariesByPositionData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Total Salary", color: "hsl(var(--chart-2))"} }} className="h-[300px] w-full">
                <BarChart data={salariesByPositionData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" unit="$" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} interval={0}/>
                  <Tooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Total Salary" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for salaries by position. Ensure custom fields '{POSITION_FIELD}' and '{SALARY_FIELD}' are populated.</p>}
          </CardContent>
        </Card>
      </div>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab relies on placeholder custom field IDs (e.g., '{DEPARTMENT_FIELD}', '{POSITION_FIELD}', '{CATEGORY_FIELD}', '{SALARY_FIELD}'). Please update these to your actual Jira custom field IDs.
      </CardDescription>
    </div>
  );
}
