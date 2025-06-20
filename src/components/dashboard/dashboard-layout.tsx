
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
import { OverviewTab } from './overview-tab';
import { AgileMetricsTab } from './agile-metrics-tab';
import { TeamWorkloadTab } from './team-workload-tab';
import { QualityAnalysisTab } from './quality-analysis-tab';
import { CustomAnalysisTab } from './custom-analysis-tab';
import { AdvancedMetricsTab } from './advanced-metrics-tab';
import { UserWorkloadReportTab } from './user-workload-report-tab';
import { JiraDataProvider, JiraDataContext } from '@/context/JiraDataContext';
import type { JiraIssue } from '@/types/jira';

type TabConfig = {
  value: string;
  label: string;
  Icon: React.ElementType;
  Component: React.ComponentType<any>;
  isDataSufficient?: (issuesArg?: JiraIssue[] | null) => boolean;
};

const ALL_TABS_CONFIG: TabConfig[] = [
  { 
    value: "overview", 
    label: "Overview", 
    Icon: Icons.overview, 
    Component: OverviewTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => !!(issuesArg && issuesArg.length > 0)
  },
  { 
    value: "agile", 
    label: "Agile Metrics", 
    Icon: Icons.agile, 
    Component: AgileMetricsTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => {
      if (!issuesArg || issuesArg.length === 0) return false;
      const hasSprintEffort = issuesArg.some(
        (issue) =>
          issue.sprint?.name &&
          issue.status?.statusCategory?.key === 'done' &&
          ((issue.storyPoints && issue.storyPoints > 0) || (issue.timespent && issue.timespent > 0))
      );
      const hasLeadOrCycleTimeData = issuesArg.some(
        (issue) =>
          issue.status?.statusCategory?.key === 'done' &&
          issue.created &&
          issue.resolutiondate &&
          isValid(parseISO(issue.created)) &&
          isValid(parseISO(issue.resolutiondate!))
      );
      const hasThroughputData = issuesArg.some(
          (issue) => issue.status?.statusCategory?.key === 'done' && issue.resolutiondate && isValid(parseISO(issue.resolutiondate!))
      );
      return hasSprintEffort || hasLeadOrCycleTimeData || hasThroughputData;
    }
  },
  { 
    value: "team", 
    label: "Team Workload", 
    Icon: Icons.team, 
    Component: TeamWorkloadTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => {
      if (!issuesArg || issuesArg.length === 0) return false;
      const hasAssigneeWorkload = issuesArg.some(
        (issue) => issue.status?.statusCategory?.key !== 'done' && issue.assignee?.displayName
      );
      const hasCompletionRateData = issuesArg.some(
        (issue) => issue.status?.statusCategory?.key === 'done' && issue.resolutiondate && isValid(parseISO(issue.resolutiondate!))
      );
      return hasAssigneeWorkload || hasCompletionRateData;
    }
  },
  { 
    value: "quality", 
    label: "Quality Analysis", 
    Icon: Icons.bugTrends, 
    Component: QualityAnalysisTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => {
      if (!issuesArg || issuesArg.length === 0) return false;
      return issuesArg.some((issue) => issue.type?.name?.toLowerCase() === 'bug' && issue.created && isValid(parseISO(issue.created)));
    }
  },
  { 
    value: "custom", 
    label: "Custom Analysis", 
    Icon: Icons.custom, 
    Component: CustomAnalysisTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => !!(issuesArg && issuesArg.length > 0)
  },
  { 
    value: "advanced", 
    label: "Advanced Metrics", 
    Icon: Icons.advanced, 
    Component: AdvancedMetricsTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => {
      if (!issuesArg || issuesArg.length === 0) return false;
      return issuesArg.some(
        (issue) =>
          issue.created &&
          isValid(parseISO(issue.created)) &&
          issue.status?.statusCategory?.key
      );
    }
  },
  { 
    value: "userReport", 
    label: "User Workload", 
    Icon: Icons.userReport, 
    Component: UserWorkloadReportTab,
    isDataSufficient: (issuesArg?: JiraIssue[] | null) => {
      if (!issuesArg || issuesArg.length === 0) return false;
      const hasTimeTracking = issuesArg.some(
        (issue) =>
          (typeof issue.timeoriginalestimate === 'number' && issue.timeoriginalestimate > 0) ||
          (typeof issue.timespent === 'number' && issue.timespent > 0) ||
          (typeof issue.timeestimate === 'number' && issue.timeestimate > 0)
      );
      const hasAssignees = issuesArg.some((issue) => !!issue.assignee);
      return hasTimeTracking || hasAssignees;
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

  const [activeTab, setActiveTab] = useState<string>(availableTabs.length > 0 ? availableTabs[0].value : ALL_TABS_CONFIG[0].value);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    } else if (availableTabs.length === 0 && ALL_TABS_CONFIG.length > 0) {
      // Fallback if no tabs are sufficient, default to the first defined tab (e.g. Overview)
      // This case might mean Overview itself needs data to be shown, handled by its own isDataSufficient
      const defaultTab = ALL_TABS_CONFIG.find(tab => tab.isDataSufficient ? tab.isDataSufficient(issues) : true);
      setActiveTab(defaultTab ? defaultTab.value : ALL_TABS_CONFIG[0].value);
    }
  }, [availableTabs, activeTab, issues]);

  const currentDisplayTabConfig = useMemo(() => {
    return availableTabs.find(tab => tab.value === activeTab) || 
           (ALL_TABS_CONFIG.find(tab => tab.isDataSufficient ? tab.isDataSufficient(issues) : true)) || // Fallback to first available
           ALL_TABS_CONFIG[0]; // Absolute fallback
  }, [activeTab, availableTabs, issues]);
  
  const displayNoDataMessage = !isLoading && (!issues || issues.length === 0 || availableTabs.length === 0);

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
               No Jira issues found or data is insufficient for any tabs. Please fetch issues using the sidebar, or adjust filters.
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap border-b">
                <TabsList className="mb-0 inline-flex h-auto rounded-none border-0 bg-transparent p-0">
                  {availableTabs.map((tab) => (
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
              {availableTabs.map((tab) => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
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
