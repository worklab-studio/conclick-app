// Daily SEO content generator. Walks the backlog (topics.mjs), finds the next
// topic(s) without a file on disk, drafts each with an OpenAI model (function-
// calling structured output), writes the typed ContentEntry, and regenerates the
// registry.
//
//   OPENAI_API_KEY=... node scripts/seo/generate.mjs            # 1 page
//   OPENAI_API_KEY=... node scripts/seo/generate.mjs --count 3  # next 3
//   node scripts/seo/generate.mjs --list                        # show remaining
//   OPENAI_API_KEY=... node scripts/seo/generate.mjs --topic comparison/fathom
//   OPENAI_API_KEY=... node scripts/seo/generate.mjs --dry      # draft, don't write
//
// Model is configurable: SEO_MODEL (or OPENAI_MODEL), default gpt-4.1.
// Requires: npm i openai   (and OPENAI_API_KEY in the env).

import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { TOPICS } from './topics.mjs';
import { promptFor, DRAFT_SCHEMA } from './prompts.mjs';
import { assembleEntry, writeEntry, regenerateIndex, CONTENT } from './lib.mjs';

const MODEL = process.env.SEO_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1';

const SYSTEM =
  'You are an expert SEO content strategist and writer for Conclick, a privacy-first web analytics product with revenue attribution. You produce exactly one structured page draft per request by calling the emit_page function. Write for humans first and search/AI engines second. Never break the founder voice. Never invent product facts beyond what you are given.';

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? true : def;
};
const list = args.includes('--list');
const dry = args.includes('--dry');
const only = flag('--topic', null); // "type/slug"
const count = parseInt(flag('--count', '1'), 10) || 1;

const exists = t => fs.existsSync(path.join(CONTENT, t.dir, `${t.slug}.ts`));
const remaining = TOPICS.filter(t => !exists(t));

if (list) {
  console.log(`${remaining.length} topics remaining of ${TOPICS.length}:`);
  for (const t of remaining) console.log(`  ${t.type}/${t.slug}`);
  process.exit(0);
}

let queue;
if (only) {
  const [type, slug] = String(only).split('/');
  const t = TOPICS.find(x => x.type === type && x.slug === slug);
  if (!t) {
    console.error(`Unknown topic: ${only}`);
    process.exit(1);
  }
  queue = [t];
} else {
  queue = remaining.slice(0, count);
}

if (!queue.length) {
  console.log('Backlog is empty — nothing to generate. Add topics in scripts/seo/topics.mjs.');
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error(
    'OPENAI_API_KEY is not set — cannot generate. In CI, add the repo secret; locally, prefix the command with OPENAI_API_KEY=…',
  );
  process.exit(1);
}

const client = new OpenAI(); // reads OPENAI_API_KEY
const today = new Date().toISOString().slice(0, 10);

async function callModel(topic) {
  const resp = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: promptFor(topic) },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'emit_page',
          description: 'Emit the finished, structured page draft.',
          parameters: DRAFT_SCHEMA,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'emit_page' } },
  });
  const call = resp.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error('model did not return an emit_page tool call');
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    throw new Error('model returned invalid JSON arguments');
  }
}

// One retry — autopilot should shrug off a transient bad response.
async function draftOne(topic) {
  try {
    return await callModel(topic);
  } catch (err) {
    console.warn(`\n  retrying (${err.message}) …`);
    return await callModel(topic);
  }
}

let n = 0;
for (const topic of queue) {
  process.stdout.write(`Generating ${topic.type}/${topic.slug} … `);
  try {
    const draft = await draftOne(topic);
    if (dry) {
      console.log(`ok (dry-run, not written) — h1: "${draft.h1}"`);
      continue;
    }
    const file = writeEntry(assembleEntry({ ...topic, draft }, today));
    console.log(`wrote ${file}`);
    n++;
  } catch (err) {
    console.error(`FAILED — ${err.message}`);
  }
}

if (!dry && n > 0) {
  const total = regenerateIndex();
  console.log(`\nDone. ${n} new page(s); registry imports ${total} content files.`);
}

// A non-empty queue that produced zero pages means every attempt errored —
// exit non-zero so CI shows red instead of a silent green no-op.
if (!dry && queue.length > 0 && n === 0) {
  console.error(`\nAll ${queue.length} generation attempt(s) failed.`);
  process.exit(1);
}
