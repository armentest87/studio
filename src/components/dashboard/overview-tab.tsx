"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const overviewData = {
  totalIssues: 1250,
  completedIssues: 980,
  openIssues: 270,
  completionPercentage: Math.round((980 / 1250) * 100),
  recentActivity: [
    { id: 'PROJ-123', summary: 'Fix login button display issue on mobile', status: 'In Progress', type: 'Bug', assignee: 'Alice' },
    { id: 'PROJ-124', summary: 'Implement new user profile page', status: 'To Do', type: 'Story', assignee: 'Bob' },
    { id: 'PROJ-120', summary: 'Update documentation for API v2', status: 'Done', type: 'Task', assignee: 'Charlie' },
    { id: 'PROJ-121', summary: 'Investigate performance degradation on dashboard', status: 'In Review', type: 'Bug', assignee: 'David' },
    { id: 'PROJ-122', summary: 'Design new onboarding flow', status: 'Done', type: 'Story', assignee: 'Eve' },
  ],
};

export function OverviewTab() {
  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <Icons.table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.totalIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Issues</CardTitle>
            <Icons.checkCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.completedIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Marked as done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <Icons.alertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.openIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently active or pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Completion</CardTitle>
          <CardDescription>Percentage of issues completed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={overviewData.completionPercentage} aria-label={`${overviewData.completionPercentage}% completed`} />
          <p className="text-lg font-semibold text-primary">{overviewData.completionPercentage}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>A snapshot of recently updated issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overviewData.recentActivity.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium">{issue.id}</TableCell>
                  <TableCell>{issue.summary}</TableCell>
                  <TableCell>
                    <Badge variant={
                      issue.status === 'Done' ? 'default' : 
                      issue.status === 'In Progress' ? 'secondary' : 
                      'outline'
                    } className={issue.status === 'Done' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}>
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{issue.type}</TableCell>
                  <TableCell>{issue.assignee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
