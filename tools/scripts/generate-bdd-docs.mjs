#!/usr/bin/env node
/**
 * @fileoverview Living documentation generator for ShiftSync BDD specifications.
 * Parses Gherkin .feature files and outputs docs/wiki/BDD-Living-Documentation.md,
 * syncing business rules, user journeys, and acceptance criteria to the GitHub Wiki.
 *
 * Usage:
 *   node tools/scripts/generate-bdd-docs.mjs         # Generate docs
 *   node tools/scripts/generate-bdd-docs.mjs --check # Verify docs are up-to-date
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const featuresDir = path.join(workspaceRoot, 'apps/client-e2e/src/features');
const wikiDocsPath = path.join(
  workspaceRoot,
  'docs/wiki/BDD-Living-Documentation.md',
);

const isCheckMode = process.argv.includes('--check');

/**
 * Parses a single .feature file into structured metadata.
 *
 * @param {string} filePath - Absolute path to .feature file.
 * @returns {Object} Structured feature object.
 */
function parseFeatureFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let featureTitle = '';
  const featureDescLines = [];
  const featureTags = [];
  const rules = [];

  let currentRule = { title: 'General Scenarios', scenarios: [] };
  let currentScenario = null;
  let pendingTags = [];
  let inFeatureHeader = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('@')) {
      const tags = trimmed.split(/\s+/).filter(Boolean);
      pendingTags.push(...tags);
      continue;
    }

    if (trimmed.startsWith('Feature:')) {
      featureTitle = trimmed.replace(/^Feature:\s*/, '').trim();
      featureTags.push(...pendingTags);
      pendingTags = [];
      inFeatureHeader = true;
      continue;
    }

    if (trimmed.startsWith('Rule:')) {
      if (currentScenario) {
        currentRule.scenarios.push(currentScenario);
        currentScenario = null;
      }
      if (currentRule.scenarios.length > 0) {
        rules.push(currentRule);
      }
      currentRule = {
        title: trimmed.replace(/^Rule:\s*/, '').trim(),
        scenarios: [],
      };
      inFeatureHeader = false;
      continue;
    }

    if (
      trimmed.startsWith('Scenario:') ||
      trimmed.startsWith('Scenario Outline:')
    ) {
      inFeatureHeader = false;
      if (currentScenario) {
        currentRule.scenarios.push(currentScenario);
      }
      currentScenario = {
        title: trimmed.replace(/^(Scenario|Scenario Outline):\s*/, '').trim(),
        tags: [...pendingTags],
        steps: [],
      };
      pendingTags = [];
      continue;
    }

    if (
      trimmed.startsWith('Given ') ||
      trimmed.startsWith('When ') ||
      trimmed.startsWith('Then ') ||
      trimmed.startsWith('And ') ||
      trimmed.startsWith('But ')
    ) {
      if (currentScenario) {
        currentScenario.steps.push(trimmed);
      }
      continue;
    }

    if (inFeatureHeader) {
      featureDescLines.push(trimmed);
    }
  }

  if (currentScenario) {
    currentRule.scenarios.push(currentScenario);
  }
  if (currentRule.scenarios.length > 0) {
    rules.push(currentRule);
  }

  return {
    filename: path.basename(filePath),
    title: featureTitle,
    description: featureDescLines.join('\n'),
    tags: featureTags,
    rules,
  };
}

/**
 * Generates Markdown living documentation from parsed features.
 *
 * @param {Array<Object>} features - List of parsed feature objects.
 * @returns {string} Markdown document.
 */
function generateMarkdown(features) {
  let totalRules = 0;
  let totalScenarios = 0;
  const tagCounts = {};

  for (const f of features) {
    for (const r of f.rules) {
      totalRules++;
      for (const s of r.scenarios) {
        totalScenarios++;
        const allTags = new Set([...f.tags, ...s.tags]);
        for (const tag of allTags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
  }

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  let md = `# Behavior-Driven Development (BDD) Living Documentation

## 1. Executive Summary

This document serves as the **executable, living specification** for Coastal Eats' ShiftSync platform.
All scenarios listed below are written in **business-readable Gherkin** syntax and directly compiled into automated Playwright browser tests executed in continuous integration.

Non-technical stakeholders, product owners, and engineers share these specifications as the single source of truth for application behavior.

---

## 2. Test Suite Metrics

| Metric | Total Count |
| :--- | :--- |
| **Total Features** | **${features.length}** |
| **Business Rules** | **${totalRules}** |
| **Automated Scenarios** | **${totalScenarios}** |
| **Smoke Suite Coverage (\`@smoke\`)** | **${tagCounts['@smoke'] || 0} scenarios** |

### Tag Index
${sortedTags.map(([tag, count]) => `- \`${tag}\`: ${count} scenario(s)`).join('\n')}

---

## 3. Canonical Test Personas

Scenarios leverage concrete Coastal Eats personas matching seeded restaurant personnel:

| Persona | Role | Location(s) | Primary Purpose in BDD Suites |
| :--- | :--- | :--- | :--- |
| **Alice Admin** | Corporate Admin | Global (All Locations) | System oversight, emergency schedule overrides, global audit trail |
| **Bob Manager** | Manager | Downtown & Uptown (NY) | Scheduling, staff suggestions, cutoff locks, peer swap approvals |
| **Diana Manager** | Manager | The Beach Grill (LA) | Regional LBAC isolation, managing West Coast schedule |
| **Charlie Staff** | Staff (Server/Bartender) | Downtown & Uptown (NY) | Shift marketplace swaps, desired hours tracking, notification sync |
| **Dave Staff** | Staff (Line Cook) | Downtown (NY) | Peer swap partner, skills matching |
| **Eva Staff** | Staff (Server) | Uptown (NY) | Secondary NY peer |
| **Frank Staff** | Staff (Line Cook/Bartender) | NY Locations | 7th consecutive day overtime override testing |
| **Grace Staff** | Staff (Host/Server) | The Beach Grill (LA) | LA regional privacy verification |
| **Heidi Staff** | Staff (Bartender) | The Beach Grill (LA) | LA staff peer verification |

---

## 4. Living Specifications by Capability
`;

  for (const f of features) {
    md += `\n### 📦 ${f.title}\n\n`;
    md += `**File**: \`apps/client-e2e/src/features/${f.filename}\`  \n`;
    md += `**Tags**: ${f.tags.map((t) => `\`${t}\``).join(' ')}\n\n`;

    if (f.description) {
      md += `> ${f.description.replace(/\n/g, '\n> ')}\n\n`;
    }

    for (const r of f.rules) {
      if (r.title !== 'General Scenarios') {
        md += `#### 📋 Rule: ${r.title}\n\n`;
      }

      for (const s of r.scenarios) {
        const scenarioTags =
          s.tags.length > 0
            ? ` ${s.tags.map((t) => `\`${t}\``).join(' ')}`
            : '';
        md += `##### Scenario: ${s.title}${scenarioTags}\n\n`;
        md += '```gherkin\n';
        for (const step of s.steps) {
          md += `  ${step}\n`;
        }
        md += '```\n\n';
      }
    }

    md += '---\n';
  }

  md += `
## 5. Traceability and Quality Gates

- **Automated Execution**: Run locally via \`npm run bdd:test\` or interactively via \`npm run bdd:ui\`.
- **Stakeholder Reports**: Every run produces an interactive HTML report at \`dist/bdd-report/index.html\`.
- **Wiki Synchronization**: Pushing changes to \`develop\` or \`main\` automatically publishes this living document to the [ShiftSync GitHub Wiki](https://github.com/JayKay24/ShiftSync/wiki/BDD-Living-Documentation).
`;

  return md;
}

function main() {
  const featureFiles = fs
    .readdirSync(featuresDir)
    .filter((f) => f.endsWith('.feature'))
    .sort();

  const features = featureFiles.map((file) =>
    parseFeatureFile(path.join(featuresDir, file)),
  );

  const generatedMd = generateMarkdown(features);

  if (isCheckMode) {
    if (!fs.existsSync(wikiDocsPath)) {
      console.error(
        `[BDD-DOCS ERROR] Living documentation file not found at ${wikiDocsPath}. Run "npm run bdd:docs" to create it.`,
      );
      process.exit(1);
    }
    const currentMd = fs.readFileSync(wikiDocsPath, 'utf-8');
    if (currentMd !== generatedMd) {
      console.error(
        '[BDD-DOCS ERROR] Living documentation is out of date with .feature files. Run "npm run bdd:docs" to update it.',
      );
      process.exit(1);
    }
    console.log(
      '✓ BDD Living Documentation is up to date with all .feature files.',
    );
    process.exit(0);
  }

  fs.writeFileSync(wikiDocsPath, generatedMd, 'utf-8');
  console.log(
    `✓ BDD Living Documentation generated successfully at: ${wikiDocsPath}`,
  );
}

main();
