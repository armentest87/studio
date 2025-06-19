
'use server';

import type { JiraConfig, JiraFilters, FetchJiraIssuesResponse, JiraIssue, JiraSprint } from '@/types/jira';

// Helper to parse sprint data which might come as an array of strings
// Each string is a JSON representation of sprint details.
// Example string: "com.atlassian.greenhopper.service.sprint.Sprint@123abc[id=1,rapidViewId=10,state=ACTIVE,name=Sprint 1,startDate=...,endDate=...]"
function parseSprintString(sprintString: string): Partial<JiraSprint> | null {
  try {
    // This regex is an example and might need adjustment based on the actual string format from your Jira.
    // It tries to capture id, name, state, startDate, and endDate.
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
      // If only issueType is selected, it might be too broad.
      // Consider requiring a project or JQL for standalone issueType filter.
      // For now, allow it:
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
  
  // Define the fields you want to fetch from Jira
  // Note: customfield_XXXXX IDs are specific to your Jira instance.
  // You might need to find the correct IDs for 'Sprint' and 'Story Points'.
  const fieldsToRequest = [
    "summary", "description", "status", "issuetype", "project", "assignee", "reporter",
    "priority", "labels", "components", "created", "updated", "resolutiondate",
    "timeoriginalestimate", "timespent", "timeestimate",
    "aggregatetimeoriginalestimate", "aggregatetimespent", "aggregatetimeestimate",
    "worklog", "parent", 
    "customfield_10007", // Sprint field ID (example, often holds sprint details)
    "customfield_12326", // Story Points field ID (example)
    // "*navigable" // Gets all fields user can see, useful for discovery but can be verbose. Use with caution.
  ];

  try {
    // Actual API Call
    const response = await fetch(jiraApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        jql: constructedJql,
        fields: fieldsToRequest,
        startAt: 0,
        maxResults: 1000, // Increased maxResults, but proper pagination is needed for >1000 issues.
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API Error:', response.status, errorText);
      // Try to parse errorText if it's JSON for more detailed messages from Jira
      let detailedError = errorText;
      try {
        const jiraError = JSON.parse(errorText);
        if (jiraError && jiraError.errorMessages && jiraError.errorMessages.length > 0) {
            detailedError = jiraError.errorMessages.join('; ');
        } else if (jiraError && jiraError.message) {
            detailedError = jiraError.message;
        }
      } catch (parseError) {
        // Ignore if not JSON
      }
      return { success: false, error: `Jira API request failed: ${response.statusText} (Status ${response.status}). ${detailedError}`, data: null };
    }

    const responseData = await response.json();

    const issues: JiraIssue[] = responseData.issues.map((issue: any) => {
      let sprintData: JiraSprint | null = null;
      const rawSprintField = issue.fields.customfield_10007; // Adjust if your sprint field ID is different

      if (rawSprintField && Array.isArray(rawSprintField) && rawSprintField.length > 0) {
          const parsedSprints = rawSprintField
            .map(s => {
                if (typeof s === 'string') return parseSprintString(s);
                // If it's already an object, assume it has the JiraSprint structure
                // You might need to adapt this if the object structure is different
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
            
          // Prioritize active, then future, then most recently ended/defined if multiple sprints are associated
          sprintData = parsedSprints.find(s => s.state === 'active') || 
                        parsedSprints.find(s => s.state === 'future') || 
                        parsedSprints.sort((a,b) => {
                            const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
                            const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
                            return dateB - dateA; // Sort descending by end date
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
        aggregatetimeoriginalestimate: issue.fields.aggregatetimespent,
        aggregatetimeestimate: issue.fields.aggregatetimeestimate,

        worklog: issue.fields.worklog,
        parent: issue.fields.parent,
        
        sprint: sprintData,
        closedSprints: rawSprintField && Array.isArray(rawSprintField) ? rawSprintField.map(s => typeof s === 'string' ? parseSprintString(s) : s).filter(s => s && s.state === 'closed') as JiraSprint[] : [],
        customfield_10007: rawSprintField, // Keep raw data if needed

        storyPoints: issue.fields.customfield_12326 || null, // Adjust if your story points field ID is different
        customfield_12326: issue.fields.customfield_12326, // Keep raw data

        // You can add more specific custom field mappings here if needed
        // e.g. customFieldXYZ: issue.fields.customfield_XXXXX 
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
        if (error.message.toLowerCase().includes('fetch')) { // Broader check for fetch-related errors
            errorMessage = 'Network error: Could not connect to Jira. Please check the Jira URL and your network connection. Also, verify API token permissions and that the Jira instance is accessible.';
        } else {
            errorMessage = `An internal server error occurred: ${error.message}`;
        }
    }
    return { success: false, error: errorMessage, data: null };
  }
}

    