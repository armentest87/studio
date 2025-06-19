
export interface JiraProject {
  id: string;
  key: string;
  name: string;
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

  // Sprint Information (often a custom field)
  // Example: 'customfield_10007' for Sprints
  // This can be an array of sprint objects or stringified JSONs
  sprint?: JiraSprint | null; // Typically the active or most recent sprint
  closedSprints?: JiraSprint[]; // Historical sprints
  customfield_10007?: any[] | null; // Raw sprint data if specific parsing is needed

  // Story Points (often a custom field)
  // Example: 'customfield_12326'
  storyPoints?: number | null;
  customfield_12326?: number | null;


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

  // Other potential custom fields, keep as generic any or define if known
  [key: string]: any; // For other custom fields
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
