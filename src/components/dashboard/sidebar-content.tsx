
"use client";

import React, { useState, useContext, useEffect } from 'react';
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
} from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { fetchJiraIssues, fetchJiraProjects } from '@/actions/jira-actions';
import type { JiraConfig, JiraFilters, JiraProjectDetail } from '@/types/jira';
import { JiraDataContext } from '@/context/JiraDataContext'; 

export function JiraSidebarContent() {
  const { toast } = useToast();
  const jiraDataContext = useContext(JiraDataContext);

  if (!jiraDataContext) {
    throw new Error("JiraSidebarContent must be used within a JiraDataProvider");
  }
  const { setIssues, setIsLoading: setContextIsLoading, setError: setContextError, issues: contextIssues } = jiraDataContext;


  const [jiraUrl, setJiraUrl] = useState(process.env.NEXT_PUBLIC_JIRA_URL || '');
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_JIRA_EMAIL || '');
  const [apiToken, setApiToken] = useState(process.env.NEXT_PUBLIC_JIRA_API_TOKEN || '');
  
  const [queryType, setQueryType] = useState<'jql' | 'project'>('project');
  const [jqlQuery, setJqlQuery] = useState('');
  const [projectKey, setProjectKey] = useState(''); 
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [issueType, setIssueType] = useState<string>('all'); 
  const [isFetching, setIsFetching] = useState(false);

  const [jiraProjects, setJiraProjects] = useState<JiraProjectDetail[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (jiraUrl && email && apiToken) {
      const loadProjects = async () => {
        setProjectsLoading(true);
        const result = await fetchJiraProjects({ jiraUrl, email, apiToken });
        if (result.success && result.data) {
          setJiraProjects(result.data);
          if (result.data.length > 0 && !projectKey) {
            // Optionally pre-select the first project
            // setProjectKey(result.data[0].key); 
          }
        } else {
          toast({ title: 'Failed to fetch projects', description: result.error || "Could not load project list. You can still type a project key.", variant: 'destructive' });
          setJiraProjects([]); 
        }
        setProjectsLoading(false);
      };
      loadProjects();
    } else {
      setJiraProjects([]); 
    }
  }, [jiraUrl, email, apiToken, toast]);


  const handleFetchIssues = async () => {
    if (!jiraUrl || !email || !apiToken) {
      toast({
        title: 'Configuration Missing',
        description: 'Please provide Jira URL, Email, and API Token.',
        variant: 'destructive',
      });
      return;
    }
    if (queryType === 'project' && !projectKey) {
        toast({
            title: 'Project Missing',
            description: 'Please select or enter a project key when using Project/Date filter.',
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
    setIssues([]); 

    const config: JiraConfig = { jiraUrl, email, apiToken };
    
    let filters: JiraFilters = { queryType, issueType: issueType === 'all' ? undefined : issueType };

    if (queryType === 'jql') {
      filters.jqlQuery = jqlQuery;
    } else { 
      filters.project = projectKey;
      filters.dateRange = dateRange.from || dateRange.to ? dateRange : undefined;
    }
    
    const params = { ...config, ...filters };
    
    try {
      const result = await fetchJiraIssues(params);
      if (result.success && result.data) {
        toast({ title: 'Success', description: result.message || `Fetched ${result.data.length} issues successfully.` });
        setIssues(result.data);
      } else {
        toast({ title: 'Error Fetching Issues', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
        setContextError(result.error || 'An unknown error occurred.');
        setIssues([]);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Could not connect to the server.';
      toast({ title: 'Client Error', description: errorMessage, variant: 'destructive' });
      setContextError(errorMessage);
      setIssues([]);
    } finally {
      setIsFetching(false);
      setContextIsLoading(false);
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

      <UISidebarContent className="p-4 space-y-6">
        {/* Jira Configuration Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Jira Configuration</h3>
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
        
        {/* Filters Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Filters</h3>
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
                <Label htmlFor="project-select">Project Key</Label>
                  <Select value={projectKey} onValueChange={setProjectKey} disabled={projectsLoading}>
                  <SelectTrigger id="project-select">
                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project or type key"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsLoading && <div className="p-2 text-sm text-muted-foreground text-center">Loading projects...</div>}
                    {!projectsLoading && jiraProjects.length > 0 && (
                      jiraProjects.map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.name} ({p.key})</SelectItem>
                      ))
                    )}
                    {!projectsLoading && jiraProjects.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">No projects found via API. Type key below.</div>
                    )}
                  </SelectContent>
                </Select>
                  <Input 
                    className="mt-1"
                    placeholder="Or type project key e.g., PROJ" 
                    value={projectKey} 
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase())} 
                  />
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
                {/* Add other common issue types if needed */}
              </SelectContent>
            </Select>
          </div>
        </div>
      </UISidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button onClick={handleFetchIssues} className="w-full" disabled={isFetching || jiraDataContext.isLoading || projectsLoading}>
          {isFetching || jiraDataContext.isLoading ? (
            <>
              <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              Fetching Issues...
            </>
          ) : projectsLoading ? (
             <>
              <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              Loading Projects...
            </>
          )
          : (
            'Fetch Issues'
          )}
        </Button>
      </SidebarFooter>
    </>
  );
}
