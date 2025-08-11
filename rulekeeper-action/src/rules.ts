import { minimatch } from "minimatch";
import type {
  AnyRule,
  MaxLinesChangedRule,
  PRContextInfo,
  PRFile,
  RequireScreenshotRule,
  RequireTicketRule,
  RuleResult
} from "./types.js";

const MM_OPTS = { dot: true, nocase: false } as const;

function pathMatches(globs: string[] | undefined, file: string): boolean {
  if (!globs || globs.length === 0) return true; // no filter → include all
  return globs.some((g) => minimatch(file, g, MM_OPTS));
}

export function evaluateMaxLinesChanged(rule: MaxLinesChangedRule, files: PRFile[]): RuleResult {
  const included = files.filter((f) => pathMatches(rule.includePaths, f.filename));
  const totals = included.map((f) => ({
    path: f.filename,
    adds: f.additions || 0,
    dels: f.deletions || 0,
    delta: (f.additions || 0) + (f.deletions || 0)
  }));
  const totalDelta = totals.reduce((acc, t) => acc + t.delta, 0);
  const ok = totalDelta <= rule.limit;

  const details: string[] = [
    `Δ lines (${totalDelta}) ${ok ? "within" : "exceeds"} budget (${rule.limit}).`
  ];

  if (!ok && totals.length > 0) {
    const top = [...totals].sort((a, b) => b.delta - a.delta).slice(0, 5);
    details.push("Top offenders:");
    for (const t of top) {
      details.push(`- \`${t.path}\` (+${t.adds}/−${t.dels})`);
    }
  }

  return {
    ok,
    rule,
    name: `max_lines_changed (${rule.limit})`,
    details
  };
}

export function evaluateRequireTicket(rule: RequireTicketRule, ctx: PRContextInfo): RuleResult {
  const re = new RegExp(rule.pattern, "i");
  const inTitle = re.test(ctx.title || "");
  const inBranch = re.test(ctx.branch || "");
  const ok = inTitle || inBranch;
  const details = ok
    ? ["Ticket found in title/branch."]
    : [`Missing ticket (pattern: ${rule.pattern}) in PR title or branch.`];

  return { ok, rule, name: "require_ticket", details };
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)]+\.(png|jpg|jpeg|gif))\)/i;
const DIRECT_LINK_RE = /(https?:\/\/\S+\.(png|jpg|jpeg|gif|mp4))/i;

export function evaluateRequireScreenshot(
  rule: RequireScreenshotRule,
  ctx: PRContextInfo,
  files: PRFile[]
): RuleResult {
  const changedPaths = files.map((f) => f.filename);
  const uiChanged = changedPaths.some((p) => pathMatches(rule.whenPaths, p));
  if (!uiChanged) {
    return { ok: true, rule, name: "require_screenshot", details: ["No UI changes detected."] };
  }

  const body = ctx.body || "";
  const ok = MARKDOWN_IMAGE_RE.test(body) || DIRECT_LINK_RE.test(body);
  const details = ok
    ? ["Screenshot/video found in description."]
    : ["UI changed but no screenshot/video found in PR description."];
  return { ok, rule, name: "require_screenshot", details };
}

export function runRules(rules: AnyRule[], ctx: PRContextInfo, files: PRFile[]): RuleResult[] {
  return rules.map((r) => {
    switch (r.type) {
      case "max_lines_changed":
        return evaluateMaxLinesChanged(r, files);
      case "require_ticket":
        return evaluateRequireTicket(r, ctx);
      case "require_screenshot":
        return evaluateRequireScreenshot(r, ctx, files);
    }
  });
}
