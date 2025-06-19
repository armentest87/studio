
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  SidebarHeader,
  SidebarContent as UISidebarContent,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { fetchJiraIssues, type JiraConfig, type JiraFilters } from '@/actions/jira-actions';

export function JiraSidebarContent() {
  const { toast } = useToast();
  const [jiraUrl, setJiraUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [queryType, setQueryType] = useState<'jql' | 'project'>('jql');
  const [jqlQuery, setJqlQuery] = useState('');
  const [project, setProject] = useState('');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [issueType, setIssueType] = useState<string>('all');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchIssues = async () => {
    setIsFetching(true);
    const config: JiraConfig = { jiraUrl, email, apiToken };
    const filtersBase: Partial<JiraFilters> = { queryType };

    if (queryType === 'jql') {
      filtersBase.jqlQuery = jqlQuery;
    } else {
      filtersBase.project = project;
      filtersBase.dateRange = dateRange;
    }
    
    if (issueType && issueType !== 'all') {
      filtersBase.issueType = issueType;
    }

    const params = { ...config, ...filtersBase } as JiraConfig & JiraFilters;

    console.log('Fetching issues with params:', params);
    
    try {
      const result = await fetchJiraIssues(params);
      console.log('Server Action result:', result);

      if (result.success) {
        toast({ title: 'Success', description: result.message || 'Fetched issues successfully.' });
        // TODO: Update application state with result.data
        console.log("Fetched data:", result.data);
      } else {
        toast({ title: 'Error Fetching Issues', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Failed to call fetchJiraIssues action:', error);
      toast({ title: 'Client Error', description: error.message || 'Could not connect to the server.', variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold font-headline">JiraViz</h1>
        </div>
      </SidebarHeader>

      <UISidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4">Jira Configuration</SidebarGroupLabel>
          <div className="space-y-3 px-4">
            <div>
              <Label htmlFor="jira-url">Jira URL</Label>
              <Input id="jira-url" placeholder="https://your-domain.atlassian.net" value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="api-token">API Token</Label>
              <Input id="api-token" type="password" placeholder="Your Jira API Token" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
            </div>
          </div>
        </SidebarGroup>
        
        <SidebarSeparator className="my-4"/>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4">Filters</SidebarGroupLabel>
          <div className="space-y-4 px-4">
            <RadioGroup value={queryType} onValueChange={(value: 'jql' | 'project') => setQueryType(value)} className="flex space-x-2">
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="jql" id="jql" />
                <Label htmlFor="jql">JQL</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="project" id="project-date" />
                <Label htmlFor="project-date">Project/Date</Label>
              </div>
            </RadioGroup>

            {queryType === 'jql' && (
              <div>
                <Label htmlFor="jql-query">JQL Query</Label>
                <Textarea id="jql-query" placeholder="project = 'MyProject' AND status = 'Done'" value={jqlQuery} onChange={(e) => setJqlQuery(e.target.value)} />
              </div>
            )}

            {queryType === 'project' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="project-select">Project</Label>
                   <Select value={project} onValueChange={setProject}>
                    <SelectTrigger id="project-select">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROJA">Project Alpha</SelectItem>
                      <SelectItem value="PROJB">Project Beta</SelectItem>
                      <SelectItem value="PROJC">Project Charlie</SelectItem>
                      {/* Add more projects or fetch dynamically */}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-range">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <Icons.date className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="issue-type-filter">Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger id="issue-type-filter">
                  <SelectValue placeholder="Filter by issue type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issue Types</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Story">Story</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                  {/* Add more issue types or fetch dynamically */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SidebarGroup>
      </UISidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button onClick={handleFetchIssues} className="w-full" disabled={isFetching}>
          {isFetching ? 'Fetching...' : 'Fetch Issues'}
        </Button>
      </SidebarFooter>
    </>
  );
}
