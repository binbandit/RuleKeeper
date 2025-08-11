RuleKeeper

Simple pull request guardrails you can drop into any repo.

What it is
- A GitHub Action that checks three high‑leverage rules:
  - PR size: keep total changed lines under a budget
  - Ticket traceability: require a ticket ID in the title or branch
  - UI evidence: require a screenshot/video when UI files change
- One summary per run. If any rule fails, the job fails.
- Zero infrastructure. No dashboards. No accounts.

Why it exists
Code review goes faster when PRs are small, traceable, and visual when UI changes. RuleKeeper enforces exactly that—nothing more.

Quick start
1) Add a config file to your repo at .github/rulekeeper.yml

rules:
  - type: max_lines_changed
    limit: 300                   # integer > 0
    # includePaths: ["ui/**"]    # optional globs; default = all files

  - type: require_ticket
    pattern: "PROJ-\\d+"         # JS RegExp string (no slashes)

  - type: require_screenshot
    whenPaths: ["ui/**"]         # paths that trigger the screenshot requirement

2) Add a workflow at .github/workflows/rulekeeper.yml

name: RuleKeeper
on:
  pull_request:
    types: [opened, edited, synchronize, reopened, ready_for_review]
jobs:
  check:
    permissions:
      contents: read
      pull-requests: read
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: RuleKeeper
        uses: YOUR_GH_USER/rulekeeper-action@v0
        with:
          config: .github/rulekeeper.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

3) Open a PR. The action posts one summary. If a rule fails, the job fails.

Configuration
- max_lines_changed
  - limit: positive integer
  - includePaths: optional array of globs (minimatch syntax). If omitted, all files are counted.
- require_ticket
  - pattern: JavaScript RegExp string (without slashes). Match is case‑insensitive and checked against PR title or branch name.
- require_screenshot
  - whenPaths: non‑empty array of globs. If any changed file matches, the PR body must include a markdown image or direct link ending in png/jpg/jpeg/gif/mp4.

Development
Tech stack
- TypeScript (strict), Node 20, esbuild bundling
- @actions/core, @actions/github, js-yaml, minimatch

Repo layout
- rulekeeper-action/: the action code
  - src/: index, rules, config loader, GitHub helpers, types
  - dist/: bundled output (committed for releases)
  - tests: unit tests for rule logic (Vitest)
- .github/workflows/: CI and release checks

Local commands
- Build: cd rulekeeper-action && npm install && npm run build
- Test:  cd rulekeeper-action && npm test

Releasing the action
1) Build the bundle and commit dist
   cd rulekeeper-action
   npm ci
   npm run build
   git add dist
   git commit -m "chore(build): bundle action for release"
2) Tag and push
   git tag -f v0.1.0
   git tag -f v0
   git push
   git push --force origin v0.1.0 v0
3) Publish a GitHub Release. The release workflow will verify dist/index.js exists.

Troubleshooting
- Action fails immediately
  - Check the config path and that .github/rulekeeper.yml is present and valid.
- No files detected
  - Ensure the workflow runs on pull_request events and the PR has commits. The workflow needs pull-requests: read permission.
- Ticket not detected
  - Verify your regex (examples: PROJ-\\d+, ENG-[0-9]+). Matching is case‑insensitive.

Roadmap and scope
- Purposefully small surface area. No billing, dashboards, Slack, or GitHub App in this repository.
- Focus is reliability and clarity in the single summary.

Code quality principles
- Purposeful: every line should earn its place. No unnecessary abstractions or over‑engineering.
- Self‑documenting: comments only when a non‑obvious algorithm needs it.
- Beautiful: small, clear functions; consistent naming; predictable flow.
- Simple: readable by developers of all experience levels.

License
MIT
