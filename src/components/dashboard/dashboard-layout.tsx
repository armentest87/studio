
"use client";

import React, { useContext, useMemo, useEffect } from 'react';
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
  { value: "overview", label: "Overview", Icon: Icons.overview, Component: OverviewTab,
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0 },
  { value: "agile", label: "Agile Metrics", Icon: Icons.agile, Component: AgileMetricsTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.sprint || i.storyPoints || i.customfield_12326 || i.timespent || (i.status?.statusCategory?.key === 'done' && i.resolutiondate)) },
  { value: "team", label: "Team Workload", Icon: Icons.team, Component: TeamWorkloadTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.assignee && i.status?.statusCategory) },
  { value: "quality", label: "Quality Analysis", Icon: Icons.quality, Component: QualityAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.type?.name?.toLowerCase() === 'bug') },
  { value: "custom", label: "Custom Analysis", Icon: Icons.custom, Component: CustomAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0 },
  { value: "advanced", label: "Advanced Metrics", Icon: Icons.advanced, Component: AdvancedMetricsTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.created && i.status && i.resolutiondate) }, // CFD needs created, status, resolution
  { value: "userReport", label: "User Workload", Icon: Icons.userReport, Component: UserWorkloadReportTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.assignee && (i.timeoriginalestimate || i.timespent)) },
];

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);
  
  if (!context) {
    // This should not happen if used within JiraDataProvider
    return <div className="p-4 text-red-500">Error: JiraDataContext not available.</div>;
  }
  const { issues, isLoading } = context;

  const availableTabs = useMemo(() => {
    // If loading, show all tabs potentially, or a loading state for tabs. For now, filter based on current (possibly empty) issues.
    // If no issues at all (initial state or after failed fetch), only show Overview.
    if (!issues || issues.length === 0) {
      return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    return ALL_TABS_CONFIG.filter(tab => tab.isDataSufficient(issues));
  }, [issues]);

  const [activeTab, setActiveTab] = React.useState(availableTabs.length > 0 ? availableTabs[0].value : ALL_TABS_CONFIG[0].value);

  useEffect(() => {
    // If the active tab is no longer in the available tabs, reset to the first available one.
    if (availableTabs.length > 0 && !availableTabs.find(t => t.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    } else if (availableTabs.length === 0 && ALL_TABS_CONFIG.length > 0) {
      // Fallback if all tabs get filtered out (e.g. no issues at all, and overview also filtered)
      // This case should be rare given current logic for overview.
      setActiveTab(ALL_TABS_CONFIG[0].value); 
    }
  }, [availableTabs, activeTab]);
  
  const currentTabConfig = ALL_TABS_CONFIG.find(tab => tab.value === activeTab) || (availableTabs.length > 0 ? availableTabs[0] : ALL_TABS_CONFIG[0]);

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
              {currentTabConfig?.label || "Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading && availableTabs.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Icons.loader className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : availableTabs.length > 0 ? (
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
              {availableTabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  <tab.Component />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              {isLoading ? 'Loading data...' : 'No data available to display any metrics. Please fetch issues with relevant data.'}
            </div>
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
