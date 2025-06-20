
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

const ALL_TABS_CONFIG = [
  {
    value: "overview",
    label: "Overview",
    Icon: Icons.overview,
    Component: OverviewTab,
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0,
  },
  {
    value: "agile",
    label: "Agile Metrics",
    Icon: Icons.agile,
    Component: AgileMetricsTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i =>
        (i.sprint && (i.storyPoints || i.timespent)) || // Story points or time spent for velocity
        (i.status?.statusCategory?.key === 'done' && i.created && i.resolutiondate) || // For lead/cycle time
        (i.resolutiondate && i.status?.statusCategory?.key === 'done') // For throughput
    ),
  },
  {
    value: "team",
    label: "Team Workload",
    Icon: Icons.team,
    Component: TeamWorkloadTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i =>
        (i.assignee && i.status?.statusCategory?.key !== 'done') || // Open issues by assignee
        (i.status?.statusCategory?.key === 'done' && i.resolutiondate) // For completion rate
    ),
  },
  {
    value: "quality",
    label: "Quality Analysis",
    Icon: Icons.bugTrends, // Corrected icon
    Component: QualityAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.type?.name?.toLowerCase() === 'bug' && (i.created || i.resolutiondate)),
  },
  {
    value: "custom",
    label: "Custom Analysis",
    Icon: Icons.custom,
    Component: CustomAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0,
  },
  {
    value: "advanced",
    label: "Advanced Metrics",
    Icon: Icons.advanced,
    Component: AdvancedMetricsTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.created && i.status && i.status.statusCategory),
  },
  {
    value: "userReport",
    label: "User Workload",
    Icon: Icons.userReport,
    Component: UserWorkloadReportTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.assignee && (i.timeoriginalestimate || i.timespent || i.timeestimate)),
  },
];

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not available.</div>;
  }
  const { issues, isLoading, error } = context;

  const availableTabs = useMemo(() => {
    if (isLoading && (!issues || issues.length === 0)) {
        return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    if (!issues || issues.length === 0) {
      // If no issues, only "Overview" (if it deems itself sufficient, which it does for empty arrays)
      // and "Custom Analysis" (also generally available) might be shown.
      // Or more simply, always show overview if no issues.
      return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    return ALL_TABS_CONFIG.filter(tab => tab.isDataSufficient(issues));
  }, [issues, isLoading]);

  // Start with 'overview' and let useEffect adjust if needed
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    const currentTabIsInAvailableList = availableTabs.some(tab => tab.value === activeTab);

    if (availableTabs.length > 0) {
      if (!currentTabIsInAvailableList) {
        // If current activeTab is no longer sufficient or not in the list,
        // switch to the first available tab.
        setActiveTab(availableTabs[0].value);
      }
      // If current activeTab is still in the list, no change needed.
    } else if (ALL_TABS_CONFIG.length > 0) {
      // This case means `availableTabs` is empty. This could happen if `issues` array is empty
      // and only "overview" was filtered in `availableTabs` but somehow its `isSufficient` failed.
      // Or if ALL_TABS_CONFIG itself was empty (which is an app config error).
      // Fallback to the first tab in the master list if the current active one isn't it.
      if (activeTab !== ALL_TABS_CONFIG[0].value) {
          setActiveTab(ALL_TABS_CONFIG[0].value);
      }
    }
    // If availableTabs is empty AND ALL_TABS_CONFIG is empty, activeTab remains,
    // though rendering will likely show "No tabs configured".
  }, [availableTabs, activeTab]);

  const currentTabConfig = useMemo(() => {
    let config = availableTabs.find(tab => tab.value === activeTab);

    if (!config) {
      if (availableTabs.length > 0) {
        config = availableTabs[0];
      } else if (ALL_TABS_CONFIG.length > 0) {
        config = ALL_TABS_CONFIG[0]; // Default to the first tab in the master list
      } else {
        // Absolute fallback if ALL_TABS_CONFIG is somehow empty
        return {
          value: "error_fallback",
          label: "Error",
          Icon: Icons.alertTriangle,
          Component: () => <div className="p-4 text-center">No tabs configured.</div>,
          isDataSufficient: () => true, // Make it always renderable
        };
      }
    }
    return config;
  }, [activeTab, availableTabs]);
  
  // Defensive check, though the logic above should always provide a config if ALL_TABS_CONFIG is not empty.
  if (!currentTabConfig) {
     return <div className="p-4 text-red-500">Error: Could not determine current tab configuration. (Defensive Fallback)</div>;
  }

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
              {currentTabConfig.label || "JiraViz Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading && (!issues || issues.length === 0) ? (
            <div className="flex justify-center items-center h-full">
              <Icons.loader className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Fetching Jira data...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap border-b">
                <TabsList className="mb-0 inline-flex h-auto rounded-none border-0 bg-transparent p-0">
                  {availableTabs.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-shrink-0 h-10 px-3 py-2 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                    >
                      <tab.Icon className={`mr-2 h-4 w-4 ${sidebarState === 'collapsed' ? 'md:mr-0' : 'md:mr-2'}`} />
                      <span className={`${sidebarState === 'collapsed' ? 'md:hidden' : ''}`}>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                  {/* Fallback to show at least the 'Overview' tab if availableTabs somehow became empty but ALL_TABS_CONFIG exists */}
                  {availableTabs.length === 0 && ALL_TABS_CONFIG.length > 0 && (
                     <TabsTrigger
                      key={ALL_TABS_CONFIG[0].value}
                      value={ALL_TABS_CONFIG[0].value}
                      className="flex-shrink-0 h-10 px-3 py-2 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                    >
                      <ALL_TABS_CONFIG[0].Icon className={`mr-2 h-4 w-4 ${sidebarState === 'collapsed' ? 'md:mr-0' : 'md:mr-2'}`} />
                      <span className={`${sidebarState === 'collapsed' ? 'md:hidden' : ''}`}>{ALL_TABS_CONFIG[0].label}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </ScrollArea>

              {/* Render the content for the currently determined tab config */}
              <TabsContent value={currentTabConfig.value} className="mt-4">
                 <currentTabConfig.Component />
              </TabsContent>
              
              {/* Messages for data states */}
              {availableTabs.length === 0 && !isLoading && issues && issues.length > 0 && (
                 <div className="p-4 mt-4 text-center text-muted-foreground">
                    The fetched data is insufficient for specific metric tabs. Displaying Overview.
                 </div>
              )}
               {availableTabs.length === 0 && !isLoading && (!issues || issues.length === 0) && !error &&(
                 <div className="p-4 mt-4 text-center text-muted-foreground">
                    No data available. Please fetch issues using the sidebar.
                 </div>
              )}
              {error && (
                <div className="p-4 mt-4 text-center text-red-500">
                    Error fetching data: {error}
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
