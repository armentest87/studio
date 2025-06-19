
'use server';

import type { JiraConfig, JiraFilters, FetchJiraIssuesResponse, JiraIssue, JiraSprint } from '@/types/jira';

// Helper to parse sprint data which might come as an array of strings
// Each string is a JSON representation of sprint details.
// Example string: "com.atlassian.greenhopper.service.sprint.Sprint@123abc[id=1,rapidViewId=10,state=ACTIVE,name=Sprint 1,startDate=...,endDate=...]"
function parseSprintString(sprintString: string): Partial<JiraSprint> | null {
  try {
    const match = sprintString.match(/id=(\d+).*name=([^,]+).*state=([^,]+).*startDate=([^,]+).*endDate=([^,]+)/);
    if (match) {
      return {
        id: parseInt(match[1], 10),
        name: match[2],
        state: match[3].toLowerCase() as JiraSprint['state'],
        startDate: match[4] !== '<null>' ? new Date(match[4]).toISOString() : null,
        endDate: match[5] !== '<null>' ? new Date(match[5]).toISOString() : null,
      };
    }
  } catch (e) {
    console.warn('Could not parse sprint string:', sprintString, e);
  }
  return null;
}


export async function fetchJiraIssues(params: JiraConfig & JiraFilters): Promise<FetchJiraIssuesResponse> {
  console.log('Server Action: fetchJiraIssues called with:', params);

  const { jiraUrl, email, apiToken, queryType, jqlQuery, project, dateRange, issueType } = params;

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

  if (issueType && issueType.toLowerCase() !== 'all') {
    if (constructedJql) {
      constructedJql += ` AND issuetype = "${issueType}"`;
    } else {
      constructedJql = `issuetype = "${issueType}"`;
    }
  }
  
  console.log('Constructed JQL for API:', constructedJql);

  // const jiraApiEndpoint = `${jiraUrl.replace(/\/$/, '')}/rest/api/3/search`;
  // const authString = `${email}:${apiToken}`;
  // const authHeader = `Basic ${typeof Buffer !== 'undefined' ? Buffer.from(authString).toString('base64') : btoa(authString)}`;
  // const fieldsToRequest = [
  //   "summary", "description", "status", "issuetype", "project", "assignee", "reporter",
  //   "priority", "labels", "components", "created", "updated", "resolutiondate",
  //   "timeoriginalestimate", "timespent", "timeestimate",
  //   "aggregatetimeoriginalestimate", "aggregatetimespent", "aggregatetimeestimate",
  //   "worklog", "parent", 
  //   "customfield_10007", // Sprint field ID (example)
  //   "customfield_12326", // Story Points field ID (example)
  //   // "*navigable" // Gets all fields user can see, useful for discovery but can be verbose
  // ];

  try {
    // // Actual API Call (replace with a library or keep as fetch)
    // const response = await fetch(jiraApiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': authHeader,
    //     'Content-Type': 'application/json',
    //     'Accept': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     jql: constructedJql,
    //     fields: fieldsToRequest,
    //     startAt: 0,
    //     maxResults: 100, // Implement pagination for real use
    //   }),
    // });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   console.error('Jira API Error:', response.status, errorText);
    //   return { success: false, error: `Jira API request failed: ${response.statusText}. ${errorText}`, data: null };
    // }

    // const responseData = await response.json();
    // const issues: JiraIssue[] = responseData.issues.map((issue: any) => {
    //   let sprintData: JiraSprint | null = null;
    //   const rawSprintField = issue.fields.customfield_10007; 
    //   if (rawSprintField && Array.isArray(rawSprintField) && rawSprintField.length > 0) {
    //       const parsedSprints = rawSprintField.map(s => typeof s === 'string' ? parseSprintString(s) : s).filter(Boolean) as JiraSprint[];
    //       sprintData = parsedSprints.find(s => s.state === 'active') || parsedSprints.find(s => s.state === 'future') || parsedSprints[parsedSprints.length -1] || null;
    //   }
    //   return {
    //     id: issue.key,
    //     self: issue.self,
    //     summary: issue.fields.summary,
    //     status: issue.fields.status,
    //     type: issue.fields.issuetype,
    //     project: issue.fields.project,
    //     assignee: issue.fields.assignee,
    //     reporter: issue.fields.reporter,
    //     priority: issue.fields.priority,
    //     labels: issue.fields.labels || [],
    //     created: issue.fields.created,
    //     updated: issue.fields.updated,
    //     resolutiondate: issue.fields.resolutiondate,
    //     storyPoints: issue.fields.customfield_12326 || null,
    //     customfield_12326: issue.fields.customfield_12326,
    //     sprint: sprintData,
    //     customfield_10007: rawSprintField,
    //   };
    // });
    // return { success: true, data: issues, message: `Successfully fetched ${issues.length} issues from Jira.` };
    
    // Enhanced Mock response for now:
    const now = new Date();
    const mockData: JiraIssue[] = [
      { 
        id: 'MOCK-101', 
        summary: `Mock issue for ${project || 'Any Project'}. Type: ${issueType || 'Any'}. Data from context.`, 
        status: { id: '1', name: 'To Do', statusCategory: { id: 2, key: 'new', name: 'To Do' } }, 
        type: { id: '10001', name: issueType && issueType.toLowerCase() !== 'all' ? issueType : 'Story', iconUrl: '...' }, 
        project: { id: '10000', key: project || 'MOCKPRJ', name: project ? `Project ${project}` : 'Mock Project' },
        assignee: { displayName: 'Alice Wonderland', emailAddress: 'alice@example.com' },
        reporter: { displayName: 'Client User', emailAddress: 'client@example.com' },
        priority: {id: '3', name: 'Medium'},
        labels: ['mock', 'frontend', 'context-test'],
        created: new Date(new Date(now).setDate(now.getDate() - 15)).toISOString(),
        updated: new Date(new Date(now).setDate(now.getDate() - 1)).toISOString(),
        resolutiondate: null,
        timeoriginalestimate: 28800, // 8 hours
        timespent: 14400, // 4 hours
        timeestimate: 14400, // 4 hours remaining
        storyPoints: 5,
        customfield_12326: 5,
        sprint: {id: 1, name: 'Current Mock Sprint', state: 'active', startDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() + 7)).toISOString() },
        customfield_10007: [{id: 1, name: 'Current Mock Sprint', state: 'active', startDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() + 7)).toISOString() }]
      },
      { 
        id: 'MOCK-102', 
        summary: 'Another mock task, this one in progress', 
        status: { id: '3', name: 'In Progress', statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' }}, 
        type: { id: '10002', name: 'Bug', iconUrl: '...' },
        project: { id: '10000', key: project || 'MOCKPRJ', name: project ? `Project ${project}` : 'Mock Project' },
        assignee: { displayName: 'Bob The Builder', emailAddress: 'bob@example.com' },
        created: new Date(new Date(now).setDate(now.getDate() - 10)).toISOString(),
        updated: new Date(new Date(now).setDate(now.getDate() - 2)).toISOString(),
        resolutiondate: null,
        storyPoints: 3,
        customfield_12326: 3,
        sprint: {id: 1, name: 'Current Mock Sprint', state: 'active', startDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() + 7)).toISOString() },
      },
      { 
        id: 'MOCK-103', 
        summary: 'A completed mock feature for reporting', 
        status: { id: '10000', name: 'Done', statusCategory: {id: 3, key: 'done', name: 'Done'}}, 
        type: { id: '10001', name: 'Story', iconUrl: '...' },
        project: { id: '10001', key: 'OTHER', name: 'Other Mock Project' },
        assignee: { displayName: 'Charlie Brown', emailAddress: 'charlie@example.com' },
        created: new Date(new Date(now).setDate(now.getDate() - 20)).toISOString(),
        updated: new Date(new Date(now).setDate(now.getDate() - 5)).toISOString(),
        resolutiondate: new Date(new Date(now).setDate(now.getDate() - 5)).toISOString(),
        timeoriginalestimate: 72000, // 20 hours
        timespent: 72000,
        timeestimate: 0,
        storyPoints: 8,
        customfield_12326: 8,
        sprint: {id: 0, name: 'Previous Mock Sprint', state: 'closed', startDate: new Date(new Date(now).setDate(now.getDate() - 21)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), completeDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString() },
        closedSprints: [
            {id: 0, name: 'Previous Mock Sprint', state: 'closed', startDate: new Date(new Date(now).setDate(now.getDate() - 21)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), completeDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString() }
        ]
      },
       { 
        id: 'MOCK-104', 
        summary: 'Unassigned task that needs attention', 
        status: { id: '1', name: 'To Do', statusCategory: { id: 2, key: 'new', name: 'To Do' } }, 
        type: { id: '10003', name: 'Task', iconUrl: '...' }, 
        project: { id: '10000', key: project || 'MOCKPRJ', name: project ? `Project ${project}` : 'Mock Project' },
        assignee: null, // Unassigned
        reporter: { displayName: 'System Admin', emailAddress: 'sysadmin@example.com' },
        created: new Date(new Date(now).setDate(now.getDate() - 5)).toISOString(),
        updated: new Date(new Date(now).setDate(now.getDate() - 3)).toISOString(),
        storyPoints: 2,
        customfield_12326: 2,
      },
      { 
        id: 'MOCK-105', 
        summary: 'High priority bug for dashboard testing', 
        status: { id: '3', name: 'In Progress', statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' }}, 
        type: { id: '10002', name: 'Bug', iconUrl: '...' },
        project: { id: '10002', key: 'REPORTING', name: 'Reporting Engine' },
        assignee: { displayName: 'Alice Wonderland', emailAddress: 'alice@example.com' },
        priority: {id: '1', name: 'Highest'},
        created: new Date(new Date(now).setDate(now.getDate() - 2)).toISOString(),
        updated: new Date(new Date(now).setDate(now.getDate() - 0)).toISOString(),
        storyPoints: 5,
        customfield_12326: 5,
        sprint: {id: 1, name: 'Current Mock Sprint', state: 'active', startDate: new Date(new Date(now).setDate(now.getDate() - 7)).toISOString(), endDate: new Date(new Date(now).setDate(now.getDate() + 7)).toISOString() },
      },
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: `Data received by server. ${mockData.length} mock issues returned based on: ${constructedJql || 'default filters'}. Actual Jira fetch is mocked.`,
      data: mockData,
    };

  } catch (error: any) {
    console.error('Error in fetchJiraIssues server action:', error);
    let errorMessage = 'An unknown error occurred on the server.';
    if (error.message) {
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Network error: Could not connect to Jira. Please check the Jira URL and your network connection.';
        } else {
            errorMessage = 'An internal server error occurred while fetching Jira issues.';
        }
    }
    return { success: false, error: errorMessage, data: null };
  }
}
