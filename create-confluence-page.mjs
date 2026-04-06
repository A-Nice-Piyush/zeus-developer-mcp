/**
 * Updates the Confluence page with corrected title and QA content.
 *
 * Usage:
 *   node create-confluence-page.mjs
 */

import "dotenv/config";

const BASE_URL = process.env.ATLASSIAN_BASE_URL || "https://nice-ce-cxone-prod.atlassian.net";
const EMAIL = process.env.ATLASSIAN_EMAIL || "piyush.bora@nice.com";
const TOKEN = process.env.ATLASSIAN_API_TOKEN;

if (!TOKEN) {
  console.error("Missing ATLASSIAN_API_TOKEN in .env");
  process.exit(1);
}

const AUTH = Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
const PAGE_ID = "3544416375";
const SPACE_KEY = "IN";
const PAGE_TITLE = "ZEUS — Zero-Effort Utility for Software";

function buildPageContent() {
  return `
<h1>ZEUS</h1>
<p><strong>Zero-Effort Utility for Software</strong></p>
<p><em>AI-powered productivity for Dev &amp; QA with Jira, Confluence, Veracode &amp; SonarQube.</em></p>
<p><em>One utility. Four integrations. 21 tools. Zero context switching.</em></p>

<hr/>

<h2>1. The Opportunity</h2>
<h3>We can reclaim time currently spent on tool navigation and context gathering.</h3>

<table>
<thead>
<tr><th>Area</th><th>What Developers Experience</th><th>What QAs Experience</th></tr>
</thead>
<tbody>
<tr><td><strong>Context Switching</strong></td><td>Navigating between Jira, Confluence, Veracode, and SonarQube to gather requirements and scan results.</td><td>Moving between Jira, Confluence, and security dashboards to understand what needs testing and verification.</td></tr>
<tr><td><strong>Manual Lookup</strong></td><td>Tracing stories through epics and initiatives, locating the right scan report for the right branch.</td><td>Extracting acceptance criteria, searching Confluence for test plans, mapping requirements across epics.</td></tr>
<tr><td><strong>Repetitive Steps</strong></td><td>Read ticket &rarr; find docs &rarr; implement &rarr; update status &rarr; document &rarr; repeat.</td><td>Read ticket &rarr; find test specs &rarr; write test cases &rarr; verify &rarr; update status &rarr; document &rarr; repeat.</td></tr>
<tr><td><strong>Security Follow-up</strong></td><td>Veracode/SonarQube findings require manual cross-referencing across dashboards to resolve.</td><td>Security scan results need to be manually validated and mapped to test scenarios.</td></tr>
<tr><td><strong>Distributed Information</strong></td><td colspan="2">The information we need is spread across 4+ tools, each with its own interface and login.</td></tr>
</tbody>
</table>

<ac:structured-macro ac:name="info">
<ac:rich-text-body><p>On average, we interact with <strong>4-6 tools</strong> before we can begin our core work. This is an opportunity to streamline.</p></ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h2>2. The Proposed Solution</h2>
<h3>ZEUS unifies our existing tools into a single AI-powered conversation.</h3>

<h4>Architecture</h4>
<ac:structured-macro ac:name="code">
<ac:parameter ac:name="language">text</ac:parameter>
<ac:plain-text-body><![CDATA[+---------------------+          +---------------------+          +------------------------+
|                     |   MCP    |                     |          |  Jira REST API v3      |
|   AI Assistant      |<-------->|   ZEUS        |<-------->|  Confluence REST API   |
|   (VS Code /        |  Tools   |   (Node.js)         |          |  Veracode XML API v5   |
|    Claude Code)     |          |   21 tools           |          |  SonarQube Web API     |
+---------------------+          +---------------------+          +------------------------+]]></ac:plain-text-body>
</ac:structured-macro>

<h4>21 Tools Across 4 Integrations</h4>
<table>
<thead>
<tr><th>Integration</th><th>Tools</th><th>Used By</th><th>Purpose</th></tr>
</thead>
<tbody>
<tr><td><strong>Jira</strong></td><td>7</td><td>Dev &amp; QA</td><td>Read stories, search issues, manage sprints, update status, add comments</td></tr>
<tr><td><strong>Confluence</strong></td><td>5</td><td>Dev &amp; QA</td><td>Search docs, read design specs &amp; test plans, navigate page hierarchies</td></tr>
<tr><td><strong>Veracode</strong></td><td>6</td><td>Dev &amp; QA</td><td>Find scans by branch/PR, retrieve SAST findings with file+line context</td></tr>
<tr><td><strong>SonarQube</strong></td><td>3</td><td>Dev &amp; QA</td><td>Quality gate status, issue reports, detailed findings drill-down</td></tr>
</tbody>
</table>

<ac:structured-macro ac:name="note">
<ac:rich-text-body><p><strong>Key design principle:</strong> Zero-parameter usage. Branch auto-detected from Git. Project keys from env. Just say <em>&quot;Check SonarQube&quot;</em>, <em>&quot;Implement PROJ-123&quot;</em>, or <em>&quot;What are the acceptance criteria for PROJ-456?&quot;</em>.</p></ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h2>3. How It Helps</h2>

<h3>3a. Developer Workflow: Current vs With MCP</h3>

<ac:structured-macro ac:name="section">
<ac:rich-text-body>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<h4>Current Workflow</h4>
<ol>
<li>Open Jira &rarr; find ticket &rarr; read description &rarr; copy acceptance criteria</li>
<li>Open Confluence &rarr; search for design doc &rarr; read it</li>
<li>Switch to IDE &rarr; start coding</li>
<li>Open Veracode dashboard &rarr; find scan &rarr; scroll findings</li>
<li>Open SonarQube &rarr; find branch &rarr; filter by type</li>
<li>Back to Jira &rarr; add comment &rarr; click transition</li>
</ol>
</ac:rich-text-body>
</ac:structured-macro>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<h4>With MCP</h4>
<p><strong>&quot;Implement PROJ-123&quot;</strong><br/>AI reads the story, searches Confluence for design docs, implements the changes, adds a Jira comment, and moves to In Review.</p>
<p><strong>&quot;Check Veracode&quot;</strong><br/>AI auto-detects the branch, finds the CI scan, shows findings with file paths, and helps fix the code.</p>
<p><strong>&quot;Check SonarQube&quot;</strong><br/>AI shows quality gate status and metrics, asks which category to focus on, and helps apply changes.</p>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>

<h3>3b. QA Workflow: Current vs With MCP</h3>

<ac:structured-macro ac:name="section">
<ac:rich-text-body>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<h4>Current Workflow</h4>
<ol>
<li>Open Jira &rarr; read story &rarr; extract acceptance criteria manually</li>
<li>Open Confluence &rarr; search for test plans or functional specs</li>
<li>Manually map acceptance criteria to test scenarios</li>
<li>Open Veracode/SonarQube &rarr; check if security findings are resolved</li>
<li>Trace epic &rarr; understand full scope &rarr; identify untested stories</li>
<li>Update Jira &rarr; add test notes &rarr; transition ticket</li>
</ol>
</ac:rich-text-body>
</ac:structured-macro>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<h4>With MCP</h4>
<p><strong>&quot;What are the acceptance criteria for PROJ-456?&quot;</strong><br/>AI reads the story and presents every acceptance criterion in plain language.</p>
<p><strong>&quot;Generate test scenarios for PROJ-456&quot;</strong><br/>AI reads the story along with Confluence specs and suggests test cases covering positive, negative, and edge scenarios.</p>
<p><strong>&quot;What stories in epic PROJ-50 are untested?&quot;</strong><br/>AI fetches all stories, checks their status, and highlights those not yet in Done or In Review.</p>
<p><strong>&quot;Check Veracode for open findings&quot;</strong><br/>AI shows remaining vulnerabilities so the team can verify they are resolved before sign-off.</p>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="tip">
<ac:rich-text-body><p><strong>A single conversation can replace navigating across multiple browser tabs &mdash; for both Dev and QA.</strong></p></ac:rich-text-body>
</ac:structured-macro>

<h3>3c. Time &amp; Effort Saved</h3>

<table>
<thead>
<tr><th>Activity</th><th>Role</th><th>Current</th><th>With MCP</th><th>Estimated Savings</th></tr>
</thead>
<tbody>
<tr><td>Read &amp; understand a Jira story</td><td>Dev &amp; QA</td><td>5-10 min</td><td>~10 sec</td><td><strong>~90%</strong></td></tr>
<tr><td>Trace story &rarr; epic &rarr; initiative hierarchy</td><td>Dev &amp; QA</td><td>10-15 min</td><td>~15 sec</td><td><strong>~95%</strong></td></tr>
<tr><td>Find related Confluence docs / test plans</td><td>Dev &amp; QA</td><td>5-10 min</td><td>~10 sec</td><td><strong>~90%</strong></td></tr>
<tr><td>Extract acceptance criteria &amp; map to test cases</td><td>QA</td><td>15-30 min</td><td>1-2 min</td><td><strong>~90%</strong></td></tr>
<tr><td>Check Veracode findings for a PR</td><td>Dev &amp; QA</td><td>5-8 min</td><td>~15 sec</td><td><strong>~95%</strong></td></tr>
<tr><td>Triage SonarQube report</td><td>Dev &amp; QA</td><td>5-8 min</td><td>~10 sec</td><td><strong>~95%</strong></td></tr>
<tr><td>Fix a security finding</td><td>Dev</td><td>15-30 min/finding</td><td>1-3 min</td><td><strong>~80%</strong></td></tr>
<tr><td>Verify security findings are resolved</td><td>QA</td><td>10-15 min</td><td>~15 sec</td><td><strong>~95%</strong></td></tr>
<tr><td>Epic-level test coverage assessment</td><td>QA</td><td>20-30 min</td><td>~30 sec</td><td><strong>~95%</strong></td></tr>
<tr><td>Daily standup prep</td><td>Dev &amp; QA</td><td>10-15 min</td><td>~15 sec</td><td><strong>~95%</strong></td></tr>
</tbody>
</table>

<ac:structured-macro ac:name="warning">
<ac:rich-text-body><p><strong>Estimated potential:</strong> Around 1-2 hours per team member per day could be redirected from context-gathering and navigation back to core work.</p></ac:rich-text-body>
</ac:structured-macro>

<h3>3d. Other Benefits</h3>

<table>
<thead>
<tr><th>Benefit</th><th>For Developers</th><th>For QAs</th></tr>
</thead>
<tbody>
<tr><td><strong>Reduced Context Switching</strong></td><td>Stay in the IDE. No browser tabs for Jira, Confluence, Veracode, SonarQube.</td><td>Stay in one conversation. No switching between Jira, Confluence, and security dashboards.</td></tr>
<tr><td><strong>Consistent Documentation</strong></td><td>AI adds implementation comments to Jira tickets automatically.</td><td>AI adds test notes, verification results, and coverage summaries to Jira tickets.</td></tr>
<tr><td><strong>Faster Security Validation</strong></td><td>Findings come with file+line. AI proposes fixes inline.</td><td>Quickly verify whether security findings from previous scans are resolved before sign-off.</td></tr>
<tr><td><strong>Better Sprint Visibility</strong></td><td colspan="2">Sprint progress, burndown, blockers, and standup updates generated from live Jira data in seconds.</td></tr>
<tr><td><strong>Lower Onboarding Barrier</strong></td><td colspan="2">New team members ask &quot;Trace the hierarchy of PROJ-456&quot; and instantly understand where their work fits.</td></tr>
<tr><td><strong>Zero Learning Curve</strong></td><td colspan="2">Pre-built prompt libraries &mdash; just copy, paste, go.</td></tr>
</tbody>
</table>

<hr/>

<h2>4. Impact</h2>

<ac:structured-macro ac:name="section">
<ac:rich-text-body>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<ac:structured-macro ac:name="panel">
<ac:parameter ac:name="title">Developer Productivity</ac:parameter>
<ac:rich-text-body>
<ul>
<li>Helps reduce repetitive tool navigation &mdash; more time for writing code, less on finding context.</li>
<li>Security findings can be resolved faster &rarr; helping reduce open vulnerabilities at release.</li>
</ul>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<ac:structured-macro ac:name="panel">
<ac:parameter ac:name="title">QA Productivity</ac:parameter>
<ac:rich-text-body>
<ul>
<li>Helps generate test case ideas from Jira stories &amp; Confluence specs in seconds.</li>
<li>Simplifies epic-level coverage assessment without needing to open every story individually.</li>
<li>Makes security scan validation as easy as a single prompt.</li>
</ul>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="section">
<ac:rich-text-body>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<ac:structured-macro ac:name="panel">
<ac:parameter ac:name="title">Code &amp; Release Quality</ac:parameter>
<ac:rich-text-body>
<ul>
<li>Encourages addressing SonarQube and Veracode findings during implementation rather than deferring them.</li>
<li>QA can validate security compliance before release using the same tools devs used to fix.</li>
</ul>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>
<ac:structured-macro ac:name="column">
<ac:parameter ac:name="width">50%</ac:parameter>
<ac:rich-text-body>
<ac:structured-macro ac:name="panel">
<ac:parameter ac:name="title">Process &amp; Team Efficiency</ac:parameter>
<ac:rich-text-body>
<ul>
<li>Encourages consistent documentation &mdash; implementation notes from devs, test notes from QAs on every ticket.</li>
<li>Standup updates can be auto-generated for the whole team from live Jira data.</li>
<li>Epic planning and dependency analysis can happen in a quick conversation, supplementing team discussions.</li>
</ul>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h2>5. Future Scope</h2>

<table>
<thead>
<tr><th>Area</th><th>Enhancement</th><th>Benefits</th></tr>
</thead>
<tbody>
<tr><td><strong>Bitbucket / GitHub PR</strong></td><td>Create PRs, add reviewers, link to Jira tickets.</td><td>Complete loop from story to merge for devs; QAs can review PR scope.</td></tr>
<tr><td><strong>Test Automation Integration</strong></td><td>Run tests from conversation, link results to Jira stories.</td><td>QAs trigger and review test runs without leaving the AI conversation.</td></tr>
<tr><td><strong>CI/CD Pipeline</strong></td><td>Trigger builds, monitor deployments, rollback via natural language.</td><td>Both Dev &amp; QA can monitor build health and deployment status.</td></tr>
<tr><td><strong>Code Review Assist</strong></td><td>AI reviews PRs against acceptance criteria and design docs.</td><td>QAs get AI-assisted review of whether implementation matches requirements.</td></tr>
<tr><td><strong>Test Coverage Reporting</strong></td><td>Map test execution data to Jira stories and epics.</td><td>QAs get instant coverage reports at epic and sprint level.</td></tr>
<tr><td><strong>Metrics Dashboard</strong></td><td>Track velocity, security debt, quality gate pass rates over time.</td><td>Team-wide visibility into quality trends.</td></tr>
<tr><td><strong>Team-Wide Rollout</strong></td><td>Shared MCP server config &mdash; onboard entire teams in minutes.</td><td>Uniform tooling across Dev &amp; QA.</td></tr>
</tbody>
</table>

<hr/>

<h2>Summary</h2>

<ac:structured-macro ac:name="panel">
<ac:parameter ac:name="title">One server. Four integrations. 21 tools. Zero context switching.</ac:parameter>
<ac:rich-text-body>
<p>ZEUS extends the AI assistant into a <strong>team-wide productivity companion</strong> that understands our tickets, our docs, our security posture, and our code &mdash; helping both <strong>Developers</strong> and <strong>QAs</strong> work more efficiently with less context-switching overhead.</p>
</ac:rich-text-body>
</ac:structured-macro>
`;
}

// ── Update existing page ──

async function updatePage() {
  // Get current version
  const getRes = await fetch(`${BASE_URL}/wiki/rest/api/content/${PAGE_ID}?expand=version`, {
    headers: {
      Authorization: `Basic ${AUTH}`,
      Accept: "application/json",
    },
  });
  if (!getRes.ok) {
    throw new Error(`Failed to get page: ${getRes.status} ${await getRes.text()}`);
  }
  const current = await getRes.json();
  const nextVersion = current.version.number + 1;

  console.log(`Current version: ${current.version.number}, updating to ${nextVersion}...`);

  const body = {
    type: "page",
    title: PAGE_TITLE,
    space: { key: SPACE_KEY },
    version: { number: nextVersion },
    body: {
      storage: {
        value: buildPageContent(),
        representation: "storage",
      },
    },
  };

  const res = await fetch(`${BASE_URL}/wiki/rest/api/content/${PAGE_ID}`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${AUTH}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update page: ${res.status}\n${err}`);
  }

  const page = await res.json();
  const pageUrl = `${BASE_URL}/wiki${page._links.webui}`;
  console.log(`\nPage updated successfully!`);
  console.log(`Title: ${page.title}`);
  console.log(`URL:   ${pageUrl}`);
}

// ── Main ──

updatePage().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
