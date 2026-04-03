# Developer Prompts — Jira & Confluence MCP

Copy-paste prompts for developers to speed up daily work using the Jira & Confluence MCP tools. These are designed for **zero friction** — just paste and go.

---

## Table of Contents

- [Getting Started (First Day Setup)](#getting-started)
- [Understanding Work](#understanding-work)
  - [Read a Ticket](#read-a-ticket)
  - [Understand an Epic](#understand-an-epic)
  - [Understand a Capability or Initiative](#understand-a-capability-or-initiative)
  - [Trace the Full Hierarchy](#trace-the-full-hierarchy)
- [Planning & Prioritizing](#planning--prioritizing)
  - [What Should I Work on Next?](#what-should-i-work-on-next)
  - [Sprint Overview](#sprint-overview)
  - [Epic Progress Check](#epic-progress-check)
  - [Estimate Scope of Remaining Work](#estimate-scope-of-remaining-work)
- [Implementing Tasks](#implementing-tasks)
  - [Start Working on a Ticket](#start-working-on-a-ticket)
  - [Implement a Story](#implement-a-story)
  - [Fix a Bug](#fix-a-bug)
  - [Implement with Confluence Context](#implement-with-confluence-context)
  - [Implement All Subtasks of a Story](#implement-all-subtasks-of-a-story)
- [Research & Context Gathering](#research--context-gathering)
  - [Find Related Documentation](#find-related-documentation)
  - [Understand Existing Architecture](#understand-existing-architecture)
  - [Read a Design Document](#read-a-design-document)
  - [Cross-Reference Ticket and Docs](#cross-reference-ticket-and-docs)
- [After Implementation](#after-implementation)
  - [Document What Was Done](#document-what-was-done)
  - [Move Ticket Forward](#move-ticket-forward)
  - [Update Confluence Documentation](#update-confluence-documentation)
- [Epic & Feature Planning](#epic--feature-planning)
  - [Break Down an Epic into an Implementation Plan](#break-down-an-epic)
  - [Identify Dependencies Across Stories](#identify-dependencies)
  - [Suggest Story Order for a Sprint](#suggest-story-order)
- [Daily Standup Helpers](#daily-standup-helpers)
  - [My Status Update](#my-status-update)
  - [Team Sprint Progress](#team-sprint-progress)
  - [Blockers and Risks](#blockers-and-risks)
- [Discovery & Navigation](#discovery--navigation)
  - [Find a Project](#find-a-project)
  - [Find a Confluence Space](#find-a-confluence-space)
  - [Search Across Jira](#search-across-jira)

---

## Getting Started

#### Find all my projects and spaces
```
List all Jira projects I have access to.
Then list all Confluence spaces.
Show me the project keys and space keys so I know what to reference.
```

---

## Understanding Work

### Read a Ticket

#### Tell me what this ticket needs
```
Read PROJ-123 and explain in plain terms:
1. What exactly needs to be built or changed?
2. What are the acceptance criteria?
3. Are there any comments with extra context or decisions?
4. What's the current status and who's assigned?
```

#### Quick summary of a ticket
```
Read PROJ-123. Give me a one-paragraph summary of what needs to be done.
```

#### Read a ticket and tell me which files to change
```
Read PROJ-123. Based on the description and acceptance criteria,
suggest which files and areas of the codebase I'll likely need to modify.
```

---

### Understand an Epic

#### Show me the full epic with progress
```
Get epic PROJ-50 with all its child stories.
Show me:
- What the epic is about (one paragraph)
- How many stories are Done / In Progress / To Do
- A list of remaining stories with their summaries
```

#### What's left to finish in this epic?
```
Get epic PROJ-50. Show me only the stories that are NOT Done.
For each one, give a brief summary so I can understand the remaining scope.
```

#### Read every open story in an epic
```
Get epic PROJ-50. For each story that is still "To Do":
1. Read the story details
2. Give me a two-line summary: what it does and what it touches
3. Rate its complexity: small / medium / large

Present as a table.
```

---

### Understand a Capability or Initiative

#### Understand an initiative and its breakdown
```
Read PROJ-10 (this is an Initiative / top-level item).
Then search Jira for all epics linked to it:
  "Epic Link" = PROJ-10 OR parent = PROJ-10

For each epic found:
1. Read the epic
2. Show how many stories are Done vs total
3. Give a one-line summary

Present as: Epic Key | Summary | Progress (e.g. "5/12 done")
```

#### Explore a capability and its epics
```
Read PROJ-25 (this is a Capability).
Then find all its child epics using:
  parent = PROJ-25

For each epic:
- Read it
- List the stories still in "To Do"
- Summarize what that epic is trying to achieve

I want to understand the full scope of this capability.
```

#### How much of this initiative is done?
```
Read PROJ-10 and find all its child items.
For each level of the hierarchy (Initiative → Epics → Stories),
show completion stats.

Give me a rollup: "X of Y stories complete across Z epics"
```

---

### Trace the Full Hierarchy

#### Show me the full chain from initiative to tasks
```
I'm working on PROJ-456. Trace upward through the hierarchy:
1. Read PROJ-456 (my task/story)
2. Find its parent epic — read that
3. Find the epic's parent (capability or initiative) — read that

Show me the full chain so I understand where my work fits
in the bigger picture:
  Initiative → Capability → Epic → My Story
```

#### Understand the business context of my task
```
Read PROJ-456 and trace upward to the initiative level.
Explain in plain terms:
- What business goal is this initiative trying to achieve?
- How does my specific task (PROJ-456) contribute to that goal?
- What other work is happening in parallel under the same epic?
```

---

## Planning & Prioritizing

### What Should I Work on Next?

```
Show me the current sprint for project PROJ.
List all "To Do" items sorted by priority (Highest first).
For the top 3, read each one and tell me:
- What it needs
- Rough complexity (small/medium/large)
- Any dependencies on other tickets

Recommend which one I should pick up.
```

#### Find unassigned work
```
Search Jira:
  project = PROJ AND sprint in openSprints() AND assignee is EMPTY AND status = "To Do"

List the results. For each one, give a brief summary.
```

#### What's assigned to me?
```
Search Jira:
  project = PROJ AND assignee = currentUser() AND status != Done ORDER BY priority DESC

Show me my open tickets with their status and priority.
```

---

### Sprint Overview

#### Full sprint board
```
Get the current sprint for project PROJ.
Group all issues by status: To Do, In Progress, In Review, Done.
Show: ticket key, summary, assignee, priority.
```

#### Sprint burndown status
```
Get the current sprint for project PROJ.
Tell me:
- Sprint name and dates (start/end)
- How many issues total
- How many Done vs remaining
- Completion percentage
- Days remaining in the sprint
- Are we on track?
```

---

### Epic Progress Check

```
Get epic PROJ-50 and summarize progress:
- Total stories: X
- Done: X, In Progress: X, To Do: X
- Completion percentage
- Which In Progress stories might be blocked (no recent updates)?
```

---

### Estimate Scope of Remaining Work

```
Get epic PROJ-50. For each story that is "To Do":
1. Read the story
2. Estimate complexity: small (< 1 day), medium (1-3 days), large (3+ days)
3. Note any dependencies on other stories

Present a summary table and a total estimated effort range.
```

---

## Implementing Tasks

### Start Working on a Ticket

```
I'm starting on PROJ-123:
1. Move it to "In Progress"
2. Read the full details
3. Tell me what needs to be done and which files to look at
```

### Implement a Story

```
Implement PROJ-123:

1. Read the story for requirements and acceptance criteria
2. Implement the changes step by step
3. For each file you change, explain what you did and why
4. When done, add a Jira comment summarizing the implementation
5. Move PROJ-123 to "In Review"
```

#### Implement with minimal back-and-forth
```
Read PROJ-123 and implement it end-to-end.
Don't ask me questions unless you're genuinely blocked.
Use your best judgment based on the story requirements and codebase.
When done, add a Jira comment and move to "In Review".
```

#### Implement only what the ticket says
```
Read PROJ-123. Implement ONLY what the acceptance criteria specify.
Don't refactor surrounding code or add enhancements.
Keep changes minimal and focused.
Add a Jira comment listing exactly what was changed and move to "In Review".
```

---

### Fix a Bug

```
Read PROJ-321 (it's a bug).

1. Understand: what's expected vs what's actually happening?
2. Find the relevant code based on the description
3. Identify the root cause
4. Fix it with the minimal change needed
5. Add a Jira comment explaining: root cause, fix applied, files changed
6. Move PROJ-321 to "In Review"
```

#### Investigate a bug without fixing
```
Read PROJ-321 (it's a bug).
DON'T fix it yet. Just investigate:

1. What's the reported behavior?
2. Find the relevant code
3. Identify the likely root cause
4. Explain what's happening and suggest an approach

Add a Jira comment with your findings so the team can discuss.
```

---

### Implement with Confluence Context

```
Read PROJ-789. The design spec is in Confluence.

1. Read the Jira story for requirements
2. Search Confluence for design documents about {feature name}
3. Read the relevant design doc
4. Implement following both the story requirements and the design spec
5. If the implementation deviates from the design doc, note it in the Jira comment
```

#### Use API contract from Confluence
```
Read PROJ-456. I need the API contract for this feature.

1. Read the story
2. Search Confluence for "API contract" or "API spec" related to {service name}
3. Read the API doc
4. Implement the endpoint/client matching the specified contract
5. Add a Jira comment linking the implementation to the API spec
```

---

### Implement All Subtasks of a Story

```
Get epic PROJ-50 and find all its "To Do" child stories.

For each story in priority order:
1. Read the story details
2. Move it to "In Progress"
3. Implement it
4. Add a Jira comment with what was done
5. Move it to "In Review"
6. Ask me before starting the next one

Start with the first story.
```

---

## Research & Context Gathering

### Find Related Documentation

```
I'm about to work on PROJ-123 which involves {brief description}.
Search Confluence for any related pages: design docs, architecture decisions,
API specs, or runbooks.

Show me what you find with page titles and excerpts.
```

### Understand Existing Architecture

```
Search Confluence for architecture documentation about {component/service name}.
Read the most relevant page and summarize:
- Current architecture
- Key design decisions
- Data flow
- External dependencies
- Any known limitations or tech debt
```

### Read a Design Document

```
Read Confluence page {pageId}.

Summarize:
1. The problem being solved
2. The proposed solution / architecture
3. API contracts (if any)
4. Data models (if any)
5. Open questions or TODOs
6. Decision log / ADRs
```

### Cross-Reference Ticket and Docs

```
Read PROJ-123.
Then search Confluence for documents related to the same feature.
Cross-reference:
- Does the Jira story align with the design doc?
- Are there any gaps (things in the doc not covered by the story, or vice versa)?
- Are there any outdated assumptions?

Report your findings.
```

---

## After Implementation

### Document What Was Done

```
I just finished PROJ-123. Add a Jira comment documenting:
- What was implemented
- Files changed: {list files or say "check the PR"}
- Any decisions made during implementation
- Anything the reviewer should pay attention to

Then move PROJ-123 to "In Review".
```

### Move Ticket Forward

```
Move PROJ-123 to "In Review".
```

```
Move PROJ-123 to "Done".
```

```
Move PROJ-123 back to "To Do" — it needs rework.
Add a comment explaining why.
```

### Update Confluence Documentation

```
I changed the authentication flow while implementing PROJ-123.
Search Confluence for the auth architecture page.
Add a comment on that page noting:
- What changed
- Why it changed (link to PROJ-123)
- How the new flow works
```

---

## Epic & Feature Planning

### Break Down an Epic

```
Read epic PROJ-50 with all its stories.
Also search Confluence for design docs related to this epic.

Based on the stories and the design doc:
1. Suggest an implementation order (accounting for dependencies)
2. Group stories into phases or milestones
3. Identify which stories can be worked on in parallel
4. Flag any stories that seem underspecified or need clarification

Present this as an implementation plan.
```

### Identify Dependencies

```
Get epic PROJ-50 and read all its child stories.

Create a dependency map:
- Which stories must be done before others?
- Which stories can be done independently?
- Are there any circular dependencies or conflicts?

Present as a list:
  PROJ-55 → PROJ-56 → PROJ-57 (sequential)
  PROJ-58 (independent, can be parallel)
  PROJ-59 (depends on PROJ-56 + PROJ-57, must be last)
```

### Suggest Story Order

```
Get the current sprint for project PROJ.
Read all "To Do" stories.

Suggest an optimal implementation order based on:
1. Priority (Highest first)
2. Dependencies between stories
3. Logical grouping (related changes together)
4. Complexity (quick wins first to build momentum, or blockers first)

Present a numbered list with brief rationale for the order.
```

---

## Daily Standup Helpers

### My Status Update

```
Search Jira:
  project = PROJ AND assignee = currentUser() AND status in ("In Progress", "In Review")

For each ticket, read the recent comments and summarize:
- What I've been working on
- Current status of each item
- Any blockers

Format this as a standup update I can paste into Slack.
```

### Team Sprint Progress

```
Get the current sprint for project PROJ.

Generate a sprint progress report:
- Total issues: X
- Done: X (list them)
- In Progress: X (list with assignee)
- To Do: X (list with priority)
- Blocked: any tickets with "blocked" in comments?
- Overall: X% complete, Y days remaining
```

### Blockers and Risks

```
Get the current sprint for project PROJ.
For each "In Progress" issue:
1. Read it and its recent comments
2. Is it stuck? (no updates in > 2 days? comments mentioning "blocked"?)
3. Are there dependencies on other tickets that aren't Done yet?

Flag anything that looks at risk.
```

---

## Discovery & Navigation

### Find a Project

```
List all Jira projects I have access to.
```

```
Search Jira for projects related to "media services":
  project in projectsWhereUserHasRole("Developers")
```

### Find a Confluence Space

```
List all Confluence spaces.
Show me the space key and name for each.
```

```
Search Confluence for pages about "deployment" across all spaces.
```

### Search Across Jira

#### Find recently created tickets
```
Search Jira:
  project = PROJ AND created >= -7d ORDER BY created DESC

Show me what's new this week.
```

#### Find all bugs in a project
```
Search Jira:
  project = PROJ AND type = Bug AND status != Done ORDER BY priority DESC

Show me open bugs sorted by priority.
```

#### Find tickets by label
```
Search Jira:
  project = PROJ AND labels = "tech-debt" AND status != Done

Show me all open tech debt items.
```

#### Find tickets mentioning a keyword
```
Search Jira:
  project = PROJ AND text ~ "authentication" AND status != Done

Show me open tickets related to authentication.
```

#### Find recently updated tickets
```
Search Jira:
  project = PROJ AND updated >= -2d AND status = "In Progress" ORDER BY updated DESC

What's been actively worked on in the last 2 days?
```

---

## Tips

- **You rarely need to type ticket IDs by hand.** Ask the AI to search for tickets by keyword, label, sprint, or assignee — then reference them by key.
- **Epic → Stories → Subtasks.** Start broad (epic overview), then narrow down (specific story), then implement.
- **Use Confluence search liberally.** Before implementing anything non-trivial, search for design docs. It saves rework.
- **Let the AI trace the hierarchy.** If you're unsure what Initiative or Capability a ticket belongs to, ask the AI to trace upward.
- **Standup helpers save time.** Use the standup prompts to auto-generate your daily status from actual Jira data.
- **Don't skip the Jira comment.** Having the AI add implementation notes directly on the ticket creates a paper trail for reviewers and future developers.
