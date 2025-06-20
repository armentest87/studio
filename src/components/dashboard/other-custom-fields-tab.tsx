
"use client";

import React, { useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue, JiraUser } from '@/types/jira';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Search } from 'lucide-react';

const LoadingSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
    <CardContent>
      <Skeleton className="h-10 w-full mb-4" />
      <Skeleton className="h-[200px] w-full" />
    </CardContent>
  </Card>
);

// Custom fields from spec:
const REQUEST_PARTICIPANTS_FIELD = 'customfield_10500';
const EVALUATION_COMMITTEE_FIELD = 'customfield_16160';

const MAX_DISPLAY_ROWS = 25;

export function OtherCustomFieldsTab() {
  const context = useContext(JiraDataContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  if (!context) return <div className="p-4 text-red-500">Error: JiraDataContext not found.</div>;
  const { issues, isLoading, error } = context;

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return issues.filter(issue => {
      // Only include issues that have at least one of the target custom fields populated
      const hasTargetCustomFields = issue[REQUEST_PARTICIPANTS_FIELD] || issue[EVALUATION_COMMITTEE_FIELD];
      if (!hasTargetCustomFields) return false;

      if (!searchTerm) return true;
      const participants = (issue[REQUEST_PARTICIPANTS_FIELD] as JiraUser[] | null)?.map(u => u.displayName?.toLowerCase()).join(' ') || '';
      const committee = (issue[EVALUATION_COMMITTEE_FIELD] as JiraUser[] | null)?.map(u => u.displayName?.toLowerCase()).join(' ') || '';
      return (
        issue.id.toLowerCase().includes(lowerSearchTerm) ||
        (issue.summary && issue.summary.toLowerCase().includes(lowerSearchTerm)) ||
        participants.includes(lowerSearchTerm) ||
        committee.includes(lowerSearchTerm)
      );
    });
  }, [issues, searchTerm]);

  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * MAX_DISPLAY_ROWS;
    return filteredIssues.slice(startIndex, startIndex + MAX_DISPLAY_ROWS);
  }, [filteredIssues, currentPage]);

  const totalPages = Math.ceil(filteredIssues.length / MAX_DISPLAY_ROWS);


  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive" className="m-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!issues || issues.length === 0) return <div className="p-4 text-center text-muted-foreground">No Jira issues fetched.</div>;
  if (filteredIssues.length === 0 && issues.length > 0) {
      if(searchTerm) return <div className="p-4 text-center text-muted-foreground">No issues match the current search for the specified custom fields.</div>;
      return <div className="p-4 text-center text-muted-foreground">No issues found with data for Request Participants (CF: {REQUEST_PARTICIPANTS_FIELD}) or Evaluation Committee (CF: {EVALUATION_COMMITTEE_FIELD}).</div>;
  }
  if (filteredIssues.length === 0 && !searchTerm) return <div className="p-4 text-center text-muted-foreground">No issues found with data for Request Participants (CF: {REQUEST_PARTICIPANTS_FIELD}) or Evaluation Committee (CF: {EVALUATION_COMMITTEE_FIELD}).</div>;


  const formatUserArray = (users?: JiraUser[] | null) => {
    if (!users || users.length === 0) return 'N/A';
    return users.map(u => u.displayName || u.accountId || 'Unknown User').join(', ');
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2"><Icons.table className="h-5 w-5 text-primary" /><CardTitle>Other Custom Fields View</CardTitle></div>
            <CardDescription>Displays issues with data for Request Participants (CF: {REQUEST_PARTICIPANTS_FIELD}) or Evaluation Committee (CF: {EVALUATION_COMMITTEE_FIELD}).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, Summary, Participants, Committee..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Issue ID</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Request Participants (CF: {REQUEST_PARTICIPANTS_FIELD})</TableHead>
                  <TableHead>Evaluation Committee (CF: {EVALUATION_COMMITTEE_FIELD})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIssues.length > 0 ? paginatedIssues.map(issue => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.id}</TableCell>
                    <TableCell>{issue.summary}</TableCell>
                    <TableCell>{formatUserArray(issue[REQUEST_PARTICIPANTS_FIELD] as JiraUser[] | null)}</TableCell>
                    <TableCell>{formatUserArray(issue[EVALUATION_COMMITTEE_FIELD] as JiraUser[] | null)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No results found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <CardDescription className="text-xs text-muted-foreground p-2">
        Note: This tab specifically looks for data in custom fields '{REQUEST_PARTICIPANTS_FIELD}' and '{EVALUATION_COMMITTEE_FIELD}'. Ensure these IDs are correct for your Jira instance.
      </CardDescription>
    </div>
  );
}
