export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}

export interface ChangelogChange {
  type: "added" | "changed" | "fixed" | "removed";
  description: string;
}

export type ChangelogData = ChangelogEntry[];
