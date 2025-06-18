
"use client";

import React from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';

import { JiraSidebarContent } from './sidebar-content'; // Updated import
import { OverviewTab } from './overview-tab';
import { AgileMetricsTab } from './agile-metrics-tab';
import { TeamWorkloadTab } from './team-workload-tab';
import { QualityAnalysisTab } from './quality-analysis-tab';
import { CustomAnalysisTab } from './custom-analysis-tab';
import { AdvancedMetricsTab } from './advanced-metrics-tab';
import { UserWorkloadReportTab } from './user-workload-report-tab';

const TABS_CONFIG = [
  { value: "overview", label: "Overview", Icon: Icons.overview, Component: OverviewTab },
  { value: "agile", label: "Agile Metrics", Icon: Icons.agile, Component: AgileMetricsTab },
  { value: "team", label: "Team Workload", Icon: Icons.team, Component: TeamWorkloadTab },
  { value: "quality", label: "Quality Analysis", Icon: Icons.quality, Component: QualityAnalysisTab },
  { value: "custom", label: "Custom Analysis", Icon: Icons.custom, Component: CustomAnalysisTab },
  { value: "advanced", label: "Advanced Metrics", Icon: Icons.advanced, Component: AdvancedMetricsTab },
  { value: "userReport", label: "User Workload", Icon: Icons.userReport, Component: UserWorkloadReportTab },
];

export function DashboardLayout() {
  const { state: sidebarState } = useSidebar();
  const [activeTab, setActiveTab] = React.useState(TABS_CONFIG[0].value);

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
              {TABS_CONFIG.find(tab => tab.value === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          {/* Add any header actions here if needed */}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Tabs defaultValue={TABS_CONFIG[0].value} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="mb-4 inline-flex h-auto">
                {TABS_CONFIG.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0 px-3 py-2 data-[state=active]:shadow-md">
                    <tab.Icon className={`mr-2 h-4 w-4 ${sidebarState === 'collapsed' ? 'md:mr-0' : 'md:mr-2'}`} />
                    <span className={`${sidebarState === 'collapsed' ? 'md:hidden' : ''}`}>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {TABS_CONFIG.map(tab => (
              <TabsContent key={tab.value} value={tab.value}>
                <tab.Component />
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}
