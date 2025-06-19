
"use client";

import React, { useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (statusName?: string, statusCategoryKey?: string) => {
  if (statusCategoryKey === 'done' || statusName?.toLowerCase() === 'done') {
    return 'default'; // Or a success variant if you define one
  }
  if (statusName?.toLowerCase().includes('progress')) {
    return 'secondary';
  }
  return 'outline';
};

const getStatusBadgeClass = (statusName?: string, statusCategoryKey?: string) => {
    if (statusCategoryKey === 'done' || statusName?.toLowerCase() === 'done') {
        return 'bg-green-500 hover:bg-green-600 text-white';
    }
    return '';
};


export function OverviewTab() {
  const context = useContext(JiraDataContext);

  if (!context) {
    // This should not happen if the component is used within JiraDataProvider
    return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  }

  const { issues, isLoading, error } = context;

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-1/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-2 border-b last:border-b-0">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-2/6" />
                <Skeleton className="h-6 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error loading data: {error}</div>;
  }

  if (!issues || issues.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No Jira issues found or fetched yet. Please use the sidebar to fetch issues.</div>;
  }

  const totalIssues = issues.length;
  const completedIssues = issues.filter(issue => issue.status?.statusCategory?.key === 'done').length;
  const openIssues = totalIssues - completedIssues;
  const completionPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;
  
  // Take top 5 or all if less than 5, sort by updated date descending if available
  const recentActivity = [...issues]
    .sort((a, b) => {
        const dateA = a.updated ? new Date(a.updated).getTime() : 0;
        const dateB = b.updated ? new Date(b.updated).getTime() : 0;
        return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <Icons.table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fetched from Jira</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Issues</CardTitle>
            <Icons.checkCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Marked as done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <Icons.alertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIssues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently active or pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Completion</CardTitle>
          <CardDescription>Percentage of fetched issues completed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={completionPercentage} aria-label={`${completionPercentage}% completed`} />
          <p className="text-lg font-semibold text-primary">{completionPercentage}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>A snapshot of the 5 most recently updated issues from the fetched data.</CardDescription>
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
                <TableHead>Story Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((issue: JiraIssue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium">{issue.id}</TableCell>
                  <TableCell>{issue.summary}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusVariant(issue.status?.name, issue.status?.statusCategory?.key)} 
                      className={getStatusBadgeClass(issue.status?.name, issue.status?.statusCategory?.key)}
                    >
                      {issue.status?.name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>{issue.type?.name || 'N/A'}</TableCell>
                  <TableCell>{issue.assignee?.displayName || 'Unassigned'}</TableCell>
                  <TableCell>{issue.storyPoints || issue.customfield_12326 || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
