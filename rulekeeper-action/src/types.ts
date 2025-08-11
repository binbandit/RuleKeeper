export type RuleType = "max_lines_changed" | "require_ticket" | "require_screenshot";

export interface BaseRule {
  type: RuleType;
}

export interface MaxLinesChangedRule extends BaseRule {
  type: "max_lines_changed";
  limit: number;
  includePaths?: string[];
}

export interface RequireTicketRule extends BaseRule {
  type: "require_ticket";
  pattern: string;
}

export interface RequireScreenshotRule extends BaseRule {
  type: "require_screenshot";
  whenPaths: string[];
}

export type AnyRule = MaxLinesChangedRule | RequireTicketRule | RequireScreenshotRule;

export interface Config {
  rules: AnyRule[];
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
  warnings: string[];
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface RuleResult {
  ok: boolean;
  rule: AnyRule;
  name: string;
  details: string[]; // multiple lines of details to render under the table cell
}

export interface PRContextInfo {
  title: string;
  branch: string; // head ref
  body: string | null | undefined;
}
