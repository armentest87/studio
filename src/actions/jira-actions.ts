
'use server';

import type { JiraConfig, JiraFilters, FetchJiraIssuesResponse, JiraIssue } from '@/types/jira';

export async function fetchJiraIssues(params: JiraConfig & JiraFilters): Promise<FetchJiraIssuesResponse> {
  console.log('Server Action: fetchJiraIssues called with:', params);

  const { jiraUrl, email, apiToken, queryType, jqlQuery, project, dateRange, issueType } = params;

  // Placeholder for actual Jira API call logic
  // You would typically use a library like 'node-fetch' or the built-in fetch
  // to make requests to the Jira REST API using the provided credentials and filters.

  // Example JQL construction (simplified):
  let constructedJql = "";
  if (queryType === 'jql' && jqlQuery) {
    constructedJql = jqlQuery;
  } else if (queryType === 'project' && project) {
    constructedJql = `project = "${project}"`;
    if (dateRange?.from) {
      constructedJql += ` AND created >= "${dateRange.from.toISOString().split('T')[0]}"`;
    }
    if (dateRange?.to) {
      constructedJql += ` AND created <= "${dateRange.to.toISOString().split('T')[0]}"`;
    }
  }

  if (issueType && issueType !== 'all') {
    if (constructedJql) {
      constructedJql += ` AND issuetype = "${issueType}"`;
    } else {
      constructedJql = `issuetype = "${issueType}"`;
    }
  }
  
  console.log('Constructed JQL for API (example):', constructedJql);

  // const jiraApiEndpoint = `${jiraUrl}/rest/api/2/search`;
  // const authHeader = `Basic ${btoa(\`\${email}:\${apiToken}\`)}`; // btoa is browser-specific, use Buffer.from(str).toString('base64') on server

  try {
    // const response = await fetch(jiraApiEndpoint, {
    //   method: 'POST', // Or GET, depending on JIRA API. Often POST for JQL.
    //   headers: {
    //     'Authorization': authHeader,
    //     'Content-Type': 'application/json',
    //     'Accept': 'application/json',
    //   },
    //   body: JSON.stringify({ jql: constructedJql, startAt: 0, maxResults: 100, fields: ["summary", "status", "assignee", "issuetype"] }),
    // });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   console.error('Jira API Error:', response.status, errorText);
    //   return { success: false, error: `Jira API request failed: ${response.statusText}. ${errorText}`, data: null };
    // }

    // const responseData = await response.json();
    // const issues: JiraIssue[] = responseData.issues.map((issue: any) => ({
    //   id: issue.key,
    //   summary: issue.fields.summary,
    //   status: issue.fields.status.name,
    //   type: issue.fields.issuetype.name,
    //   assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
    // }));
    // return { success: true, data: issues, message: 'Successfully fetched issues from Jira.' };
    
    // Mock response for now:
    const mockData: JiraIssue[] = [
      { id: 'MOCK-101', summary: `Mock issue for ${project || 'Any Project'} from server`, status: 'To Do', type: issueType || 'Story', assignee: 'Server Admin' },
      { id: 'MOCK-102', summary: 'Another mock task based on JQL or filters', status: 'In Progress', type: 'Bug', assignee: 'Dev Team' },
    ];
    return {
      success: true,
      message: 'Data received by server. Actual Jira fetch is mocked.',
      data: mockData,
    };

  } catch (error: any) {
    console.error('Error in fetchJiraIssues server action:', error);
    return { success: false, error: error.message || 'An unknown error occurred on the server.', data: null };
  }
}
