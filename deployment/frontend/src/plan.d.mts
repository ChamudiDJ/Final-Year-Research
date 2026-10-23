import type { Result } from "./types";
export function buildSupportPlan(input: {
  choice: string;
  action: string;
  opening: string;
  steps: { done: boolean; label: string }[];
  result: Result;
  includeScores?: boolean;
}): string;
