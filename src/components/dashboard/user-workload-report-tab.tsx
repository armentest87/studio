
"use client";
// This file's functionality is covered by "User & Role Mgmt" and "Time Tracking" tabs.
// It can be deleted. Keeping as a stub for now.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserWorkloadReportTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Workload Report (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">User workload and time tracking are now primarily covered in the "User & Role Mgmt" and "Time Tracking" tabs.</p>
      </CardContent>
    </Card>
  );
}
