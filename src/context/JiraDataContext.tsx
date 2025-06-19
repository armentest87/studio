
"use client";

import type { JiraIssue } from '@/types/jira';
import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface JiraDataContextType {
  issues: JiraIssue[];
  setIssues: Dispatch<SetStateAction<JiraIssue[]>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
}

export const JiraDataContext = createContext<JiraDataContextType | undefined>(undefined);

interface JiraDataProviderProps {
  children: ReactNode;
}

export const JiraDataProvider: React.FC<JiraDataProviderProps> = ({ children }) => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <JiraDataContext.Provider value={{ issues, setIssues, isLoading, setIsLoading, error, setError }}>
      {children}
    </JiraDataContext.Provider>
  );
};
