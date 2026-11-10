import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run locally against your original export. The original file is never changed.
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/prepare-workflow.mjs "path/to/original.json"');
const original = JSON.parse(await readFile(resolve(sourcePath), 'utf8'));
if (!Array.isArray(original.nodes) || !original.connections) throw new Error('Expected a single n8n workflow export.');

const replacements = new Map();
for (const node of original.nodes) {
  const label = {
    'Label - AI Drafted': 'REPLACE_AI_DRAFTED_LABEL_ID',
    'Label - Needs Review': 'REPLACE_AI_NEEDS_REVIEW_LABEL_ID',
    'Label - No Reply': 'REPLACE_AI_NO_REPLY_LABEL_ID',
  }[node.name];
  for (const value of node.parameters?.labelIds ?? []) {
    if (label && typeof value === 'string' && !value.startsWith('=')) replacements.set(value, label);
  }
  if (node.name === 'Find Resolved Emails') {
    for (const value of node.parameters?.filters?.labelIds ?? []) {
      if (typeof value === 'string' && !value.startsWith('=')) replacements.set(value, 'REPLACE_AI_RESOLVED_LABEL_ID');
    }
  }
}

function clean(value, key = '') {
  if (Array.isArray(value)) return value.map(item => clean(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([name]) => !['credentials', 'pinData', 'meta', 'cachedResultName', 'cachedResultUrl', 'webhookId'].includes(name))
      .map(([name, item]) => {
        if (name === 'documentId' && item && typeof item === 'object') {
          return [name, { __rl: true, value: 'REPLACE_SPREADSHEET_ID', mode: 'id' }];
        }
        if (name === 'sheetName' && item && typeof item === 'object') {
          return [name, { __rl: true, value: 'Activity Log', mode: 'name' }];
        }
        return [name, clean(item, name)];
      }));
  }
  if (typeof value === 'string') {
    for (const [oldValue, newValue] of replacements) value = value.replaceAll(oldValue, newValue);
    value = value.replace(/Label_[A-Za-z0-9_-]+/g, 'REPLACE_OTHER_GMAIL_LABEL_ID');
    value = value.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      address => address.toLowerCase().endsWith('@example.com') ? address : 'sample@example.com');
    if (/^(authorization|apiKey|accessToken|refreshToken|clientSecret|password)$/i.test(key)) {
      return 'REPLACE_PRIVATE_VALUE';
    }
  }
  return value;
}

const sanitized = clean({
  name: 'AI Email Triage & Draft Assistant',
  nodes: original.nodes,
  connections: original.connections,
  settings: original.settings,
  active: false,
});
// Make the shared template's configurable labels and schedule explicit.
const duplicateCheck = sanitized.nodes.find(node => node.name === 'Already Processed?');
duplicateCheck.parameters.conditions.conditions = [{
  id: 'processed-label-check',
  leftValue: "={{ ($json.labelIds || []).some(id => ['REPLACE_AI_DRAFTED_LABEL_ID', 'REPLACE_AI_NEEDS_REVIEW_LABEL_ID', 'REPLACE_AI_NO_REPLY_LABEL_ID'].includes(id)) }}",
  rightValue: '',
  operator: { type: 'boolean', operation: 'true', singleValue: true },
}];
sanitized.nodes.find(node => node.name === 'Schedule Trigger').parameters.rule.interval = [{field: 'minutes', minutesInterval: 5}];
const target = new URL('../workflows/email-triage-assistant.json', import.meta.url);
await mkdir(dirname(fileURLToPath(target)), { recursive: true });
await writeFile(target, JSON.stringify(sanitized, null, 2) + '\n');
console.log(`Prepared ${sanitized.nodes.length} nodes, inactive, without credential bindings or pinned data.`);
console.log('Inspect literal values, prompts, and code manually before publishing.');
