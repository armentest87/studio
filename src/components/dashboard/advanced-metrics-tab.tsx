
"use client";
// CFD and other advanced metrics are not part of the new specification.
// This file can be deleted. Keeping as a stub for now.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdvancedMetricsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Metrics (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Metrics like Cumulative Flow Diagrams (CFD) are not included in the current dashboard specification.</p>
      </CardContent>
    </Card>
  );
}
