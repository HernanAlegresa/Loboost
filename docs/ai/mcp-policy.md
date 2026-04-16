# LoBoost MCP Usage Policy

## Principle

Use MCP only when it improves speed, safety, or observability versus local code + tests.

## Approved MCPs

### Recommended: Supabase MCP

Use for:
- live schema inspection,
- safe SQL diagnostics,
- operational debugging of data/auth issues,
- controlled migration/application workflows.

Expected ROI: high for backend/data tasks.

### Conditional: Figma MCP

Use only when:
- there is an active design-to-code sync workflow, or
- design system parity with Figma is a current objective.

Expected ROI: medium/high only for design-heavy phases.

## Not recommended by default

- MCP servers unrelated to active LoBoost product/code workflows.
- MCP usage that duplicates what local tests and repo inspection already solve faster.

## Decision checklist before using MCP

- [ ] Is the task data/ops/design-system centric?
- [ ] Is MCP materially faster than local verification?
- [ ] Is required auth/access already configured?
- [ ] Can the same result be achieved with lower risk locally?

If any answer is "no", prefer local code + tests.

## Safety notes

- Never expose secrets in logs or prompts.
- Keep MCP interactions traceable in task notes when they affect architecture or data behavior.
- Record non-trivial MCP-driven decisions in `docs/decisions/`.
