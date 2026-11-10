import { createContext } from 'react';

/** Lets a cell move the grid cursor to the next cell after it commits. */
export const GridNavContext = createContext<(row: number, col: number) => void>(
  () => undefined,
);
