
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
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

export function FinancePaymentsTab() {
  const context = useContext(JiraDataContext);
  // Custom fields: customfield_12929 (Cost Centers), customfield_12606 (Amount), customfield_12608 (Payment Type)
  // customfield_12905 (Payment Due Date), customfield_12902 (Payer Company)
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({}); // For created or Payment Due Date
  const [selectedCostCenter, setSelectedCostCenter] = useState('All');
  const [selectedPayerCompany, setSelectedPayerCompany] = useState('All');

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const uniqueCostCenters = useMemo(() => {
    if(!issues) return ['All'];
    const centers = Array.from(new Set(issues.map(i => i.customfield_12929).filter(Boolean) as string[]));
    return ['All', ...centers.sort()];
  }, [issues]);

  const uniquePayerCompanies = useMemo(() => {
    if(!issues) return ['All'];
    const companies = Array.from(new Set(issues.map(i => i.customfield_12902).filter(Boolean) as string[]));
    return ['All', ...companies.sort()];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(issue => {
      const costCenterMatch = selectedCostCenter === 'All' || issue.customfield_12929 === selectedCostCenter;
      const payerCompanyMatch = selectedPayerCompany === 'All' || issue.customfield_12902 === selectedPayerCompany;
      let dateMatch = true;
      // Filter by created date or payment due date. Let's use created for now or provide a toggle later.
      const issueDate = issue.customfield_12905 && isValid(parseISO(issue.customfield_12905)) ? parseISO(issue.customfield_12905) : (issue.created && isValid(parseISO(issue.created)) ? parseISO(issue.created) : null);
      if (dateRange.from && issueDate) {
        dateMatch = dateMatch && issueDate >= dateRange.from;
      }
      if (dateRange.to && issueDate) {
        const toDate = new Date(dateRange.to); toDate.setDate(toDate.getDate() + 1);
        dateMatch = dateMatch && issueDate < toDate;
      }
      return costCenterMatch && payerCompanyMatch && dateMatch;
    });
  }, [issues, dateRange, selectedCostCenter, selectedPayerCompany]);

  const totalAmountByCostCenterData = useMemo(() => {
    if (!filteredIssues) return [];
    const summary = filteredIssues.reduce((acc, issue) => {
      const costCenter = issue.customfield_12929 || 'Unknown Cost Center';
      const amount = typeof issue.customfield_12606 === 'number' ? issue.customfield_12606 : 0;
      acc[costCenter] = (acc[costCenter] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a,b)=>b.value - a.value);
  }, [filteredIssues]);

  const paymentTypeDistributionData = useMemo(() => {
    if (!filteredIssues) return [];
    const counts = filteredIssues.reduce((acc, issue) => {
      const paymentType = issue.customfield_12608 || 'Unknown Payment Type';
      acc[paymentType] = (acc[paymentType] || 0) + 1;
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fp-date-range">Date Range (Payment Due / Created)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="fp-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && !dateRange.to && "text-muted-foreground")}>
                  <Icons.date className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (dateRange.to ? `Until ${format(dateRange.to, "LLL dd, y")}`: <span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="fp-cost-center-filter">Cost Center (CF 12929)</Label>
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter} disabled={uniqueCostCenters.length <=1}>
              <SelectTrigger id="fp-cost-center-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniqueCostCenters.map(cc => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fp-payer-filter">Payer Company (CF 12902)</Label>
            <Select value={selectedPayerCompany} onValueChange={setSelectedPayerCompany} disabled={uniquePayerCompanies.length <=1}>
              <SelectTrigger id="fp-payer-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{uniquePayerCompanies.map(pc => <SelectItem key={pc} value={pc}>{pc}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.barChart3 className="h-5 w-5 text-primary" /><CardTitle>Total Amount by Cost Center</CardTitle></div>
            <CardDescription>Financial allocation across cost centers (from CF 12929 & 12606).</CardDescription>
          </CardHeader>
          <CardContent>
            {totalAmountByCostCenterData.length > 0 ? (
              <ChartContainer config={{ value: {label: "Amount", color: "hsl(var(--chart-1))"} }} className="h-[300px] w-full">
                <BarChart data={totalAmountByCostCenterData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" unit="$" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Amount" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for amount by cost center. Ensure custom fields 12929 (Cost Center) and 12606 (Amount) are populated.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Icons.pieChart className="h-5 w-5 text-primary" /><CardTitle>Payment Type Distribution</CardTitle></div>
            <CardDescription>Breakdown of payment methods (from CF 12608).</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentTypeDistributionData.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full">
                <RechartsPieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={paymentTypeDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return ( (percent * 100) > 3 ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text> : null);
                    }}>
                    {paymentTypeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground">No data for payment type distribution. Ensure custom field 12608 (Payment Type) is populated.</p>}
          </CardContent>
        </Card>
      </div>
       <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab relies on specific custom field IDs (e.g., customfield_12929 for Cost Centers, customfield_12606 for Amount). Ensure these are correct for your Jira instance and included in fetched fields.
      </CardDescription>
    </div>
  );
}
