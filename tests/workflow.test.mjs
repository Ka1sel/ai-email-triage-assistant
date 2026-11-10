import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('../workflows/email-triage-assistant.json', import.meta.url)));
const node = name => workflow.nodes.find(item => item.name === name);
const valid = {
  category: 'General', urgency: 'Low', riskLevel: 'Low', suggestedTone: 'Professional',
  requiresHumanReview: false, requiresReply: true, intent: 'Service inquiry',
  summary: 'Asks about automation services', reason: 'Routine request',
};

function classify(data) {
  return vm.runInNewContext(`(function(){${node('Parse & Validate Classification').parameters.jsCode}})()`, {
    $input: { all: () => [{json: {text: typeof data === 'string' ? data : JSON.stringify(data)}}] },
  }, {timeout: 1000})[0].json;
}

function expression(text, data) {
  const code = text.replace(/^\s*=\s*\{\{/, '').replace(/\}\}\s*$/, '');
  return vm.runInNewContext(code, {$json: data}, {timeout: 1000});
}

function route(data) {
  return node('Email Routing').parameters.rules.values
    .filter(rule => expression(rule.conditions.conditions[0].leftValue, data))
    .map(rule => rule.outputKey);
}

test('newsletter is routed only to no reply', () => {
  assert.deepEqual(route(classify({...valid, requiresReply: false})), ['No Reply']);
});
test('billing dispute is routed only to manual review', () => {
  assert.deepEqual(route(classify({...valid, category:'Billing', riskLevel:'High', requiresHumanReview:true})), ['Manual Review']);
});
test('low-risk inquiry is routed only to draft generation', () => {
  assert.deepEqual(route(classify(valid)), ['Generate Draft']);
});
test('high-risk classification forces human review even if model flag is false', () => {
  const parsed = classify({...valid, riskLevel:'High'});
  assert.equal(parsed.requiresHumanReview, true);
  assert.deepEqual(route(parsed), ['Manual Review']);
});
test('medium-risk message requires manual review', () => {
  assert.deepEqual(route(classify({...valid, riskLevel:'Medium'})), ['Manual Review']);
});
test('invalid AI responses fail validation', () => {
  for (const response of ['not json', '[]', 'null', {...valid, urgency:'Urgent'}, {...valid, requiresReply:'true'}, {...valid, summary:''}]) {
    assert.throws(() => classify(response));
  }
});
test('all processing labels stop duplicate intake', () => {
  const check = node('Already Processed?').parameters.conditions.conditions[0].leftValue;
  for (const id of ['REPLACE_AI_DRAFTED_LABEL_ID','REPLACE_AI_NEEDS_REVIEW_LABEL_ID','REPLACE_AI_NO_REPLY_LABEL_ID']) {
    assert.equal(expression(check, {labelIds:['INBOX', id]}), true);
  }
  assert.equal(expression(check, {labelIds:['INBOX']}), false);
  assert.equal(expression(check, {}), false);
});
test('resolved rows cannot reach the timestamp update', () => {
  const rules = node('Needs Resolution Update?').parameters.conditions.conditions;
  function matches(row) {
    return rules.every(rule => {
      const value = expression(rule.leftValue, row);
      return rule.operator.operation === 'equals' ? value === rule.rightValue : value !== rule.rightValue;
    });
  }
  assert.equal(matches({'Action':'Manual Review','Review Status':'Pending'}), true);
  assert.equal(matches({'Action':'Manual Review','Review Status':'Resolved'}), false);
  assert.equal(matches({'Action':'Draft Created','Review Status':''}), false);
});
test('draft preparation preserves email context and refuses empty replies', () => {
  const context = {sender:'alex@example.com',subject:'Service inquiry',threadId:'test-thread',messageId:'test-message'};
  function prepare(text) {
    return vm.runInNewContext(`(function(){${node('Prepare Gmail Draft').parameters.jsCode}})()`, {
      $input:{all:() => [{json:{text}}]}, $:() => ({item:{json:context}}),
    }, {timeout:1000});
  }
  const draft = prepare(' Hello Alex ')[0].json;
  assert.equal(draft.to, context.sender);
  assert.equal(draft.subject, 'Re: Service inquiry');
  assert.equal(draft.replyBody, 'Hello Alex');
  assert.equal(draft.messageId, context.messageId);
  assert.throws(() => prepare(' '));
});
test('shareable export has no account bindings, pinned messages or active triggers', () => {
  const raw = JSON.stringify(workflow);
  assert.equal(workflow.active, false);
  for (const key of ['credentials','pinData','meta','cachedResultUrl','cachedResultName']) assert.equal(raw.includes(`"${key}"`), false);
  assert.equal(/Label_[A-Za-z0-9_-]+/.test(raw), false);
  assert.equal(raw.includes('REPLACE_OTHER_GMAIL_LABEL_ID'), false);
  assert.equal(node('Schedule Trigger').parameters.rule.interval[0].minutesInterval, 5);
  const names = new Set(workflow.nodes.map(item => item.name));
  for (const [source, channels] of Object.entries(workflow.connections)) {
    assert.ok(names.has(source));
    for (const outputs of Object.values(channels)) for (const edges of outputs) for (const edge of edges) assert.ok(names.has(edge.node));
  }
});
