
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
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0
  },
  {
    value: "agile",
    label: "Agile Metrics",
    Icon: Icons.agile,
    Component: AgileMetricsTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i =>
        (i.sprint && (i.storyPoints || i.timespent)) || 
        (i.status?.statusCategory?.key === 'done' && i.created && i.resolutiondate) 
    )
  },
  {
    value: "team",
    label: "Team Workload",
    Icon: Icons.team,
    Component: TeamWorkloadTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i =>
        (i.assignee && i.status?.statusCategory?.key !== 'done') || 
        (i.status?.statusCategory?.key === 'done' && i.resolutiondate) 
    )
  },
  {
    value: "quality",
    label: "Quality Analysis",
    Icon: Icons.bugTrends,
    Component: QualityAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.type?.name?.toLowerCase() === 'bug' && (i.created || i.resolutiondate))
  },
  {
    value: "custom",
    label: "Custom Analysis",
    Icon: Icons.custom,
    Component: CustomAnalysisTab,
    isDataSufficient: (issues: JiraIssue[]) => issues && issues.length > 0
  },
  {
    value: "advanced",
    label: "Advanced Metrics",
    Icon: Icons.advanced,
    Component: AdvancedMetricsTab, 
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.created && i.status)
  },
  {
    value: "userReport",
    label: "User Workload",
    Icon: Icons.userReport,
    Component: UserWorkloadReportTab,
    isDataSufficient: (issues: JiraIssue[]) => issues.some(i => i.assignee && (i.timeoriginalestimate || i.timespent || i.timeestimate))
  },
];

function DashboardContent() {
  const { state: sidebarState } = useSidebar();
  const context = useContext(JiraDataContext);

  if (!context) {
    return <div className="p-4 text-red-500">Error: JiraDataContext not available.</div>;
  }
  const { issues, isLoading } = context;

  const availableTabs = useMemo(() => {
    if (isLoading && (!issues || issues.length === 0)) {
        return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    if (!issues || issues.length === 0) {
      return ALL_TABS_CONFIG.filter(tab => tab.value === "overview");
    }
    return ALL_TABS_CONFIG.filter(tab => tab.isDataSufficient(issues));
  }, [issues, isLoading]);

  const [activeTab, setActiveTab] = useState(ALL_TABS_CONFIG[0].value);

  useEffect(() => {
    const activeTabIsAvailable = availableTabs.some(t => t.value === activeTab);

    if (availableTabs.length > 0) {
      if (!activeTabIsAvailable) {
        setActiveTab(availableTabs[0].value);
      }
    } else if (ALL_TABS_CONFIG.length > 0) { 
        if (activeTab !== ALL_TABS_CONFIG[0].value) {
            setActiveTab(ALL_TABS_CONFIG[0].value);
        }
    }
  }, [availableTabs, activeTab, issues]);


  const currentTabConfig = useMemo(() => {
    // Try to find the active tab in the list of currently available tabs
    let config = availableTabs.find(tab => tab.value === activeTab);
  
    // If not found in available (e.g., data changed and tab became unavailable),
    // try to find it in the full list of all configured tabs.
    if (!config) {
      config = ALL_TABS_CONFIG.find(tab => tab.value === activeTab);
    }
  
    // If still not found (e.g. activeTab was some invalid value),
    // default to the first available tab if there are any.
    if (!config && availableTabs.length > 0) {
      config = availableTabs[0];
    }
  
    // As an ultimate fallback, default to the first tab in the overall configuration.
    // This ensures 'config' is always an object from ALL_TABS_CONFIG.
    return config || ALL_TABS_CONFIG[0];
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
              {currentTabConfig?.label || "JiraViz Dashboard"}
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
                  {/* If no tabs are available due to data insufficiency, show the default tab (Overview) */}
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
              
              {availableTabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  {/* Ensure that the activeTab is indeed the one we are rendering, or it's the only one */}
                  {activeTab === tab.value || availableTabs.length === 1 ? <tab.Component /> : null}
                </TabsContent>
              ))}

              {/* Fallback if activeTab is somehow not in availableTabs or no tabs are available */}
              {(!availableTabs.find(t => t.value === activeTab) || availableTabs.length === 0) && ALL_TABS_CONFIG.length > 0 && (
                <TabsContent key={ALL_TABS_CONFIG[0].value} value={ALL_TABS_CONFIG[0].value} className="mt-4">
                    <ALL_TABS_CONFIG[0].Component />
                </TabsContent>
              )}

              {availableTabs.length === 0 && !isLoading && issues && issues.length > 0 && (
                 <div className="p-4 text-center text-muted-foreground">
                    The fetched data is insufficient for any specific metric tabs. Displaying Overview.
                 </div>
              )}
               {availableTabs.length === 0 && !isLoading && (!issues || issues.length === 0) && (
                 <div className="p-4 text-center text-muted-foreground">
                    No data available. Please fetch issues using the sidebar.
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
