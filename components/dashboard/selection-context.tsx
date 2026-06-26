'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SelectionContextValue {
  selectedCount: number;
  setSelectedCount: (count: number) => void;
  generateReady: boolean;
  setGenerateReady: (ready: boolean) => void;
  registerGenerate: (fn: (() => Promise<void>) | null) => void;
  runGenerate: () => Promise<void>;
  anomalieCount: number;
  setAnomalieCount: (count: number) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [selectedCount, setCount] = useState(0);
  const [generateReady, setReady] = useState(false);
  const [anomalieCount, setAnomalie] = useState(0);
  const generateRef = useRef<(() => Promise<void>) | null>(null);

  const setSelectedCount = useCallback((count: number) => setCount(count), []);
  const setGenerateReady = useCallback((ready: boolean) => setReady(ready), []);
  const setAnomalieCount = useCallback((count: number) => setAnomalie(count), []);

  const registerGenerate = useCallback((fn: (() => Promise<void>) | null) => {
    generateRef.current = fn;
  }, []);

  const runGenerate = useCallback(async () => {
    if (generateRef.current) await generateRef.current();
  }, []);

  return (
    <SelectionContext.Provider value={{
      selectedCount, setSelectedCount,
      generateReady, setGenerateReady,
      registerGenerate, runGenerate,
      anomalieCount, setAnomalieCount,
    }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    return {
      selectedCount: 0, setSelectedCount: () => {},
      generateReady: false, setGenerateReady: () => {},
      registerGenerate: () => {}, runGenerate: async () => {},
      anomalieCount: 0, setAnomalieCount: () => {},
    };
  }
  return ctx;
}
