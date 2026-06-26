'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SelectionContextValue {
  selectedCount: number;
  setSelectedCount: (count: number) => void;
  anomalieCount: number;
  setAnomalieCount: (count: number) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [selectedCount, setCount] = useState(0);
  const [anomalieCount, setAnomalie] = useState(0);
  const setSelectedCount = useCallback((count: number) => setCount(count), []);
  const setAnomalieCount = useCallback((count: number) => setAnomalie(count), []);

  return (
    <SelectionContext.Provider value={{ selectedCount, setSelectedCount, anomalieCount, setAnomalieCount }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    return { selectedCount: 0, setSelectedCount: () => {}, anomalieCount: 0, setAnomalieCount: () => {} };
  }
  return ctx;
}
