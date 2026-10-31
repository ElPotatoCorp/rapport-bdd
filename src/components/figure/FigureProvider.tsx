import { createContext, useContext, useRef, type ReactNode } from 'react';

type FigureContextValue = {
  getNextNumber: () => number;
};

const FigureContext = createContext<FigureContextValue | null>(null);

export function FigureProvider({ children }: { children: ReactNode }) {
  const counter = useRef(0);

  const value = useRef<FigureContextValue>({
    getNextNumber: () => {
      counter.current += 1;
      return counter.current;
    },
  }).current;

  return <FigureContext.Provider value={value}>{children}</FigureContext.Provider>;
}

export function useFigureNumber() {
  const context = useContext(FigureContext);

  if (!context) {
    throw new Error('Figure must be used inside a FigureProvider');
  }

  const number = useRef<number | null>(null);

  if (number.current === null) {
    number.current = context.getNextNumber();
  }

  return number.current;
}
