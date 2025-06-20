

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

// For fetching project list from /rest/api/3/project
export interface JiraProjectDetail {
  id: string;
  key: string;
  name: string;
  avatarUrls?: { '48x48'?: string };
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
}


export interface JiraUser {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
  avatarUrls?: { '48x48'?: string };
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
  colorName?: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory?: JiraStatusCategory;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  startDate?: string | null; // ISO Date string
  endDate?: string | null; // ISO Date string
  completeDate?: string | null; // ISO Date string
  state?: 'active' | 'closed' | 'future';
  boardId?: number;
}

export interface JiraWorklog {
  started?: string; // ISO Date string
  timeSpentSeconds?: number;
  author?: JiraUser;
}

export interface JiraChangelogItem {
  field: string;
  fieldtype: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

export interface JiraChangelogHistory {
  id: string;
  author?: JiraUser;
  created?: string; // ISO Date string
  items?: JiraChangelogItem[];
}


export interface JiraIssue {
  id: string; // Corresponds to issue.key from Jira API
  self?: string; // URL to the issue
  summary: string;
  description?: string | null; // Jira descriptions can be rich text / AD F
  status: JiraStatus;
  type: JiraIssueType;
  project: JiraProject;
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  priority?: JiraPriority | null;
  labels?: string[];
  components?: Array<{ id: string; name: string }>;
  created?: string; // ISO Date string
  updated?: string; // ISO Date string
  resolutiondate?: string | null; // ISO Date string
  duedate?: string | null; // ISO Date string for task due dates
  
  // Time tracking
  timeoriginalestimate?: number | null; // seconds
  timespent?: number | null; // seconds
  timeestimate?: number | null; // remaining estimate in seconds
  aggregatetimeoriginalestimate?: number | null;
  aggregatetimespent?: number | null;
  aggregatetimeestimate?: number | null;

  // Worklogs
  worklog?: {
    startAt?: number;
    maxResults?: number;
    total?: number;
    worklogs?: JiraWorklog[];
  };

  // Sprint Information
  sprint?: JiraSprint | null;
  closedSprints?: JiraSprint[];
  customfield_10007?: any[] | null; // Raw sprint data

  // Story Points
  storyPoints?: number | null;
  customfield_12326?: number | null; // Story points custom field

  // Parent issue (for sub-tasks)
  parent?: {
    id: string;
    key: string;
    fields?: {
      summary?: string;
      status?: JiraStatus;
      priority?: JiraPriority;
      issuetype?: JiraIssueType;
    };
  } | null;

  // Changelog
  changelog?: {
    startAt?: number;
    maxResults?: number;
    total?: number;
    histories?: JiraChangelogHistory[];
  };

  // Custom fields from the document
  customfield_12929?: string | null; // Cost Centers (Tab 5) - Assuming string
  customfield_12606?: number | null; // Amount (Tab 5) - Assuming number
  customfield_12608?: string | null; // Payment Type (Tab 5) - Assuming string
  customfield_12905?: string | null; // Payment Due Date (Tab 5) - Assuming ISO date string
  customfield_12902?: string | null; // Payer Company (Tab 5) - Assuming string
  customfield_12804?: number | null; // Number of Tables (Tab 7) - Assuming number
  customfield_10500?: JiraUser[] | null; // Request Participants (Tab 11) - Assuming array of users
  customfield_16160?: JiraUser[] | null; // Evaluation Committee (Tab 11) - Assuming array of users

  // Placeholder for named custom fields (types are examples)
  // Ensure these IDs are updated to your actual Jira custom field IDs
  customfield_user_role?: string | null; // Example for Role (Tab 2)
  customfield_user_department?: string | null; // Example for Department (Tab 2, 8)
  customfield_design_option?: string | null; // Example for Design Option (Tab 6)
  customfield_icon_type?: string | null; // Example for Icon Type (Tab 6)
  customfield_application_name?: string | null; // Example for Application (Tab 6)
  customfield_physical_location?: string | null; // Example for Location (Tab 7)
  customfield_game_type?: string | null; // Example for Game Type (Tab 7)
  customfield_employee_category?: string | null; // Example for Employee Category (Tab 8)
  customfield_employee_position?: string | null; // Example for Position (Tab 8)
  customfield_employee_salary?: number | null; // Example for Salary (Tab 8)
  customfield_risk_likelihood?: string | null; // Example for Likelihood (Tab 10)
  customfield_risk_impact?: string | null; // Example for Impact (Tab 10)
  customfield_incident_severity?: string | null; // Example for Severity (Tab 10)
  customfield_incident_type?: string | null; // Example for Incident Type (Tab 10)
  startdate?: string | null; // For Gantt chart (Tab 9)


  // Allow other custom fields
  [key: string]: any;
}

export interface JiraConfig {
  jiraUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraFilters {
  queryType: 'jql' | 'project';
  jqlQuery?: string;
  project?: string; // Project Key
  dateRange?: { from?: Date; to?: Date };
  issueType?: string; // Specific issue type name, e.g., 'Bug', 'Story'. 'all' means no filter.
}

export interface FetchJiraIssuesResponse {
  success: boolean;
  data?: JiraIssue[] | null;
  error?: string | null;
  message?: string;
}

export interface FetchJiraProjectsResponse {
  success: boolean;
  data?: JiraProjectDetail[] | null;
  error?: string | null;
  message?: string;
}
