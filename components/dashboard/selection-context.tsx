'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SelectionContextValue {
  selectedCount: number;
  setSelectedCount: (count: number) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [selectedCount, setCount] = useState(0);
  const setSelectedCount = useCallback((count: number) => setCount(count), []);

  return (
    <SelectionContext.Provider value={{ selectedCount, setSelectedCount }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    // Outside a provider (e.g. screens without a selectable table): no-op.
    return { selectedCount: 0, setSelectedCount: () => {} };
  }
  return ctx;
}
