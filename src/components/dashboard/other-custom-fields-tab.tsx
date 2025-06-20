
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

// Custom fields mentioned for Tab 11:
// customfield_10500 (Request Participants) - JiraUser[]
// customfield_16160 (Evaluation Committee) - JiraUser[]
// This tab will display these fields along with issue ID and summary.
// Filters will be simple text search for now.

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
      if (!searchTerm) return true;
      const participants = (issue.customfield_10500 as JiraUser[] | null)?.map(u => u.displayName?.toLowerCase()).join(' ') || '';
      const committee = (issue.customfield_16160 as JiraUser[] | null)?.map(u => u.displayName?.toLowerCase()).join(' ') || '';
      return (
        issue.id.toLowerCase().includes(lowerSearchTerm) ||
        issue.summary?.toLowerCase().includes(lowerSearchTerm) ||
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

  const formatUserArray = (users?: JiraUser[] | null) => {
    if (!users || users.length === 0) return 'N/A';
    return users.map(u => u.displayName || u.accountId || 'Unknown').join(', ');
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2"><Icons.table className="h-5 w-5 text-primary" /><CardTitle>Other Custom Fields View</CardTitle></div>
            <CardDescription>Displays raw data for selected custom fields in a tabular format.</CardDescription>
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
                  <TableHead>Issue ID</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Request Participants (CF 10500)</TableHead>
                  <TableHead>Evaluation Committee (CF 16160)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIssues.length > 0 ? paginatedIssues.map(issue => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.id}</TableCell>
                    <TableCell>{issue.summary}</TableCell>
                    <TableCell>{formatUserArray(issue.customfield_10500 as JiraUser[] | null)}</TableCell>
                    <TableCell>{formatUserArray(issue.customfield_16160 as JiraUser[] | null)}</TableCell>
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
        Note: This tab displays example custom fields 'customfield_10500' (Request Participants) and 'customfield_16160' (Evaluation Committee). Ensure these are relevant and fetched for your Jira instance. More sophisticated column-specific filters can be added.
      </CardDescription>
    </div>
  );
}
