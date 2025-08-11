import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig, sampleConfig } from "./config.js";
import { listAllChangedFiles, requirePullRequestContext } from "./github.js";
import { runRules } from "./rules.js";

async function main() {
  try {
    const payload = github.context.payload;
    if (!payload.pull_request) {
      core.setFailed("RuleKeeper: this action only runs on pull_request events.");
      return;
    }

    const configPath = core.getInput("config") || ".github/rulekeeper.yml";
    const cfgRes = await loadConfig(configPath);
    if (!cfgRes.ok || !cfgRes.value) {
      for (const err of cfgRes.errors) core.error(err);
      const summary = core.summary;
      await summary
        .addHeading("RuleKeeper")
        .addCodeBlock(cfgRes.errors.join("\n\n") + (cfgRes.errors.length === 0 ? sampleConfig() : ""))
        .write();
      core.setFailed("RuleKeeper: invalid or missing config");
      return;
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.setFailed("RuleKeeper: GITHUB_TOKEN not provided in env.");
      return;
    }

    const { owner, repo, pull_number, title, branch, body } = requirePullRequestContext();
    const octokit = github.getOctokit(token);
    let files;
    try {
      files = await listAllChangedFiles(octokit, { owner, repo, pull_number });
    } catch (e: any) {
      core.setFailed(
        `RuleKeeper: failed to fetch PR files. Ensure the workflow has pull-requests: read permission. ${e?.message ?? e}`
      );
      return;
    }

    const ctx = { title, branch, body };
    const results = runRules(cfgRes.value.rules, ctx, files);
    const anyFail = results.some((r) => !r.ok);
    const summary = core.summary;
    await summary.addHeading("RuleKeeper");

    if (cfgRes.warnings.length > 0) {
      await summary.addRaw(`\n> Warnings:\n`);
      for (const w of cfgRes.warnings) {
        await summary.addRaw(`\n- ${w}`);
      }
      await summary.addRaw("\n\n");
    }

    await summary.addRaw("\n| Rule | Result | Details |\n");
    await summary.addRaw("\n|--------------------------|--------|-----------------------------------------------------------|\n");

    for (const r of results) {
      const resultIcon = r.ok ? "✅" : "❌";
      const [first, ...rest] = r.details;
      await summary.addRaw(`\n| ${escapePipes(r.name).padEnd(26)} | ${resultIcon}     | ${escapePipes(first)} |`);
      for (const d of rest) {
        await summary.addRaw(`\n|                          |        | ${escapePipes(d)} |`);
      }
    }

    await summary.addRaw("\n\n");
    await summary.write();

    if (anyFail) {
      core.setFailed("RuleKeeper checks failed");
    }
  } catch (e: any) {
    core.setFailed(`RuleKeeper crashed: ${e?.message ?? String(e)}`);
  }
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|");
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
