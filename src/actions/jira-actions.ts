
'use server';

import type { JiraConfig, JiraFilters, FetchJiraIssuesResponse, JiraIssue, JiraSprint, FetchJiraProjectsResponse, JiraProjectDetail } from '@/types/jira';

// Helper to parse sprint data which might come as an array of strings
// Each string is a JSON representation of sprint details.
// Example string: "com.atlassian.greenhopper.service.sprint.Sprint@123abc[id=1,rapidViewId=10,state=ACTIVE,name=Sprint 1,startDate=...,endDate=...]"
function parseSprintString(sprintString: string): Partial<JiraSprint> | null {
  try {
    const pattern = /id=(\d+)[^\[]*\[[^\]]*name=([^,]+)[^\[]*state=([^,]+)[^\[]*startDate=([^,]+)[^\[]*endDate=([^,]+)/;
    const match = sprintString.match(pattern);

    if (match) {
      return {
        id: parseInt(match[1], 10),
        name: match[2],
        state: match[3].toLowerCase() as JiraSprint['state'],
        startDate: match[4] !== '<null>' ? new Date(match[4]).toISOString() : undefined,
        endDate: match[5] !== '<null>' ? new Date(match[5]).toISOString() : undefined,
      };
    }
     // Handle cases where some dates might be <null> or absent by looking for specific key-value pairs
    const idMatch = sprintString.match(/id=(\d+)/);
    const nameMatch = sprintString.match(/name=([^,]+)/);
    const stateMatch = sprintString.match(/state=([^,]+)/);
    const startDateMatch = sprintString.match(/startDate=([^,]+)/);
    const endDateMatch = sprintString.match(/endDate=([^,]+)/);
    const completeDateMatch = sprintString.match(/completeDate=([^,]+)/);
    
    if (idMatch && nameMatch && stateMatch) {
        return {
            id: parseInt(idMatch[1], 10),
            name: nameMatch[1],
            state: stateMatch[1].toLowerCase() as JiraSprint['state'],
            startDate: startDateMatch && startDateMatch[1] !== '<null>' ? new Date(startDateMatch[1]).toISOString() : undefined,
            endDate: endDateMatch && endDateMatch[1] !== '<null>' ? new Date(endDateMatch[1]).toISOString() : undefined,
            completeDate: completeDateMatch && completeDateMatch[1] !== '<null>' ? new Date(completeDateMatch[1]).toISOString() : undefined,
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

  if (!jiraUrl || !email || !apiToken) {
    return { success: false, error: "Jira URL, Email, or API Token is missing. Please configure them in the sidebar.", data: null };
  }

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

  if (!constructedJql) {
    return { success: false, error: "No JQL query or project filter was specified. Please provide filters.", data: null };
  }
  
  console.log('Constructed JQL for API:', constructedJql);

  const jiraApiEndpoint = `${jiraUrl.replace(/\/$/, '')}/rest/api/3/search`;
  const authString = `${email}:${apiToken}`;
  const authHeader = `Basic ${typeof Buffer !== 'undefined' ? Buffer.from(authString).toString('base64') : btoa(authString)}`;
  
  const fieldsToRequest = [
    "summary", "description", "status", "issuetype", "project", "assignee", "reporter",
    "priority", "labels", "components", "created", "updated", "resolutiondate",
    "timeoriginalestimate", "timespent", "timeestimate",
    "aggregatetimeoriginalestimate", "aggregatetimespent", "aggregatetimeestimate",
    "worklog", "parent", 
    "customfield_10007", // Sprint field ID (example, often holds sprint details)
    "customfield_12326", // Story Points field ID (example)
  ];

  let allIssuesRaw: any[] = [];
  let startAt = 0;
  const maxResultsPerRequest = 100; 
  let totalIssuesFromResponse = 0;
  let fetchedIssuesInBatch = 0;

  try {
    do {
      const body = {
        jql: constructedJql,
        fields: fieldsToRequest,
        startAt: startAt,
        maxResults: maxResultsPerRequest,
      };

      const response = await fetch(jiraApiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Jira API Error:', response.status, errorText);
        let detailedError = errorText;
        try {
          const jiraError = JSON.parse(errorText);
          if (jiraError && jiraError.errorMessages && jiraError.errorMessages.length > 0) {
              detailedError = jiraError.errorMessages.join('; ');
          } else if (jiraError && jiraError.message) {
              detailedError = jiraError.message;
          }
        } catch (parseError) { /* Ignore if not JSON */ }
        return { success: false, error: `Jira API request failed: ${response.statusText} (Status ${response.status}). ${detailedError}`, data: null };
      }

      const responseData = await response.json();
      if (!responseData.issues || responseData.issues.length === 0) {
        fetchedIssuesInBatch = 0; 
      } else {
        allIssuesRaw = allIssuesRaw.concat(responseData.issues);
        fetchedIssuesInBatch = responseData.issues.length;
      }
      
      totalIssuesFromResponse = responseData.total || 0;
      startAt += fetchedIssuesInBatch;
      
    } while (startAt < totalIssuesFromResponse && fetchedIssuesInBatch > 0); 


    const issues: JiraIssue[] = allIssuesRaw.map((issue: any) => {
      let sprintData: JiraSprint | null = null;
      const rawSprintField = issue.fields.customfield_10007; 

      if (rawSprintField && Array.isArray(rawSprintField) && rawSprintField.length > 0) {
          const parsedSprints = rawSprintField
            .map(s => {
                if (typeof s === 'string') return parseSprintString(s);
                if (typeof s === 'object' && s !== null && s.id && s.name && s.state) {
                    return {
                        id: s.id,
                        name: s.name,
                        state: s.state.toLowerCase(),
                        startDate: s.startDate ? new Date(s.startDate).toISOString() : undefined,
                        endDate: s.endDate ? new Date(s.endDate).toISOString() : undefined,
                        completeDate: s.completeDate ? new Date(s.completeDate).toISOString() : undefined,
                        boardId: s.boardId,
                    } as JiraSprint;
                }
                return null;
            })
            .filter(Boolean) as JiraSprint[];
            
          sprintData = parsedSprints.find(s => s.state === 'active') || 
                        parsedSprints.find(s => s.state === 'future') || 
                        parsedSprints.sort((a,b) => {
                            const dateA = a.endDate ? new Date(a.endDate).getTime() : (a.completeDate ? new Date(a.completeDate).getTime() : 0);
                            const dateB = b.endDate ? new Date(b.endDate).getTime() : (b.completeDate ? new Date(b.completeDate).getTime() : 0);
                            return dateB - dateA; 
                        })[0] || 
                        null;
      }

      return {
        id: issue.key,
        self: issue.self,
        summary: issue.fields.summary,
        description: issue.fields.description, 
        status: issue.fields.status,
        type: issue.fields.issuetype,
        project: issue.fields.project,
        assignee: issue.fields.assignee,
        reporter: issue.fields.reporter,
        priority: issue.fields.priority,
        labels: issue.fields.labels || [],
        components: issue.fields.components || [],
        created: issue.fields.created,
        updated: issue.fields.updated,
        resolutiondate: issue.fields.resolutiondate,

        timeoriginalestimate: issue.fields.timeoriginalestimate,
        timespent: issue.fields.timespent,
        timeestimate: issue.fields.timeestimate,
        aggregatetimeoriginalestimate: issue.fields.aggregatetimeoriginalestimate,
        aggregatetimespent: issue.fields.aggregatetimespent, 
        aggregatetimeestimate: issue.fields.aggregatetimeestimate,

        worklog: issue.fields.worklog, 
        parent: issue.fields.parent,
        
        sprint: sprintData,
        closedSprints: rawSprintField && Array.isArray(rawSprintField) ? 
          rawSprintField.map(s => {
            if (typeof s === 'string') return parseSprintString(s);
            if (typeof s === 'object' && s !== null && s.id && s.name && s.state) return s as JiraSprint; 
            return null;
          }).filter(s => s && s.state === 'closed') as JiraSprint[] : [],
        customfield_10007: rawSprintField, 

        storyPoints: issue.fields.customfield_12326 || null, 
        customfield_12326: issue.fields.customfield_12326, 
      };
    });

    return { 
      success: true, 
      data: issues, 
      message: `Successfully fetched ${issues.length} issues from Jira. (JQL: ${constructedJql})` 
    };
    
  } catch (error: any) {
    console.error('Error in fetchJiraIssues server action:', error);
    let errorMessage = 'An unknown error occurred on the server.';
    if (error.message) {
        if (error.message.toLowerCase().includes('fetch')) { 
            errorMessage = 'Network error: Could not connect to Jira. Please check the Jira URL and your network connection. Also, verify API token permissions and that the Jira instance is accessible.';
        } else {
            errorMessage = `An internal server error occurred: ${error.message}`;
        }
    }
    return { success: false, error: errorMessage, data: null };
  }
}

export async function fetchJiraProjects(params: JiraConfig): Promise<FetchJiraProjectsResponse> {
  const { jiraUrl, email, apiToken } = params;

  if (!jiraUrl || !email || !apiToken) {
    return { success: false, error: "Jira URL, Email, or API Token is missing.", data: null };
  }

  const jiraApiEndpoint = `${jiraUrl.replace(/\/$/, '')}/rest/api/3/project`;
  const authString = `${email}:${apiToken}`;
  const authHeader = `Basic ${typeof Buffer !== 'undefined' ? Buffer.from(authString).toString('base64') : btoa(authString)}`;

  // --- MOCK IMPLEMENTATION START ---
  // console.log("Mocking fetchJiraProjects call. To enable live API, uncomment below and comment out mock.");
  const mockProjects: JiraProjectDetail[] = [
    { id: "10001", key: "PROJA", name: "Project Alpha", avatarUrls: {'48x48': 'https://placehold.co/48x48.png'}, projectTypeKey: "software", simplified: false, style: "classic" },
    { id: "10002", key: "PROJB", name: "Project Beta", avatarUrls: {'48x48': 'https://placehold.co/48x48.png'}, projectTypeKey: "software", simplified: true, style: "next-gen" },
    { id: "10003", key: "MOCK", name: "Mock Project X", avatarUrls: {'48x48': 'https://placehold.co/48x48.png'}, projectTypeKey: "business", simplified: false, style: "classic" },
  ];
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return { success: true, data: mockProjects, message: "Successfully fetched mock projects." };
  // --- MOCK IMPLEMENTATION END ---


  /* --- REAL API CALL (Commented out by default) ---
  try {
    const response = await fetch(jiraApiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API Error (Projects):', response.status, errorText);
      let detailedError = errorText;
      try {
        const jiraError = JSON.parse(errorText);
        detailedError = jiraError?.errorMessages?.join('; ') || jiraError?.message || errorText;
      } catch (parseError) {}
      return { success: false, error: `Jira API request for projects failed: ${response.statusText} (Status ${response.status}). ${detailedError}`, data: null };
    }

    const projectsData: JiraProjectDetail[] = await response.json();
    return { success: true, data: projectsData, message: `Successfully fetched ${projectsData.length} projects.` };

  } catch (error: any) {
    console.error('Error in fetchJiraProjects server action:', error);
    let errorMessage = 'An unknown server error occurred while fetching projects.';
    if (error.message && error.message.toLowerCase().includes('fetch')) {
      errorMessage = 'Network error: Could not connect to Jira to fetch projects. Check URL and connection.';
    } else if (error.message) {
      errorMessage = `Error fetching projects: ${error.message}`;
    }
    return { success: false, error: errorMessage, data: null };
  }
  */
}
