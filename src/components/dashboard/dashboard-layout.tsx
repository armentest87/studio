
"use client";

import React, { useState, useContext, useMemo, useEffect } from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { isValid, parseISO } from 'date-fns';

import { JiraSidebarContent } from './sidebar-content';
import { JiraDataProvider, JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';

// Import new tab components
import { GeneralInfoTab } from './general-info-tab';
import { UserRoleMgmtTab } from './user-role-mgmt-tab';
import { DateTimeInfoTab } from './date-time-info-tab';
import { TimeTrackingTab } from './time-tracking-tab';
import { FinancePaymentsTab } from './finance-payments-tab';
import { DesignUiTab } from './design-ui-tab';
import { GamingSetupTab } from './gaming-setup-tab';
import { HumanResourcesTab } from './human-resources-tab';
import { ProjectTaskMgmtTab } from './project-task-mgmt-tab';
import { IncidentRiskMgmtTab } from './incident-risk-mgmt-tab';
import { OtherCustomFieldsTab } from './other-custom-fields-tab';


type TabConfig = {
  value: string;
  label: string;
  Icon: React.ElementType;
  Component: React.ComponentType<any>;
  isDataSufficient?: (issuesArg?: JiraIssue[] | null) => boolean;
};

const ALL_TABS_CONFIG: TabConfig[] = [
  {
    value: "generalInfo", // Tab 1
    label: "General Info",
    Icon: Icons.generalInfo,
    Component: GeneralInfoTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
      if (!issuesArg || issuesArg.length === 0) return false;
      return true; // Always show if issues exist
    }
  },
  {
    value: "userRoleMgmt", // Tab 2
    label: "User & Role Mgmt",
    Icon: Icons.userRoleMgmt,
    Component: UserRoleMgmtTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
      if (!issuesArg || issuesArg.length === 0) return false;
      // Check for assignees, reporters, or relevant custom fields if defined (e.g., customfield_user_role)
      const hasUserData = issuesArg.some(issue => issue.assignee?.displayName || issue.reporter?.displayName || issue.customfield_user_role || issue.customfield_user_department);
      return hasUserData;
    }
  },
  {
    value: "dateTimeInfo", // Tab 3
    label: "Date & Time",
    Icon: Icons.dateTimeInfo,
    Component: DateTimeInfoTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
       if (!issuesArg || issuesArg.length === 0) return false;
       // Checks if there are issues with valid created or resolution dates
       const hasDateData = issuesArg.some(issue => 
         (issue.created && isValid(parseISO(issue.created))) || 
         (issue.resolutiondate && isValid(parseISO(issue.resolutiondate)))
       );
       return hasDateData;
    }
  },
  {
    value: "timeTracking", // Tab 4
    label: "Time Tracking",
    Icon: Icons.timeTracking,
    Component: TimeTrackingTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
      if (!issuesArg || issuesArg.length === 0) return false;
      // Checks for any time tracking fields or sprint data
      const hasTimeData = issuesArg.some(issue => 
        typeof issue.timeoriginalestimate === 'number' || 
        typeof issue.timespent === 'number' ||
        issue.sprint?.name
      );
      return hasTimeData;
    }
  },
  {
    value: "financePayments", // Tab 5
    label: "Finance",
    Icon: Icons.financePayments,
    Component: FinancePaymentsTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
      if (!issuesArg || issuesArg.length === 0) return false;
      // Checks for custom fields: Cost Center, Amount, Payment Type
      const hasFinanceData = issuesArg.some(issue => 
        issue.customfield_12929 || issue.customfield_12606 || issue.customfield_12608 || issue.customfield_12905 || issue.customfield_12902
      );
      return hasFinanceData;
    }
  },
  {
    value: "designUI", // Tab 6
    label: "Design & UI",
    Icon: Icons.designUI,
    Component: DesignUiTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for design-related or icon-related custom fields
        const hasDesignData = issuesArg.some(issue => 
            issue.customfield_design_option || issue.customfield_icon_type || issue.customfield_application_name
        );
        return hasDesignData;
    }
  },
  {
    value: "gamingSetup", // Tab 7
    label: "Gaming & Setup",
    Icon: Icons.gamingSetup,
    Component: GamingSetupTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for Number of Tables, Location, or Game Type custom fields
        const hasGamingData = issuesArg.some(issue => 
            issue.customfield_12804 || issue.customfield_physical_location || issue.customfield_game_type
        );
        return hasGamingData;
    }
  },
  {
    value: "humanResources", // Tab 8
    label: "HR",
    Icon: Icons.humanResources,
    Component: HumanResourcesTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for Employee Category, Position, Salary, or Department custom fields
        const hasHRData = issuesArg.some(issue => 
            issue.customfield_employee_category || issue.customfield_employee_position || issue.customfield_employee_salary || issue.customfield_user_department
        );
        return hasHRData;
    }
  },
  {
    value: "projectTaskMgmt", // Tab 9
    label: "Project & Tasks",
    Icon: Icons.projectTaskMgmt,
    Component: ProjectTaskMgmtTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for startdate or duedate (for Gantt-like views) or general task properties
        const hasProjectTaskData = issuesArg.some(issue => 
            issue.startdate || issue.duedate || issue.project?.key
        );
        return hasProjectTaskData;
    }
  },
  {
    value: "incidentRiskMgmt", // Tab 10
    label: "Incidents & Risks",
    Icon: Icons.incidentRiskMgmt,
    Component: IncidentRiskMgmtTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for Severity, Likelihood, or Impact custom fields
        const hasIncidentRiskData = issuesArg.some(issue => 
            issue.customfield_incident_severity || issue.customfield_incident_type || issue.customfield_risk_likelihood || issue.customfield_risk_impact
        );
        return hasIncidentRiskData;
    }
  },
  {
    value: "otherCustomFields", // Tab 11
    label: "Other Custom",
    Icon: Icons.otherCustomFields,
    Component: OtherCustomFieldsTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null): boolean => {
        if (!issuesArg || issuesArg.length === 0) return false;
        // Checks for specific custom fields for this tab
        const hasOtherData = issuesArg.some(issue => 
            issue.customfield_10500 || issue.customfield_16160
        );
        return hasOtherData;
    }
  }
];

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);

  if (!context) {
    console.error("JiraDataContext not available in DashboardContent.");
    return (
      <div className="flex min-h-screen bg-background items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Application Error</AlertTitle>
          <AlertDescription>
            JiraDataContext is not available. The application cannot function.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { issues, isLoading, error } = context;

  const availableTabs = useMemo(() => {
    return ALL_TABS_CONFIG.filter(tab =>
      tab.isDataSufficient ? tab.isDataSufficient(issues) : true
    );
  }, [issues]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const initialContextIssues = context?.issues || [];
    const firstAvailable = ALL_TABS_CONFIG.find(tab => // Use find for the first match directly
      tab.isDataSufficient ? tab.isDataSufficient(initialContextIssues) : true
    );
    return firstAvailable ? firstAvailable.value : (ALL_TABS_CONFIG[0]?.value || 'generalInfo');
  });


  useEffect(() => {
    const currentActiveTabConfig = availableTabs.find(tab => tab.value === activeTab);
    if (!currentActiveTabConfig && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].value);
    } else if (availableTabs.length === 0 && ALL_TABS_CONFIG.length > 0 && activeTab !== ALL_TABS_CONFIG[0].value) {
      // If no tabs are data-sufficient, default to the first defined tab
      setActiveTab(ALL_TABS_CONFIG[0].value);
    }
  }, [availableTabs, activeTab, issues]);

  const currentDisplayTabConfig = useMemo(() => {
    return availableTabs.find(tab => tab.value === activeTab) ||
           (availableTabs.length > 0 ? availableTabs[0] : ALL_TABS_CONFIG[0]); 
  }, [activeTab, availableTabs]);

  const displayNoDataMessage = !isLoading && (!issues || issues.length === 0 || availableTabs.length === 0);
  const tabsToRender = availableTabs.length > 0 ? availableTabs : (ALL_TABS_CONFIG.length > 0 ? [ALL_TABS_CONFIG[0]] : []);


  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-md">
        <JiraSidebarContent />
      </Sidebar>
      <SidebarInset className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card px-6 shadow-sm">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold font-headline">
              {currentDisplayTabConfig?.label || "Jira Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading && (!issues || issues.length === 0) ? (
            <div className="flex justify-center items-center h-full">
              <Icons.loader className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Fetching Jira data...</p>
            </div>
          ) : error ? (
            <div className="p-4 mt-4 text-center text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="font-semibold">Error Fetching Data</p>
                <p className="text-sm">{error}</p>
            </div>
          ) : displayNoDataMessage ? (
             <div className="p-4 mt-4 text-center text-muted-foreground">
               No Jira issues found, data is insufficient for any visualization tabs, or no tabs are configured. Please fetch issues using the sidebar, or adjust filters.
               { ALL_TABS_CONFIG.length > 0 && availableTabs.length === 0 && (
                <p className="text-sm mt-2">Defaulting to: {ALL_TABS_CONFIG[0].label}</p>
               )}
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap border-b">
                <TabsList className="mb-0 inline-flex h-auto rounded-none border-0 bg-transparent p-0">
                  {tabsToRender.map((tab) => (
                    tab && <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-shrink-0 h-10 px-3 py-2 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                    >
                      <tab.Icon className={`mr-2 h-4 w-4 ${sidebarState === 'collapsed' ? 'md:mr-0' : 'md:mr-2'}`} />
                      <span className={`${sidebarState === 'collapsed' ? 'md:hidden' : ''}`}>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
              {tabsToRender.map((tab) => (
                 tab && <TabsContent key={tab.value} value={tab.value} className="mt-4">
                   <tab.Component />
                 </TabsContent>
              ))}
            </Tabs>
          )}
        </main>
      </SidebarInset>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <JiraDataProvider>
      <DashboardContent />
    </JiraDataProvider>
  );
}
