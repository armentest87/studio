
"use client";

import React, { useContext, useMemo, useEffect, useState } from 'react';
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

import { JiraSidebarContent } from './sidebar-content';
import { OverviewTab } from './overview-tab';
import { AgileMetricsTab } from './agile-metrics-tab';
import { TeamWorkloadTab } from './team-workload-tab';
import { QualityAnalysisTab } from './quality-analysis-tab';
import { CustomAnalysisTab } from './custom-analysis-tab';
import { AdvancedMetricsTab } from './advanced-metrics-tab';
import { UserWorkloadReportTab } from './user-workload-report-tab';
import { JiraDataProvider, JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';

// Define ALL_TABS_CONFIG at the top level of the module
const ALL_TABS_CONFIG = [
  {
    value: "overview",
    label: "Overview",
    Icon: Icons.overview,
    Component: OverviewTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      return !!(issuesArg && issuesArg.length > 0);
    },
  },
  {
    value: "agile",
    label: "Agile Metrics",
    Icon: Icons.agile,
    Component: AgileMetricsTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (!issuesArg || issuesArg.length === 0) {
        return false;
      }
      return issuesArg.some((issue: JiraIssue) => {
        const hasStoryPointsValid = (typeof issue.storyPoints === 'number' && issue.storyPoints > 0);
        const hasTimeSpentValid = (typeof issue.timespent === 'number' && issue.timespent > 0);
        
        let sprintEffortSufficient = false;
        if (issue.sprint) {
          if (hasStoryPointsValid || hasTimeSpentValid) {
            sprintEffortSufficient = true;
          }
        }

        let isResolvedWithDates = false;
        if (issue.status?.statusCategory?.key === 'done' && issue.created && issue.resolutiondate) {
            isResolvedWithDates = true;
        }
        
        return (sprintEffortSufficient || isResolvedWithDates);
      });
    },
  },
  {
    value: "team",
    label: "Team Workload",
    Icon: Icons.team,
    Component: TeamWorkloadTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (!issuesArg || issuesArg.length === 0) {
        return false;
      }
      return issuesArg.some((issue: JiraIssue) => {
        const hasOpenAssignedIssue = !!(issue.assignee && issue.status?.statusCategory?.key !== 'done');
        const hasResolvedIssue = !!(issue.status?.statusCategory?.key === 'done' && issue.resolutiondate);
        return (hasOpenAssignedIssue || hasResolvedIssue);
      });
    },
  },
  {
    value: "quality",
    label: "Quality Analysis",
    Icon: Icons.bugTrends,
    Component: QualityAnalysisTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (!issuesArg || issuesArg.length === 0) {
        return false;
      }
      return issuesArg.some((issue: JiraIssue) => {
        const isBug = issue.type?.name?.toLowerCase() === 'bug';
        const hasRelevantDates = !!(issue.created || issue.resolutiondate);
        return (isBug && hasRelevantDates);
      });
    },
  },
  {
    value: "custom",
    label: "Custom Analysis",
    Icon: Icons.custom,
    Component: CustomAnalysisTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (issuesArg && issuesArg.length > 0) {
        return true;
      }
      return false;
    },
  },
  {
    value: "advanced",
    label: "Advanced Metrics",
    Icon: Icons.advanced,
    Component: AdvancedMetricsTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (!issuesArg || issuesArg.length === 0) {
        return false;
      }
      return issuesArg.some((issue: JiraIssue) => {
        const hasCreatedDate = !!issue.created;
        const hasStatusCategory = !!issue.status?.statusCategory;
        return (hasCreatedDate && hasStatusCategory);
      });
    },
  },
  {
    value: "userReport",
    label: "User Workload",
    Icon: Icons.userReport,
    Component: UserWorkloadReportTab,
    isDataSufficient: (issuesArg: JiraIssue[] | null | undefined): boolean => {
      if (!issuesArg || issuesArg.length === 0) {
        return false;
      }
      return issuesArg.some((issue: JiraIssue) => {
        const hasAssignee = !!issue.assignee;
        const hasTimeTracking =
          ((typeof issue.timeoriginalestimate === 'number' && issue.timeoriginalestimate > 0) ||
          (typeof issue.timespent === 'number' && issue.timespent > 0) ||
          (typeof issue.timeestimate === 'number' && issue.timeestimate > 0));
        return (hasAssignee && hasTimeTracking); 
      });
    }
  }
];

type TabConfig = typeof ALL_TABS_CONFIG[0]; // Helper type

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);

  // Early return for critical context error
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
  const [activeTab, setActiveTab] = useState<string>(ALL_TABS_CONFIG[0].value);

  // Memoize availableTabs based on issues and loading state
  const availableTabs = useMemo<TabConfig[]>(() => {
    if (isLoading && (!issues || issues.length === 0)) {
      return [ALL_TABS_CONFIG[0]];
    }
    if (!issues || issues.length === 0) {
      return [ALL_TABS_CONFIG[0]];
    }
    const dataSufficientTabs = ALL_TABS_CONFIG.filter((tab: TabConfig) => tab.isDataSufficient(issues));
    if (dataSufficientTabs.length > 0) {
      return dataSufficientTabs;
    }
    return [ALL_TABS_CONFIG[0]]; // Default fallback
  }, [issues, isLoading]);

  // Effect to synchronize activeTab if it's no longer available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((tab: TabConfig) => tab.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    }
  }, [availableTabs, activeTab]);

  // Memoize the current tab configuration
  const currentTabConfig = useMemo<TabConfig>(() => {
    const foundTab = availableTabs.find((tab: TabConfig) => tab.value === activeTab);
    if (foundTab) {
      return foundTab;
    }
    // Fallback logic
    if (availableTabs.length > 0) {
      return availableTabs[0];
    }
    return ALL_TABS_CONFIG[0]; // Absolute fallback
  }, [activeTab, availableTabs]);

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
              {currentTabConfig.label}
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
          ) : (!issues || issues.length === 0) && !isLoading ? (
             <Tabs value={ALL_TABS_CONFIG[0].value} className="w-full">
               <ScrollArea className="w-full whitespace-nowrap border-b">
                 <TabsList className="mb-0 inline-flex h-auto rounded-none border-0 bg-transparent p-0">
                    <TabsTrigger
                      key={ALL_TABS_CONFIG[0].value}
                      value={ALL_TABS_CONFIG[0].value}
                      className="flex-shrink-0 h-10 px-3 py-2 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                    >
                      <ALL_TABS_CONFIG[0].Icon className={`mr-2 h-4 w-4 ${sidebarState === 'collapsed' ? 'md:mr-0' : 'md:mr-2'}`} />
                      <span className={`${sidebarState === 'collapsed' ? 'md:hidden' : ''}`}>{ALL_TABS_CONFIG[0].label}</span>
                    </TabsTrigger>
                 </TabsList>
               </ScrollArea>
              <TabsContent value={ALL_TABS_CONFIG[0].value} className="mt-4">
                 <OverviewTab />
              </TabsContent>
               <div className="p-4 mt-4 text-center text-muted-foreground">
                 No Jira issues found. Please fetch issues using the sidebar, or adjust filters.
               </div>
            </Tabs>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap border-b">
                <TabsList className="mb-0 inline-flex h-auto rounded-none border-0 bg-transparent p-0">
                  {availableTabs.map((tab: TabConfig) => (
                    <TabsTrigger
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

              {/* Check if currentTabConfig and its Component are defined before rendering */}
              {currentTabConfig && currentTabConfig.Component && (
                 <TabsContent value={currentTabConfig.value} className="mt-4">
                   <currentTabConfig.Component />
                 </TabsContent>
              )}


              {availableTabs.length === 1 && availableTabs[0].value === "overview" && !isLoading && issues && issues.length > 0 && (
                 <div className="p-4 mt-4 text-center text-muted-foreground">
                    The fetched data is insufficient for other specific metric tabs. Displaying Overview.
                 </div>
              )}
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
