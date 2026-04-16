# AI Governance Cadence

## Monthly review cadence

Run this review once per month (recommended: first business Monday).

## Owners

- Primary: Tech lead / architecture owner
- Secondary: feature lead rotating monthly

## Monthly checklist

1. Rules health (`.cursor/rules`)
   - Remove stale guidance.
   - Add recurring anti-patterns from last month.
   - Confirm precedence still reflects project complexity.

2. Skills health (`.cursor/skills`)
   - Validate each skill still matches real code patterns.
   - Split oversized skills or merge overlapping ones.
   - Ensure descriptions still trigger correctly.

3. Decision log health (`docs/decisions`)
   - Add ADRs for unresolved architecture changes.
   - Mark superseded ADRs where appropriate.

4. Quality metrics
   - Count architecture-policy corrections in merged PRs.
   - Track average retries/rework due to generic AI outputs.
   - Track verification compliance (`tsc`, tests).

5. MCP ROI
   - Review actual MCP usage.
   - Keep only MCPs with clear measurable value.

## Escalation thresholds

Trigger out-of-cycle review if any condition occurs:
- 3+ policy violations in one sprint.
- repeated drift in auth/data-access patterns.
- major stack/version upgrade affecting rules.

## Review output format

Create a monthly log entry in `docs/ai/reviews/YYYY-MM.md` with:
- what changed,
- why,
- impacted rules/skills,
- follow-up actions.
