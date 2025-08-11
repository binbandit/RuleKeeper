import * as github from "@actions/github";
import type { PRFile } from "./types.js";

export function requirePullRequestContext(): {
  owner: string;
  repo: string;
  pull_number: number;
  title: string;
  branch: string;
  body: string | null | undefined;
} {
  const ctx = github.context;
  const pr = ctx.payload.pull_request;
  if (!pr) {
    throw new Error("This action only runs on pull_request events.");
  }
  const { owner, repo } = ctx.repo;
  return {
    owner,
    repo,
    pull_number: pr.number,
    title: pr.title ?? "",
    branch: pr.head?.ref ?? "",
    body: pr.body ?? ""
  };
}

export async function listAllChangedFiles(octokit: ReturnType<typeof github.getOctokit>, params: {
  owner: string;
  repo: string;
  pull_number: number;
}): Promise<PRFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    ...params,
    per_page: 100
  });
  return files.map((f) => ({
    filename: (f as any).filename,
    status: (f as any).status,
    additions: (f as any).additions,
    deletions: (f as any).deletions
  }));
}
