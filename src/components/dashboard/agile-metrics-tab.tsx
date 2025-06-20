
"use client";
// This file's functionality has been distributed or is not part of the new spec.
// It can be deleted. Keeping as a stub for now.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AgileMetricsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agile Metrics (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">The content of this tab has been re-evaluated based on the new dashboard specification.</p>
        <p className="text-muted-foreground">Relevant metrics might be found in "Time Tracking", "Project & Task Mgmt", or other new tabs.</p>
      </CardContent>
    </Card>
  );
}
