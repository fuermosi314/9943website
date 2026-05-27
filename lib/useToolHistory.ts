'use client';

import { useEffect } from 'react';
import { addToolHistory } from './storage';

export function useToolHistory(toolId: string) {
  useEffect(() => {
    addToolHistory(toolId);
  }, [toolId]);
}
