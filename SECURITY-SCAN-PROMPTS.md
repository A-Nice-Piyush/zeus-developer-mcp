# MCP Prompt Guide for Developers

Ready-to-use prompts for Veracode and SonarQube MCP tools. Copy-paste these directly into your AI assistant (VS Code Copilot Chat, Claude Code, etc.).

> **Zero-config branch detection:** All tools auto-detect the current Git branch from `GIT_REPO_PATH`. You don't need to specify the branch name — just ask and it works.

---

## Table of Contents

- [Jira & Confluence Prompts](#jira--confluence-prompts)
  - [Understand a Story/Epic](#understand-a-storyepic)
  - [Implement from Jira Ticket](#implement-from-jira-ticket)
  - [Sprint & Project Management](#sprint--project-management)
  - [Confluence Research](#confluence-research)
  - [Full Implementation Workflows](#full-implementation-workflows)
  - [Cross-Tool Workflows (Jira + Security)](#cross-tool-workflows)
- [Veracode Prompts](#veracode-prompts)
  - [Quick Start (Zero Parameters)](#veracode-quick-start)
  - [Discovery](#veracode-discovery)
  - [Findings & Fixes](#veracode-findings--fixes)
  - [Full Workflows](#full-veracode-workflows)
- [SonarQube Prompts](#sonarqube-prompts)
  - [Quick Start (Zero Parameters)](#sonarqube-quick-start)
  - [Discovery](#sonarqube-discovery)
  - [Filtered Issues](#filtered-issues)
  - [Full Workflows](#full-sonarqube-workflows)
- [Combined Prompts (Veracode + SonarQube)](#combined-prompts)

---

## Jira & Confluence Prompts

### Understand a Story/Epic

#### Read a Jira story and explain what needs to be done
```
Read Jira story PROJ-123 and explain:
1. What needs to be implemented
2. Acceptance criteria
3. Any linked issues or dependencies

Then suggest an implementation approach.
```

#### Get full epic breakdown
```
Get the epic PROJ-50 with all its child stories.
Show me which stories are Done, In Progress, and To Do.
Summarize what the epic is about and what's left to finish.
```

#### Understand a story before starting work
```
I'm about to start working on PROJ-456. Read the story details and:
1. Explain the requirements in plain terms
2. List all acceptance criteria
3. Check if there are any comments with additional context
4. Tell me which files I'll likely need to modify based on the description
```

#### Compare multiple stories in an epic
```
Get epic PROJ-50 and list all child stories that are still in "To Do" status.
For each one, give me a one-line summary so I can pick which to work on next.
```

---

### Implement from Jira Ticket

#### Implement a Jira story end-to-end
```
Read Jira story PROJ-123 and implement it:

1. Read the story description and acceptance criteria
2. Identify which files need to be created or modified
3. Implement the changes step by step
4. After each file change, explain what you did and why
5. When done, add a comment on PROJ-123 summarizing the implementation

Start by reading the story.
```

#### Implement a story and move it to In Progress
```
I'm starting PROJ-456. Do the following:

1. Move PROJ-456 to "In Progress"
2. Read the story details
3. Implement the requirements
4. Add a comment with what was implemented
5. Move PROJ-456 to "In Review" when done
```

#### Implement based on story + Confluence docs
```
Read Jira story PROJ-789. The design doc is in Confluence.

1. Read the story for requirements
2. Search Confluence for the design document related to this story
3. Read the design doc for technical details
4. Implement the changes following both the story requirements and the design spec
5. Add a Jira comment linking to the relevant design doc section
```

#### Quick fix from a bug ticket
```
Read Jira bug PROJ-321.

1. Understand the bug: what's the expected vs actual behavior?
2. Find the relevant code based on the description
3. Identify the root cause
4. Fix it
5. Add a comment on PROJ-321 explaining the fix
```

#### Implement a subtask
```
Read Jira task PROJ-100 (it's a subtask of PROJ-50).

1. Read the parent epic PROJ-50 for overall context
2. Read the subtask PROJ-100 for specific requirements
3. Implement the subtask
4. Add a comment on PROJ-100 with what was done
```

---

### Sprint & Project Management

#### What's in my current sprint?
```
Show me the current sprint for project PROJ.
Group issues by status (To Do, In Progress, Done).
Highlight any blockers.
```

#### What should I work on next?
```
Show me the current sprint for project PROJ.
List all "To Do" items sorted by priority.
For the top 3, give me a brief summary of what each one requires.
```

#### Sprint progress report
```
Get the current sprint for project PROJ.
Give me a progress summary:
- How many stories are Done vs In Progress vs To Do?
- What's the overall completion percentage?
- Are there any stories still in To Do that are high priority?
```

#### Find my assigned issues
```
Search Jira for issues assigned to me that are In Progress or To Do:
project = PROJ AND assignee = currentUser() AND status in ("In Progress", "To Do")

Show me each one with its status and summary.
```

#### Find unassigned stories
```
Search Jira for unassigned stories in the current sprint:
project = PROJ AND sprint in openSprints() AND assignee is EMPTY

List them so I can pick one up.
```

#### List all Jira projects
```
List all Jira projects I have access to.
```

---

### Confluence Research

#### Search for relevant documentation
```
Search Confluence for pages about "authentication flow" in the DEV space.
Show me the top results with excerpts so I can pick which to read.
```

#### Read a design document
```
Read Confluence page {pageId}. Summarize the key points:
- Architecture decisions
- API contracts
- Data models
- Any open questions or TODOs
```

#### Find documentation related to a Jira story
```
I'm working on PROJ-123 which is about {brief description}.
Search Confluence for any related design docs, architecture pages, or technical specs.
Summarize what you find.
```

#### List all pages in a space
```
List all Confluence spaces I have access to.
Then show me the top-level pages in the {SPACE_KEY} space.
```

#### Research before implementing
```
Before I implement PROJ-456, I need to understand the existing architecture.

1. Read Jira story PROJ-456 for the requirements
2. Search Confluence for pages related to {feature/component name}
3. Read the most relevant Confluence page
4. Summarize: what exists today, what needs to change, and any architectural constraints

Then start the implementation.
```

---

### Full Implementation Workflows

#### Story-to-code: complete workflow
```
I need to implement PROJ-123. Here's the full workflow:

1. Move PROJ-123 to "In Progress"
2. Read the story for requirements and acceptance criteria
3. Search Confluence for any related design docs
4. Implement the changes, file by file
5. After implementation, add a Jira comment summarizing:
   - What was implemented
   - Files changed
   - Any deviations from the original spec
6. Move PROJ-123 to "In Review"

Start now.
```

#### Epic implementation plan
```
Read epic PROJ-50 with all its child stories.

1. List all stories that are "To Do"
2. For each story, read its details
3. Suggest an implementation order based on dependencies
4. For each story, estimate which files will need changes
5. Identify any stories that overlap or conflict

Present this as an implementation plan I can follow.
```

#### Bug triage workflow
```
Search Jira for open bugs in project PROJ:
project = PROJ AND type = Bug AND status != Done ORDER BY priority DESC

For each bug (up to 10):
1. Show the summary and priority
2. Based on the description, estimate complexity (quick fix vs. investigation needed)
3. Group them: "Quick Fixes", "Needs Investigation", "Needs More Info"
```

#### Implement all subtasks of a story
```
Read Jira story PROJ-100 and get its subtasks.

For each subtask that is "To Do":
1. Read the subtask details
2. Move it to "In Progress"
3. Implement it
4. Add a comment on the subtask with what was done
5. Move it to "Done"

Start with the first subtask and ask me before moving to the next.
```

#### Document implementation in Confluence
```
I just finished implementing PROJ-123. Help me document it:

1. Read PROJ-123 for context
2. Search Confluence for the relevant design doc in space {SPACE_KEY}
3. Add a comment on the Confluence page documenting:
   - What was implemented
   - Any architectural decisions made
   - Files changed
4. Add a Jira comment on PROJ-123 referencing the Confluence page
```

---

### Cross-Tool Workflows

#### Implement story + run security checks
```
Implement Jira story PROJ-123, then verify security:

1. Read PROJ-123 and implement the requirements
2. Add a Jira comment with the implementation summary
3. Check Veracode findings for my current branch
4. Check SonarQube quality gate for my current branch
5. If there are any security findings in the files I changed, fix them
6. Update the Jira comment with the security check results
7. Move PROJ-123 to "In Review"
```

#### Create Jira tickets from security findings
```
Run a full security check on my current branch:

1. Check Veracode for High+ findings
2. Check SonarQube for BLOCKER/CRITICAL issues
3. For each unique finding, check if a Jira ticket already exists:
   Search: project = PROJ AND labels = "security" AND summary ~ "{filename}"
4. For findings without existing tickets, create new ones in project PROJ
5. Show me all the created/existing ticket keys
```

#### Sprint security audit
```
Get the current sprint for project PROJ.
For each story that is "Done" or "In Review":

1. Read the story to understand what was changed
2. Check Veracode and SonarQube for any findings in the likely affected files
3. Flag any stories that may have introduced security issues

Present a sprint security audit summary.
```

#### Story + docs + code + security — the full pipeline
```
I'm implementing PROJ-123. Do everything:

1. Move PROJ-123 to "In Progress"
2. Read the story
3. Search Confluence for design docs
4. Implement the code
5. Check Veracode + SonarQube for my branch
6. Fix any security findings in my changed files
7. Add a Jira comment with: implementation summary, files changed, security status
8. Move PROJ-123 to "In Review"

Walk me through it step by step.
```

---

## Veracode Prompts

### Veracode Quick Start

These prompts require **zero parameters** — the branch, app name, and repo are all auto-detected.

#### Check Veracode for my current branch
```
Check Veracode findings for my current branch.
```

#### Veracode security summary
```
Show me the Veracode security scan summary for my current branch.
How many findings per severity? Which files are most affected?
```

#### Show only critical Veracode findings
```
Show me only the High and Very High severity Veracode findings for my current branch.
```

#### Quick Veracode check before merge
```
I'm about to merge. Are there any Veracode High or Very High findings on my current branch?
Give me a GO / NO-GO.
```

---

### Veracode Discovery

#### List all apps
```
List all Veracode application profiles I have access to.
```

#### List recent scans
```
List the 10 most recent Veracode scans for my application.
```

#### Check scan status
```
Check the current Veracode scan status. Is the scan complete?
```

---

### Veracode Findings & Fixes

#### Fix a specific finding
```
Fix Veracode FLAW-{id} in {filename} at line {line_number}.
Read the file, explain the vulnerability, and apply the fix.
```

#### Fix all High findings in a file
```
Get all High+ Veracode findings for my current branch.
Then fix every finding in {filename} — show me each fix before applying.
```

#### Fix all findings of a CWE type
```
Get all Veracode findings for my current branch that are CWE-79 (Cross-Site Scripting).
Walk me through fixing each one.
```

#### Get findings from a specific build
```
Fetch Veracode findings from build ID "28485932". Show severity Medium and above.
```

---

### Full Veracode Workflows

#### Complete security review
```
Do a complete Veracode security review for my current branch:

1. Find the scan and show a severity summary
2. List all High and Very High findings with full details
3. For each critical finding, read the source file and suggest a fix
4. Apply fixes after I approve

Start now.
```

#### Veracode findings to Jira
```
Get all High and Very High Veracode findings for my current branch.

For each finding, create a Jira ticket in project {PROJECT_KEY} with:
- Title: "[Veracode] {CWE Name} in {filename}"
- Description: flaw ID, severity, file, line, description, remediation
- Priority: High for severity 4, Critical for severity 5
- Labels: "veracode", "security"
```

#### Upload and scan a new build
```
Upload C:\builds\my-app-build-artifact.zip to Veracode and start a SAST scan.
```

---

## SonarQube Prompts

### SonarQube Quick Start

These prompts require **zero parameters** — the branch and project key are auto-detected.

#### Check SonarQube for my current branch
```
Check SonarQube for my current branch.
Show me the quality gate status and issue counts.
Then ask me which categories to fix.
```

#### SonarQube overview
```
Get the SonarQube report for my current branch.
```

#### Quick quality gate check
```
Did my current branch pass the SonarQube quality gate?
```

#### Show me the vulnerabilities
```
Show me all SonarQube vulnerabilities on my current branch.
```

#### Show me the critical issues
```
Show me all BLOCKER and CRITICAL SonarQube issues on my current branch.
These are the ones I need to fix before merging.
```

---

### SonarQube Discovery

#### List projects
```
List all SonarQube projects I have access to.
```

#### Search for a project
```
Search SonarQube projects matching "pocredirector".
```

---

### Filtered Issues

#### Get all bugs
```
Show me all SonarQube bugs on my current branch, grouped by severity.
```

#### Get code smells (major+)
```
Show me SonarQube code smells on my current branch, but only MAJOR severity and above.
```

#### Get vulnerabilities and bugs together
```
Show me all SonarQube vulnerabilities and bugs on my current branch.
I want security and reliability issues only, skip code smells.
```

#### Get a full dump of all issues
```
Show me up to 200 SonarQube issues on my current branch — all types, all severities.
```

---

### Full SonarQube Workflows

#### Complete SonarQube review
```
Do a complete SonarQube review for my current branch:

1. Show the quality gate status and issue counts
2. Ask me which categories to focus on
3. After I choose, show the detailed findings
4. For each finding, read the source file and suggest a fix
5. Apply fixes after I approve

Start with the report.
```

#### Fix all vulnerabilities
```
Fix all SonarQube vulnerabilities on my current branch:

1. Fetch all vulnerabilities sorted by severity (BLOCKER first)
2. For each one: read the file, explain the rule, propose a fix
3. Wait for my approval before applying each fix
4. Summarize all changes at the end
```

#### Fix a specific SonarQube issue
```
Fix this SonarQube issue:
- Rule: {rule_key}
- File: {file_path}, Line: {line_number}
- Message: {message}

Read the file, explain the rule, and apply the fix.
```

#### Pre-merge quality check
```
I'm about to merge. Run a SonarQube quality check:

1. Did the quality gate pass?
2. Are there any BLOCKER or CRITICAL issues?
3. For each blocker, is it a real problem or a false positive?
4. Give me a GO / NO-GO recommendation.
```

#### SonarQube findings to Jira
```
Get all BLOCKER and CRITICAL SonarQube issues on my current branch.

For each finding, create a Jira ticket in project {PROJECT_KEY} with:
- Title: "[SonarQube] {message} in {filename}"
- Description: rule, severity, file, line, message, effort estimate
- Priority: Critical for BLOCKER, High for CRITICAL
- Labels: "sonarqube", "code-quality"
```

---

## Combined Prompts

### Full security + quality review
```
Do a complete security and quality review for my current branch:

1. Check Veracode — show the severity summary
2. Check SonarQube — show the quality gate and issue counts
3. Give me a unified summary: total vulnerabilities from both tools,
   files that appear in both, and recommended fix priority
4. Ask me which findings to fix first
```

### Pre-merge gate check (both tools)
```
I'm about to merge. Check both tools:

1. Veracode: any High or Very High findings?
2. SonarQube: did the quality gate pass? Any BLOCKER/CRITICAL issues?

Give me a GO / NO-GO recommendation with reasons.
```

### Fix all security issues from both tools
```
Find all security issues on my current branch from both tools:

1. Veracode: High+ findings
2. SonarQube: all VULNERABILITY issues, MAJOR severity and above

Combine, deduplicate (same file + similar line), and present a unified fix list.
Then walk me through fixing each one.
```

### Weekly security report
```
Generate a security report for the team:

1. Veracode: last 5 scans + latest findings summary
2. SonarQube: report for the main branch
3. Summarize: quality gate, Veracode findings by severity,
   SonarQube issues by type, coverage %, top 3 problem files

Format as a Confluence page in space "{SPACE_KEY}" titled "Security Report - {today's date}".
```

---

## Setup

Add these to your `.vscode/mcp.json` env block:

```json
{
  "GIT_REPO_PATH": "C:/path/to/your/local/repo",
  "VERACODE_API_ID": "...",
  "VERACODE_API_KEY": "...",
  "VERACODE_APP_NAME": "your-veracode-app-name",
  "GITHUB_TOKEN": "ghp_...",
  "GITHUB_REPO": "owner/repo",
  "SONARQUBE_BASE_URL": "https://sonar.nice.com",
  "SONARQUBE_TOKEN": "your-sonarqube-user-token",
  "SONARQUBE_PROJECT_KEY": "your-project-key",
  "NODE_TLS_REJECT_UNAUTHORIZED": "0"
}
```

Once configured, all prompts above work with **zero parameters** — no branch names, no project keys, no app names needed.

The only placeholders you ever need to fill in are:
- `{PROJECT_KEY}` — your Jira project key (only for Jira ticket creation prompts)
- `{filename}` / `{line_number}` — when targeting a specific finding to fix
- `{SPACE_KEY}` — your Confluence space key (only for report generation prompts)
