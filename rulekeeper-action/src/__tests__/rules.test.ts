import { describe, it, expect } from "vitest";
import { evaluateMaxLinesChanged, evaluateRequireScreenshot, evaluateRequireTicket } from "../../src/rules.js";

describe("rules.max_lines_changed", () => {
  const files = [
    { filename: "ui/Settings.tsx", status: "modified", additions: 480, deletions: 35 },
    { filename: "ui/Toggle.tsx", status: "modified", additions: 50, deletions: 5 },
    { filename: "api/user.ts", status: "modified", additions: 20, deletions: 10 }
  ];

  it("passes when total <= limit", () => {
    const r = evaluateMaxLinesChanged({ type: "max_lines_changed", limit: 600 }, files);
    expect(r.ok).toBe(true);
  });

  it("fails when total > limit and shows top offenders", () => {
    const r = evaluateMaxLinesChanged({ type: "max_lines_changed", limit: 300 }, files);
    expect(r.ok).toBe(false);
    expect(r.details.join("\n")).toContain("Top offenders");
    expect(r.details.join("\n")).toContain("ui/Settings.tsx");
  });

  it("respects includePaths", () => {
    const r = evaluateMaxLinesChanged({ type: "max_lines_changed", limit: 300, includePaths: ["ui/**"] }, files);
    expect(r.ok).toBe(false);
  });
});

describe("rules.require_ticket", () => {
  it("passes with match in title", () => {
    const r = evaluateRequireTicket({ type: "require_ticket", pattern: "PROJ-\\\d+" }, {
      title: "PROJ-123: settings redesign",
      branch: "feature/no-ticket",
      body: ""
    });
    expect(r.ok).toBe(true);
  });
  it("passes with match in branch", () => {
    const r = evaluateRequireTicket({ type: "require_ticket", pattern: "PROJ-\\\d+" }, {
      title: "no ticket here",
      branch: "feature/PROJ-123-settings-redesign",
      body: ""
    });
    expect(r.ok).toBe(true);
  });
  it("fails when neither matches", () => {
    const r = evaluateRequireTicket({ type: "require_ticket", pattern: "PROJ-\\\d+" }, {
      title: "no",
      branch: "no",
      body: ""
    });
    expect(r.ok).toBe(false);
  });
});

describe("rules.require_screenshot", () => {
  const files = [
    { filename: "ui/Settings.tsx", status: "modified", additions: 480, deletions: 35 },
    { filename: "api/user.ts", status: "modified", additions: 20, deletions: 10 }
  ];
  it("no UI change → pass", () => {
    const r = evaluateRequireScreenshot({ type: "require_screenshot", whenPaths: ["docs/**"] }, {
      title: "",
      branch: "",
      body: ""
    }, files);
    expect(r.ok).toBe(true);
  });
  it("UI change + markdown image → pass", () => {
    const r = evaluateRequireScreenshot({ type: "require_screenshot", whenPaths: ["ui/**"] }, {
      title: "",
      branch: "",
      body: "Look: ![shot](https://example.com/screen.png)"
    }, files);
    expect(r.ok).toBe(true);
  });
  it("UI change + direct link → pass", () => {
    const r = evaluateRequireScreenshot({ type: "require_screenshot", whenPaths: ["ui/**"] }, {
      title: "",
      branch: "",
      body: "https://example.com/demo.mp4"
    }, files);
    expect(r.ok).toBe(true);
  });
  it("UI change + no media → fail", () => {
    const r = evaluateRequireScreenshot({ type: "require_screenshot", whenPaths: ["ui/**"] }, {
      title: "",
      branch: "",
      body: "no media"
    }, files);
    expect(r.ok).toBe(false);
  });
});
