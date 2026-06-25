'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SelectionContextValue {
  selectedCount: number;
  setSelectedCount: (count: number) => void;
  registerGenerate: (fn: (() => Promise<void>) | null) => void;
  runGenerate: () => Promise<void>;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [selectedCount, setCount] = useState(0);
  const generateRef = useRef<(() => Promise<void>) | null>(null);

  const setSelectedCount = useCallback((count: number) => setCount(count), []);

  const registerGenerate = useCallback((fn: (() => Promise<void>) | null) => {
    generateRef.current = fn;
  }, []);

  const runGenerate = useCallback(async () => {
    if (generateRef.current) {
      await generateRef.current();
    }
  }, []);

  return (
    <SelectionContext.Provider value={{ selectedCount, setSelectedCount, registerGenerate, runGenerate }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    // Outside a provider (e.g. screens without a selectable table): no-op.
    return {
      selectedCount: 0,
      setSelectedCount: () => {},
      registerGenerate: () => {},
      runGenerate: async () => {},
    };
  }
  return ctx;
}
