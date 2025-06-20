
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
      constructedJql = `issuetype = "${issueType}"`; // Should not happen if project or JQL is required
    }
  }

  if (!constructedJql) {
    return { success: false, error: "No JQL query or project filter was specified. Please provide filters.", data: null };
  }
  
  console.log('Constructed JQL for API:', constructedJql);

  const jiraApiEndpoint = `${jiraUrl.replace(/\/$/, '')}/rest/api/3/search`;
  const authString = `${email}:${apiToken}`;
  const authHeader = `Basic ${typeof Buffer !== 'undefined' ? Buffer.from(authString).toString('base64') : btoa(authString)}`;
  
  // Comprehensive list of fields based on old app and potential needs
  const fieldsToRequest = [
    "summary", "description", "status", "issuetype", "project", "assignee", "reporter",
    "priority", "labels", "components", "created", "updated", "resolutiondate", "duedate", "startdate",
    "timeoriginalestimate", "timespent", "timeestimate",
    "aggregatetimeoriginalestimate", "aggregatetimespent", "aggregatetimeestimate",
    "worklog", "parent", "environment", "versions", "fixVersions",
    "customfield_10007", // Sprint field
    "customfield_12326", // Story Points field
    // New custom fields based on the document
    "customfield_12929", // Cost Centers
    "customfield_12606", // Amount
    "customfield_12608", // Payment Type
    "customfield_12905", // Payment Due Date
    "customfield_12902", // Payer Company
    "customfield_12804", // Number of Tables
    "customfield_10500", // Request Participants
    "customfield_16160", // Evaluation Committee
    // Add placeholders for named custom fields that might be used
    // These actual IDs would need to be configured for a specific Jira instance
    "customfield_user_role", 
    "customfield_user_department",
    "customfield_design_option",
    "customfield_icon_type",
    "customfield_application_name",
    "customfield_physical_location",
    "customfield_game_type",
    "customfield_employee_category",
    "customfield_employee_position",
    "customfield_employee_salary",
    "customfield_risk_likelihood",
    "customfield_risk_impact",
    "customfield_incident_severity",
    "customfield_incident_type",
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
        expand: ["changelog"], 
        startAt: startAt,
        maxResults: maxResultsPerRequest,
      };

      console.log(`Fetching issues from Jira: startAt=${startAt}, maxResults=${maxResultsPerRequest}`);
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
        let detailedError = `Status ${response.status}: ${response.statusText}.`;
        try {
          const jiraError = JSON.parse(errorText);
          if (jiraError && jiraError.errorMessages && jiraError.errorMessages.length > 0) {
              detailedError += ` ${jiraError.errorMessages.join('; ')}`;
          } else if (jiraError && jiraError.message) {
              detailedError += ` ${jiraError.message}`;
          }
        } catch (parseError) { 
            detailedError += ` Response: ${errorText.substring(0, 200)}...`; 
        }
        return { success: false, error: `Jira API request failed. ${detailedError}`, data: null };
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
      console.log(`Fetched ${fetchedIssuesInBatch} issues. Total so far: ${allIssuesRaw.length} of ${totalIssuesFromResponse}`);
      
    } while (startAt < totalIssuesFromResponse && fetchedIssuesInBatch > 0); 


    const issues: JiraIssue[] = allIssuesRaw.map((issueData: any) => {
      let sprintData: JiraSprint | null = null;
      const rawSprintField = issueData.fields.customfield_10007; 

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
                            const dateA = a.completeDate ? new Date(a.completeDate).getTime() : (a.endDate ? new Date(a.endDate).getTime() : 0);
                            const dateB = b.completeDate ? new Date(b.completeDate).getTime() : (b.endDate ? new Date(b.endDate).getTime() : 0);
                            return dateB - dateA; 
                        })[0] || 
                        null;
      }

      const mappedIssue: JiraIssue = {
        id: issueData.key,
        self: issueData.self,
        summary: issueData.fields.summary,
        description: issueData.fields.description, 
        status: issueData.fields.status,
        type: issueData.fields.issuetype,
        project: issueData.fields.project,
        assignee: issueData.fields.assignee,
        reporter: issueData.fields.reporter,
        priority: issueData.fields.priority,
        labels: issueData.fields.labels || [],
        components: issueData.fields.components || [],
        created: issueData.fields.created,
        updated: issueData.fields.updated,
        resolutiondate: issueData.fields.resolutiondate,
        duedate: issueData.fields.duedate,
        startdate: issueData.fields.startdate, // For Gantt
        environment: issueData.fields.environment,
        versions: issueData.fields.versions || [],
        fixVersions: issueData.fields.fixVersions || [],

        timeoriginalestimate: issueData.fields.timeoriginalestimate,
        timespent: issueData.fields.timespent,
        timeestimate: issueData.fields.timeestimate,
        aggregatetimeoriginalestimate: issueData.fields.aggregatetimeoriginalestimate,
        aggregatetimespent: issueData.fields.aggregatetimespent, 
        aggregatetimeestimate: issueData.fields.aggregatetimeestimate,

        worklog: issueData.fields.worklog, 
        parent: issueData.fields.parent,
        
        sprint: sprintData,
        closedSprints: rawSprintField && Array.isArray(rawSprintField) ? 
          rawSprintField.map(s => {
            if (typeof s === 'string') return parseSprintString(s);
            if (typeof s === 'object' && s !== null && s.id && s.name && s.state) return s as JiraSprint; 
            return null;
          }).filter(s => s && s.state === 'closed') as JiraSprint[] : [],
        
        storyPoints: issueData.fields.customfield_12326 || null,
        
        changelog: issueData.changelog,
      };

      // Dynamically add all custom fields from fieldsToRequest that are present
      fieldsToRequest.forEach(fieldKey => {
        if (fieldKey.startsWith('customfield_') && issueData.fields[fieldKey] !== undefined) {
          mappedIssue[fieldKey] = issueData.fields[fieldKey];
        }
      });
      
      return mappedIssue;
    });

    console.log(`Successfully processed ${issues.length} issues.`);
    return { 
      success: true, 
      data: issues, 
      message: `Successfully fetched ${issues.length} issues from Jira. (JQL: ${constructedJql})` 
    };
    
  } catch (error: any) {
    console.error('Error in fetchJiraIssues server action:', error);
    let errorMessage = 'An unknown error occurred on the server.';
    if (error.message) {
        if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('dns')) { 
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

  try {
    console.log("Fetching projects from Jira API...");
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
      let detailedError = `Status ${response.status}: ${response.statusText}.`;
      try {
        const jiraError = JSON.parse(errorText);
        detailedError += jiraError?.errorMessages?.join('; ') || jiraError?.message || '';
      } catch (parseError) {
        detailedError += ` Response: ${errorText.substring(0,100)}...`;
      }
      return { success: false, error: `Jira API request for projects failed. ${detailedError}`, data: null };
    }

    const projectsData: JiraProjectDetail[] = await response.json();
    console.log(`Successfully fetched ${projectsData.length} projects.`);
    return { success: true, data: projectsData, message: `Successfully fetched ${projectsData.length} projects.` };

  } catch (error: any) {
    console.error('Error in fetchJiraProjects server action:', error);
    let errorMessage = 'An unknown server error occurred while fetching projects.';
     if (error.message && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('dns'))) {
      errorMessage = 'Network error: Could not connect to Jira to fetch projects. Check URL and connection.';
    } else if (error.message) {
      errorMessage = `Error fetching projects: ${error.message}`;
    }
    return { success: false, error: errorMessage, data: null };
  }
}
