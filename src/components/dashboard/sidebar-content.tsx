
"use client";

import React, { useState, useContext } from 'react';
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
import { fetchJiraIssues } from '@/actions/jira-actions';
import type { JiraConfig, JiraFilters } from '@/types/jira';
import { JiraDataContext } from '@/context/JiraDataContext'; // Import the context

export function JiraSidebarContent() {
  const { toast } = useToast();
  const jiraDataContext = useContext(JiraDataContext);

  if (!jiraDataContext) {
    // This should ideally not happen if SidebarProvider wraps this component correctly
    throw new Error("JiraSidebarContent must be used within a JiraDataProvider");
  }
  const { setIssues, setIsLoading: setContextIsLoading, setError: setContextError } = jiraDataContext;


  const [jiraUrl, setJiraUrl] = useState(process.env.NEXT_PUBLIC_JIRA_URL || '');
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_JIRA_EMAIL || '');
  const [apiToken, setApiToken] = useState(process.env.NEXT_PUBLIC_JIRA_API_TOKEN || '');
  
  const [queryType, setQueryType] = useState<'jql' | 'project'>('project');
  const [jqlQuery, setJqlQuery] = useState('');
  const [project, setProject] = useState(''); // Stores project key
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [issueType, setIssueType] = useState<string>('all'); // 'all' or specific type like 'Bug'
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchIssues = async () => {
    if (!jiraUrl || !email || !apiToken) {
      toast({
        title: 'Configuration Missing',
        description: 'Please provide Jira URL, Email, and API Token.',
        variant: 'destructive',
      });
      return;
    }
    if (queryType === 'project' && !project) {
        toast({
            title: 'Project Missing',
            description: 'Please select a project when using Project/Date filter.',
            variant: 'destructive',
        });
        return;
    }
    if (queryType === 'jql' && !jqlQuery) {
        toast({
            title: 'JQL Query Missing',
            description: 'Please enter a JQL query.',
            variant: 'destructive',
        });
        return;
    }


    setIsFetching(true);
    setContextIsLoading(true);
    setContextError(null);
    setIssues([]); // Clear previous issues

    const config: JiraConfig = { jiraUrl, email, apiToken };
    
    let filters: JiraFilters = { queryType, issueType: issueType === 'all' ? undefined : issueType };

    if (queryType === 'jql') {
      filters.jqlQuery = jqlQuery;
    } else { // queryType === 'project'
      filters.project = project;
      filters.dateRange = dateRange.from || dateRange.to ? dateRange : undefined;
    }
    
    const params = { ...config, ...filters };

    console.log('Fetching issues with params:', params);
    
    try {
      const result = await fetchJiraIssues(params);
      console.log('Server Action result:', result);

      if (result.success && result.data) {
        toast({ title: 'Success', description: result.message || `Fetched ${result.data.length} issues successfully.` });
        setIssues(result.data);
      } else {
        toast({ title: 'Error Fetching Issues', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
        setContextError(result.error || 'An unknown error occurred.');
        setIssues([]);
      }
    } catch (error: any) {
      console.error('Failed to call fetchJiraIssues action:', error);
      const errorMessage = error.message || 'Could not connect to the server.';
      toast({ title: 'Client Error', description: errorMessage, variant: 'destructive' });
      setContextError(errorMessage);
      setIssues([]);
    } finally {
      setIsFetching(false);
      setContextIsLoading(false);
    }
  };

  // Mock project list - replace with dynamic fetching if needed
  const mockProjects = [
    { key: "PROJA", name: "Project Alpha" },
    { key: "PROJB", name: "Project Beta" },
    { key: "PROJC", name: "Project Charlie" },
    { key: "MOCKPRJ", name: "Mock Project" },
    { key: "OTHER", name: "Other Project" },
  ];

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
                      {mockProjects.map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.name} ({p.key})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-range">Date Range (Created)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && !dateRange.to && "text-muted-foreground"
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
                        ) : dateRange.to ? (
                            `Until ${format(dateRange.to, "LLL dd, y")}`
                        )
                        : (
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
                  <SelectValue placeholder="Filter by issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issue Types</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Story">Story</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                  <SelectItem value="Sub-task">Sub-task</SelectItem>
                  {/* Add more issue types or fetch dynamically */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SidebarGroup>
      </UISidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button onClick={handleFetchIssues} className="w-full" disabled={isFetching || jiraDataContext.isLoading}>
          {isFetching || jiraDataContext.isLoading ? (
            <>
              <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            'Fetch Issues'
          )}
        </Button>
      </SidebarFooter>
    </>
  );
}
