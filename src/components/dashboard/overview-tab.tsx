
"use client";
// This file is effectively replaced by general-info-tab.tsx
// You can delete this file if general-info-tab.tsx serves as the new overview.
// For now, keeping it as a stub to avoid breaking existing imports if any, though dashboard-layout.tsx won't use it.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OverviewTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">This tab has been replaced by the "General Info" tab with the new dashboard structure.</p>
        <p className="text-muted-foreground">Please refer to the "General Info" tab for an overview of Jira issues.</p>
      </CardContent>
    </Card>
  );
}
