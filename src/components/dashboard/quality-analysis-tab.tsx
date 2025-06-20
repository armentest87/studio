
"use client";
// This file's functionality might be covered by "General Info" (if bugs are a type) or "Incident & Risk Mgmt".
// It can be deleted. Keeping as a stub for now.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QualityAnalysisTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Analysis (Legacy)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Bug trends and quality metrics might be integrated into other tabs like "General Info" or "Incident & Risk Mgmt" based on the new specification.</p>
      </CardContent>
    </Card>
  );
}
