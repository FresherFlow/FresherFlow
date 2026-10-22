# FresherFlow plugin

Add fresher jobs, internships, walk-in drives and government vacancies to
FresherFlow from an AI assistant.

## What is in here

| Skill | Does |
|---|---|
| `skills/fresherflow-mcp` | Explains the MCP server: how to connect, which tool to call, and the honest status contract (what is staged for review versus live). |
| `skills/fresherflow-job-extraction` | Turns a job posting into a correctly populated listing: the workflow, the field rules, the pre-flight checklist, and the error table. |

The two are deliberately separate. `fresherflow-job-extraction` owns *what a good
listing looks like*; `fresherflow-mcp` owns *the connection and the tool surface*.
Neither restates the other.

## Source of truth

`plugins/fresherflow/skills/<name>/SKILL.md` is the **tracked source**. It is what
ships, and what a fresh clone contains.

`.agents/skills/<name>/SKILL.md` is the local install that agents working in this
repository load. `.agents` is gitignored, so it can never be the source.

Edit a shipped skill under `plugins/`, then install it into this worktree:

```bash
pnpm skills:sync    # plugins/fresherflow/skills -> .agents/skills
pnpm skills:check   # verifies both copies match, and that each skill's
                    # frontmatter name matches its directory
```

`.agents/skills` also holds the community-installed skills (hundreds of them,
tracked separately in `.agents/skills-lock.json`). `skills:sync` only touches the
two shipped here, and never deletes anything.

## Connecting the MCP server

The skills teach an agent how to use the MCP server, but this bundle does **not**
wire it up automatically, because the deployed endpoint is not recorded anywhere in
this repository.

- Local development: `http://localhost:5002/mcp` (`pnpm dev:mcp`).
- Production: `render.yaml` declares the service as `fresherflow-mcp`, but the
  live host is not the service name — the API's recorded host is
  `job-platform-api.onrender.com` while `render.yaml` names that service
  `fresherflow-api`. Do not infer the MCP host from the service name; read it from
  the Render dashboard.

Once the production host is known, record it here and add the server to
`.mcp.json` plus an `mcpServers` entry in each client manifest
(`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`).

## Versions

Bump `version` in all three client manifests together when a change adds an MCP
tool, or substantially changes a shipped skill's steps, tool choices or expected
output. Routine fixes to tool implementation, descriptions or schemas do not need a
bump. Keep the three manifests on the same version.
