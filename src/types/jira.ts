
export interface JiraConfig {
  jiraUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraFilters {
  queryType: 'jql' | 'project';
  jqlQuery?: string;
  project?: string;
  dateRange?: { from?: Date; to?: Date };
  issueType?: string; // Optional, 'all' or specific type like 'Bug', 'Story'
}

export interface JiraIssue {
  id: string;
  summary: string;
  status: string;
  type: string;
  assignee?: string;
  // Add other relevant fields as needed from Jira API
}

export interface FetchJiraIssuesResponse {
  success: boolean;
  data?: JiraIssue[] | null;
  error?: string | null;
  message?: string;
}
