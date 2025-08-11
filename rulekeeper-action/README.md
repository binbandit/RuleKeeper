# RuleKeeper — PR guardrails that keep reviews moving

RuleKeeper is a lightweight GitHub Action that enforces a few simple pull request rules and posts one clear summary. It helps keep PRs small, tie changes back to tickets, and ask for screenshots when UI changes.

## Quick start

1. Create `.github/rulekeeper.yml` in your repo:

```yaml
rules:
  - type: max_lines_changed
    limit: 300                   # integer > 0
    # includePaths: ["ui/**"]    # optional globs; default = all files

  - type: require_ticket
    pattern: "PROJ-\\d+"         # JS RegExp string (no slashes)

  - type: require_screenshot
    whenPaths: ["ui/**"]         # if any changed file matches → screenshot/video required
```

2. Create workflow `.github/workflows/rulekeeper.yml`:

```yaml
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
```

3. Open a PR. The action runs and posts a single summary. If any rule fails, the job fails.

## Rules

- max_lines_changed
  - Sums additions + deletions across changed files (optionally filtered by includePaths). Passes when total <= limit. Shows top five files when failing.
- require_ticket
  - Ensures the PR title or branch contains your ticket pattern (JS RegExp string, e.g., `PROJ-\\d+`, `ENG-[0-9]+`).
- require_screenshot
  - If any changed path matches `whenPaths`, the PR body must contain a screenshot/video: a markdown image or a direct link ending in png/jpg/jpeg/gif/mp4.

## Troubleshooting

- Action fails immediately
  - Likely missing/invalid config or wrong `with.config` path. Ensure the file exists and matches the schema above.
- No files detected
  - Ensure the workflow runs on `pull_request` events and the PR has commits. The action requires `pull-requests: read` permission.
- Ticket not detected
  - Check your regex. Examples: `PROJ-\\d+` (Jira), `ENG-[0-9]+`, `LIN-[0-9]+` (Linear). Matching is case-insensitive.

## License

MIT
