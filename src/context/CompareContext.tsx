// src/context/CompareContext.tsx
// Story #19: the set of study locations the user has picked to compare.
// Holds ids only; the compare screen loads the data. Lives in memory for the session.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Three columns is the most that stays readable side by side on a phone. */
export const MAX_COMPARE = 3;

export type CompareToggleResult = 'added' | 'removed' | 'full';

interface CompareContextType {
  ids: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => CompareToggleResult;
  remove: (id: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextType>({
  ids: [],
  isSelected: () => false,
  toggle: () => 'full',
  remove: () => {},
  clear: () => {},
});

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const isSelected = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string): CompareToggleResult => {
      if (ids.includes(id)) {
        setIds((current) => current.filter((existing) => existing !== id));
        return 'removed';
      }
      if (ids.length >= MAX_COMPARE) return 'full';
      setIds((current) => [...current, id]);
      return 'added';
    },
    [ids],
  );

  const remove = useCallback((id: string) => {
    setIds((current) => current.filter((existing) => existing !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({ ids, isSelected, toggle, remove, clear }),
    [ids, isSelected, toggle, remove, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
