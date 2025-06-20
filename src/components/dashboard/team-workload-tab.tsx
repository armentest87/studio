
"use client";
// This file's functionality is largely covered by the new "User & Role Mgmt" tab.
// It can be deleted. Keeping as a stub for now.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TeamWorkloadTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Workload (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Relevant metrics like 'Issues per Assignee' are now part of the "User & Role Mgmt" tab.</p>
      </CardContent>
    </Card>
  );
}
