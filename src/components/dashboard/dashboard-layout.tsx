
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
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean => !!issues,
  },
  {
    value: "agile",
    label: "Agile Metrics",
    Icon: Icons.agile,
    Component: AgileMetricsTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean =>
      !!issues && issues.some(i =>
        (i.sprint && (i.storyPoints || i.timespent)) ||
        (i.status?.statusCategory?.key === 'done' && i.created && i.resolutiondate) ||
        (i.resolutiondate && i.status?.statusCategory?.key === 'done')
    ),
  },
  {
    value: "team",
    label: "Team Workload",
    Icon: Icons.team,
    Component: TeamWorkloadTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean =>
      !!issues && issues.some(i =>
        (i.assignee && i.status?.statusCategory?.key !== 'done') ||
        (i.status?.statusCategory?.key === 'done' && i.resolutiondate)
    ),
  },
  {
    value: "quality",
    label: "Quality Analysis",
    Icon: Icons.bugTrends, // Corrected icon
    Component: QualityAnalysisTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean =>
      !!issues && issues.some(i => i.type?.name?.toLowerCase() === 'bug' && (i.created || i.resolutiondate)),
  },
  {
    value: "custom",
    label: "Custom Analysis",
    Icon: Icons.custom,
    Component: CustomAnalysisTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean => !!issues && issues.length > 0,
  },
  {
    value: "advanced",
    label: "Advanced Metrics", // CFD
    Icon: Icons.advanced,
    Component: AdvancedMetricsTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean =>
      !!issues && issues.some(i => i.created && i.status && i.status.statusCategory),
  },
  {
    value: "userReport",
    label: "User Workload",
    Icon: Icons.userReport,
    Component: UserWorkloadReportTab,
    isDataSufficient: (issues: JiraIssue[] | null | undefined): boolean =>
      !!issues && issues.some(i => i.assignee && (i.timeoriginalestimate || i.timespent || i.timeestimate)),
  },
];

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);

  if (!context) {
    console.error("JiraDataContext not available in DashboardContent.");
    return <div className="p-4 text-red-500">Critical Error: JiraDataContext not available.</div>;
  }
  const { issues, isLoading, error } = context;

  const [activeTab, setActiveTab] = useState<string>(ALL_TABS_CONFIG[0].value);

  const availableTabs = useMemo(() => {
    if (isLoading && (!issues || issues.length === 0)) { // Show only overview while initial loading
      return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    if (!issues || issues.length === 0) { // If no issues after load, show only overview
      return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    const dataSufficientTabs = ALL_TABS_CONFIG.filter(tab => tab.isDataSufficient(issues));
    if (dataSufficientTabs.length > 0) {
      return dataSufficientTabs;
    }
    return ALL_TABS_CONFIG.filter(tab => tab.value === "overview"); // Fallback to overview if no specific tabs are sufficient
  }, [issues, isLoading]);

  useEffect(() => {
    if (!availableTabs.some(tab => tab.value === activeTab)) {
      setActiveTab(availableTabs.length > 0 ? availableTabs[0].value : ALL_TABS_CONFIG[0].value);
    }
  }, [availableTabs, activeTab, setActiveTab]);

  const currentTabConfig = useMemo(() => {
    const foundTab = availableTabs.find(tab => tab.value === activeTab);
    if (foundTab) {
      return foundTab;
    }
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
            <div className="p-4 mt-4 text-center text-destructive">
                Error fetching data: {error}
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
                 No Jira issues found. Please fetch issues using the sidebar.
               </div>
            </Tabs>
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
                </TabsList>
              </ScrollArea>
              
              <TabsContent value={currentTabConfig.value} className="mt-4">
                <currentTabConfig.Component />
              </TabsContent>
              
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
