
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
      // Jira JQL expects 'YYYY-MM-DD' for date comparisons or 'YYYY-MM-DD HH:mm' for datetime.
      // Using toISOString and splitting is generally okay for date-only if your Jira field is date-only.
      // For created/updated, Jira typically uses datetime.
      constructedJql += ` AND created >= "${dateRange.from.toISOString().split('T')[0]}"`;
    }
    if (dateRange?.to) {
      constructedJql += ` AND created <= "${dateRange.to.toISOString().split('T')[0]}"`;
    }
  }

  // Add issue type filter if specified and not 'all'
  if (issueType && issueType.toLowerCase() !== 'all') {
    if (constructedJql) {
      constructedJql += ` AND issuetype = "${issueType}"`;
    } else {
      // This case might occur if queryType is 'project' but no project is selected,
      // though UI should prevent this. Or if it's the only filter.
      constructedJql = `issuetype = "${issueType}"`;
    }
  }
  
  console.log('Constructed JQL for API:', constructedJql);

  // const jiraApiEndpoint = `${jiraUrl.replace(/\/$/, '')}/rest/api/3/search`; // Use API v3
  // const authString = `${email}:${apiToken}`;
  // const authHeader = `Basic ${typeof Buffer !== 'undefined' ? Buffer.from(authString).toString('base64') : btoa(authString)}`;

  // // Common fields to request. Adjust based on your Jira instance and needs.
  // const fieldsToRequest = [
  //   "summary", "description", "status", "issuetype", "project", "assignee", "reporter",
  //   "priority", "labels", "components", "created", "updated", "resolutiondate",
  //   "timeoriginalestimate", "timespent", "timeestimate",
  //   "aggregatetimeoriginalestimate", "aggregatetimespent", "aggregatetimeestimate",
  //   "worklog", "parent", 
  //   "customfield_10007", // Example for Sprint field (might vary)
  //   "customfield_12326", // Example for Story Points field (might vary)
  //   // Add other custom field IDs you need, e.g., "customfield_XXXXX"
  //   "*navigable" // Gets all fields user can see, useful for discovery but can be verbose
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
    //     // expand: ['changelog'] // If changelog is needed and not too large
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
    //   let closedSprintsData: JiraSprint[] = [];

    //   // Attempt to parse sprint information (often in customfield_10007)
    //   // Jira sprint fields can be complex (e.g., an array of strings, each a stringified object)
    //   const rawSprintField = issue.fields.customfield_10007; // Adjust field ID as needed
    //   if (rawSprintField && Array.isArray(rawSprintField) && rawSprintField.length > 0) {
    //       const parsedSprints = rawSprintField.map(s => typeof s === 'string' ? parseSprintString(s) : s).filter(Boolean) as JiraSprint[];
    //       const activeSprint = parsedSprints.find(s => s.state === 'active');
    //       const futureSprint = parsedSprints.find(s => s.state === 'future');
    //       sprintData = activeSprint || futureSprint || parsedSprints[parsedSprints.length -1] || null; // Prioritize active, then future, then most recent
    //       closedSprintsData = parsedSprints.filter(s => s.state === 'closed');
    //   }


    //   return {
    //     id: issue.key,
    //     self: issue.self,
    //     summary: issue.fields.summary,
    //     description: issue.fields.description, // Often ADF format, handle accordingly
    //     status: issue.fields.status,
    //     type: issue.fields.issuetype,
    //     project: issue.fields.project,
    //     assignee: issue.fields.assignee,
    //     reporter: issue.fields.reporter,
    //     priority: issue.fields.priority,
    //     labels: issue.fields.labels || [],
    //     components: issue.fields.components || [],
    //     created: issue.fields.created,
    //     updated: issue.fields.updated,
    //     resolutiondate: issue.fields.resolutiondate,
    //     timeoriginalestimate: issue.fields.timeoriginalestimate,
    //     timespent: issue.fields.timespent,
    //     timeestimate: issue.fields.timeestimate,
    //     aggregatetimeoriginalestimate: issue.fields.aggregatetimeoriginalestimate,
    //     aggregatetimespent: issue.fields.aggregatetimespent,
    //     aggregatetimeestimate: issue.fields.aggregatetimeestimate,
    //     worklog: issue.fields.worklog,
    //     parent: issue.fields.parent,
    //     sprint: sprintData,
    //     closedSprints: closedSprintsData,
    //     storyPoints: issue.fields.customfield_12326 || null, // Adjust field ID
    //     customfield_10007: rawSprintField, // Store raw sprint data too
    //     customfield_12326: issue.fields.customfield_12326,
    //     // map other fields as needed
    //   };
    // });
    // return { success: true, data: issues, message: `Successfully fetched ${issues.length} issues from Jira.` };
    
    // Mock response for now:
    const now = new Date();
    const mockData: JiraIssue[] = [
      { 
        id: 'MOCK-101', 
        summary: `Mock issue for ${project || 'Any Project'} from server. Type: ${issueType || 'Any'}`, 
        status: { id: '1', name: 'To Do', statusCategory: { id: 2, key: 'new', name: 'To Do' } }, 
        type: { id: '10001', name: issueType && issueType.toLowerCase() !== 'all' ? issueType : 'Story', iconUrl: '...' }, 
        project: { id: '10000', key: project || 'MOCKPRJ', name: project ? `Project ${project}` : 'Mock Project' },
        assignee: { displayName: 'Server Admin', emailAddress: 'admin@example.com' },
        reporter: { displayName: 'Client User', emailAddress: 'client@example.com' },
        priority: {id: '3', name: 'Medium'},
        labels: ['mock', 'backend'],
        created: new Date(now.setDate(now.getDate() - 5)).toISOString(),
        updated: new Date(now.setDate(now.getDate() - 1)).toISOString(),
        timeoriginalestimate: 28800, // 8 hours in seconds
        timespent: 14400, // 4 hours in seconds
        timeestimate: 14400, // 4 hours remaining
        storyPoints: 5,
        customfield_12326: 5,
        sprint: {id: 1, name: 'Current Sprint Mock', state: 'active', startDate: new Date(now.setDate(now.getDate() - 7)).toISOString(), endDate: new Date(now.setDate(now.getDate() + 7)).toISOString() },
        customfield_10007: [{id: 1, name: 'Current Sprint Mock', state: 'active', startDate: new Date(now.setDate(now.getDate() - 7)).toISOString(), endDate: new Date(now.setDate(now.getDate() + 7)).toISOString() }]
      },
      { 
        id: 'MOCK-102', 
        summary: 'Another mock task based on JQL or filters', 
        status: { id: '3', name: 'In Progress', statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' }}, 
        type: { id: '10002', name: 'Bug', iconUrl: '...' },
        project: { id: '10000', key: project || 'MOCKPRJ', name: project ? `Project ${project}` : 'Mock Project' },
        assignee: { displayName: 'Dev Team', emailAddress: 'dev@example.com' },
        created: new Date(now.setDate(now.getDate() - 10)).toISOString(),
        updated: new Date(now.setDate(now.getDate() - 2)).toISOString(),
        resolutiondate: null,
        storyPoints: 3,
        customfield_12326: 3,
        sprint: {id: 1, name: 'Current Sprint Mock', state: 'active', startDate: new Date(now.setDate(now.getDate() - 7)).toISOString(), endDate: new Date(now.setDate(now.getDate() + 7)).toISOString() },
      },
      { 
        id: 'MOCK-103', 
        summary: 'A completed mock feature', 
        status: { id: '10000', name: 'Done', statusCategory: {id: 3, key: 'done', name: 'Done'}}, 
        type: { id: '10001', name: 'Story', iconUrl: '...' },
        project: { id: '10001', key: 'OTHER', name: 'Other Project' },
        assignee: { displayName: 'Server Admin', emailAddress: 'admin@example.com' },
        created: new Date(now.setDate(now.getDate() - 20)).toISOString(),
        updated: new Date(now.setDate(now.getDate() - 5)).toISOString(),
        resolutiondate: new Date(now.setDate(now.getDate() - 5)).toISOString(),
        timeoriginalestimate: 72000, // 20 hours
        timespent: 72000,
        timeestimate: 0,
        storyPoints: 8,
        customfield_12326: 8,
        sprint: {id: 0, name: 'Previous Sprint Mock', state: 'closed', startDate: new Date(now.setDate(now.getDate() - 14)).toISOString(), endDate: new Date(now.setDate(now.getDate() - 0)).toISOString(), completeDate: new Date(now.setDate(now.getDate() - 0)).toISOString() },
        closedSprints: [
            {id: 0, name: 'Previous Sprint Mock', state: 'closed', startDate: new Date(now.setDate(now.getDate() - 14)).toISOString(), endDate: new Date(now.setDate(now.getDate() - 0)).toISOString(), completeDate: new Date(now.setDate(now.getDate() - 0)).toISOString() }
        ]
      },
    ];
    return {
      success: true,
      message: `Data received by server. ${mockData.length} mock issues returned based on: ${constructedJql || 'default filters'}. Actual Jira fetch is mocked.`,
      data: mockData,
    };

  } catch (error: any) {
    console.error('Error in fetchJiraIssues server action:', error);
    // Ensure you don't leak sensitive error details to the client
    let errorMessage = 'An unknown error occurred on the server.';
    if (error.message) {
        // Basic check for network errors vs other errors
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Network error: Could not connect to Jira. Please check the Jira URL and your network connection.';
        } else {
            errorMessage = 'An internal server error occurred while fetching Jira issues.';
        }
    }
    return { success: false, error: errorMessage, data: null };
  }
}
