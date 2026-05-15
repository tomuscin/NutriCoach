#!/usr/bin/env tsx
/**
 * PMOS Conversation Cognition Sync
 * ----------------------------------
 * Persists an AI-human conversation artifact to:
 *   1. apps/pmos/.pmos/conversations/<conversation_id>.json
 *   2. apps/pmos/.pmos/conversations/<conversation_id>.md  (summary)
 *   3. PMOS DB via /api/conversations (if PMOS is running)
 *
 * Usage:
 *   npm run sync:pmos-conversations
 *   npx tsx scripts/sync-pmos-conversations.ts
 *   npx tsx scripts/sync-pmos-conversations.ts --url http://localhost:3200
 *
 * Trigger word:
 *   memory → npm run sync:pmos-conversations
 *
 * The script runs interactive prompts to collect conversation metadata,
 * then writes structured JSON + markdown artifacts to the filesystem.
 */

import { createInterface } from 'readline'
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

// ── Config ───────────────────────────────────────────────────────────────────

const WORKSPACE_ROOT = resolve(__dirname, '..')
const CONVERSATIONS_DIR = resolve(WORKSPACE_ROOT, 'apps/pmos/.pmos/conversations')
const DEFAULT_PMOS_URL = process.env.PMOS_URL ?? 'http://localhost:3200'

// ── Types ────────────────────────────────────────────────────────────────────

interface LinkedEntities {
  decisions: string[]      // ADR ids or numbers e.g. ["ADR-008"]
  warnings: string[]       // warning ids or titles
  roadmapNodes: string[]   // node titles or ids
  executions: string[]     // execution log titles or ids
  principles: string[]     // principle titles
  prompts: string[]        // prompt execution titles or ids
}

interface ConversationArtifact {
  conversation_id: string
  timestamp: string
  project: string
  task_id: string | null
  etap: string | null
  subetap: string | null
  domains: string[]
  conversation_type: ConversationType
  importance_level: ImportanceLevel
  user_prompt: string
  llm_response: string
  summary: string
  linked_entities: LinkedEntities
  chronology_order: number
  tags: string[]
}

type ConversationType =
  | 'implementation'
  | 'architecture'
  | 'debugging'
  | 'philosophy'
  | 'runtime_analysis'
  | 'orchestration'
  | 'ux'
  | 'continuity'
  | 'governance'
  | 'infrastructure'

type ImportanceLevel = 'low' | 'medium' | 'high' | 'foundational'

// ── Helpers ──────────────────────────────────────────────────────────────────

function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function nextChronologyOrder(): number {
  if (!existsSync(CONVERSATIONS_DIR)) return 1
  const files = readdirSync(CONVERSATIONS_DIR).filter((f) => f.endsWith('.json'))
  return files.length + 1
}

function parseList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function validateConversationType(raw: string): ConversationType {
  const valid: ConversationType[] = [
    'implementation', 'architecture', 'debugging', 'philosophy',
    'runtime_analysis', 'orchestration', 'ux', 'continuity',
    'governance', 'infrastructure',
  ]
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_') as ConversationType
  return valid.includes(normalized) ? normalized : 'implementation'
}

function validateImportanceLevel(raw: string): ImportanceLevel {
  const valid: ImportanceLevel[] = ['low', 'medium', 'high', 'foundational']
  const normalized = raw.trim().toLowerCase() as ImportanceLevel
  return valid.includes(normalized) ? normalized : 'medium'
}

// ── Markdown builder ─────────────────────────────────────────────────────────

function buildMarkdown(artifact: ConversationArtifact): string {
  const lines: string[] = [
    `# Conversation: ${artifact.conversation_id}`,
    ``,
    `> **Timestamp:** ${artifact.timestamp}`,
    `> **Type:** ${artifact.conversation_type} | **Importance:** ${artifact.importance_level}`,
    artifact.etap ? `> **ETAP:** ${artifact.etap}${artifact.subetap ? ` / ${artifact.subetap}` : ''}` : '',
    artifact.task_id ? `> **Task ID:** ${artifact.task_id}` : '',
    `> **Order:** #${artifact.chronology_order}`,
    ``,
    `---`,
    ``,
    `## Summary`,
    ``,
    artifact.summary,
    ``,
    `---`,
    ``,
    `## User Prompt`,
    ``,
    '```',
    artifact.user_prompt,
    '```',
    ``,
    `## LLM Response`,
    ``,
    artifact.llm_response,
    ``,
  ]

  if (artifact.domains.length > 0) {
    lines.push(`## Domains`)
    lines.push(``)
    artifact.domains.forEach((d) => lines.push(`- ${d}`))
    lines.push(``)
  }

  const { linked_entities: le } = artifact
  const hasLinks =
    le.decisions.length > 0 ||
    le.warnings.length > 0 ||
    le.roadmapNodes.length > 0 ||
    le.executions.length > 0 ||
    le.principles.length > 0 ||
    le.prompts.length > 0

  if (hasLinks) {
    lines.push(`## Linked Entities`)
    lines.push(``)
    if (le.decisions.length > 0) lines.push(`**Decisions:** ${le.decisions.join(', ')}`)
    if (le.warnings.length > 0) lines.push(`**Warnings:** ${le.warnings.join(', ')}`)
    if (le.roadmapNodes.length > 0) lines.push(`**Roadmap Nodes:** ${le.roadmapNodes.join(', ')}`)
    if (le.executions.length > 0) lines.push(`**Executions:** ${le.executions.join(', ')}`)
    if (le.principles.length > 0) lines.push(`**Principles:** ${le.principles.join(', ')}`)
    if (le.prompts.length > 0) lines.push(`**Prompts:** ${le.prompts.join(', ')}`)
    lines.push(``)
  }

  if (artifact.tags.length > 0) {
    lines.push(`## Tags`)
    lines.push(``)
    lines.push(artifact.tags.map((t) => `\`${t}\``).join(' '))
    lines.push(``)
  }

  return lines.filter((l) => l !== undefined && l !== null).join('\n')
}

// ── PMOS API persistence ─────────────────────────────────────────────────────

async function persistToDb(artifact: ConversationArtifact, pmosUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${pmosUrl}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(artifact),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Interactive prompts ──────────────────────────────────────────────────────

function question(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function collectArtifact(): Promise<ConversationArtifact> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   PMOS Conversation Cognition Sync               ║')
  console.log('╚══════════════════════════════════════════════════╝\n')
  console.log('Persisting AI-human reasoning to PMOS memory.\n')
  console.log('Fields marked [optional] can be left blank.\n')

  const taskId = await question(rl, 'Task ID [optional, e.g. ETAP-05-00-CONV...]: ')
  const etap = await question(rl, 'ETAP [optional, e.g. ETAP-05]: ')
  const subetap = await question(rl, 'Sub-ETAP [optional, e.g. 05-00]: ')

  console.log('\nConversation types: implementation | architecture | debugging | philosophy')
  console.log('  runtime_analysis | orchestration | ux | continuity | governance | infrastructure')
  const typeRaw = await question(rl, 'Type [default: implementation]: ')

  console.log('\nImportance levels: low | medium | high | foundational')
  const importanceRaw = await question(rl, 'Importance [default: medium]: ')

  const domainsRaw = await question(rl, 'Domains [comma-separated, optional]: ')
  const tagsRaw = await question(rl, 'Tags [comma-separated, optional]: ')

  console.log('\nLinked entities (leave blank if none):')
  const decisionsRaw = await question(rl, '  Decisions [e.g. ADR-008, ADR-012]: ')
  const warningsRaw = await question(rl, '  Warnings [titles or ids]: ')
  const nodesRaw = await question(rl, '  Roadmap nodes [titles]: ')
  const executionsRaw = await question(rl, '  Executions [titles or ids]: ')
  const principlesRaw = await question(rl, '  Principles [titles]: ')
  const promptsRaw = await question(rl, '  Prompts [titles or ids]: ')

  console.log('\nUser prompt (paste, then press Enter twice when done):')
  const userPromptLines: string[] = []
  let emptyCount = 0
  rl.on('line', () => {}) // ensure line events fire
  const userPrompt = await new Promise<string>((resolve) => {
    const tempRl = createInterface({ input: process.stdin, output: process.stdout })
    const lines: string[] = []
    let blanks = 0
    tempRl.on('line', (line) => {
      if (line === '' && lines.length > 0) {
        blanks++
        if (blanks >= 2) {
          tempRl.close()
          resolve(lines.join('\n'))
        } else {
          lines.push(line)
        }
      } else {
        blanks = 0
        lines.push(line)
      }
    })
  })

  console.log('\nLLM response / summary of what was built (paste, then press Enter twice when done):')
  const llmResponse = await new Promise<string>((resolve) => {
    const tempRl = createInterface({ input: process.stdin, output: process.stdout })
    const lines: string[] = []
    let blanks = 0
    tempRl.on('line', (line) => {
      if (line === '' && lines.length > 0) {
        blanks++
        if (blanks >= 2) {
          tempRl.close()
          resolve(lines.join('\n'))
        } else {
          lines.push(line)
        }
      } else {
        blanks = 0
        lines.push(line)
      }
    })
  })

  const summary = await question(rl, '\nOne-line summary (high-signal retrieval): ')
  rl.close()

  const conversationId = `conv-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${createId()}`

  return {
    conversation_id: conversationId,
    timestamp: new Date().toISOString(),
    project: 'leaxaro',
    task_id: taskId?.trim() || null,
    etap: etap?.trim() || null,
    subetap: subetap?.trim() || null,
    domains: parseList(domainsRaw),
    conversation_type: validateConversationType(typeRaw || 'implementation'),
    importance_level: validateImportanceLevel(importanceRaw || 'medium'),
    user_prompt: (userPromptLines.join('\n') || userPrompt).trim(),
    llm_response: llmResponse.trim(),
    summary: summary.trim(),
    linked_entities: {
      decisions: parseList(decisionsRaw),
      warnings: parseList(warningsRaw),
      roadmapNodes: parseList(nodesRaw),
      executions: parseList(executionsRaw),
      principles: parseList(principlesRaw),
      prompts: parseList(promptsRaw),
    },
    chronology_order: nextChronologyOrder(),
    tags: parseList(tagsRaw),
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  let pmosUrl = DEFAULT_PMOS_URL
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) pmosUrl = args[++i]
  }

  mkdirSync(CONVERSATIONS_DIR, { recursive: true })

  const artifact = await collectArtifact()

  // Write JSON artifact
  const jsonPath = resolve(CONVERSATIONS_DIR, `${artifact.conversation_id}.json`)
  writeFileSync(jsonPath, JSON.stringify(artifact, null, 2), 'utf-8')

  // Write markdown summary
  const mdPath = resolve(CONVERSATIONS_DIR, `${artifact.conversation_id}.md`)
  writeFileSync(mdPath, buildMarkdown(artifact), 'utf-8')

  console.log(`\n✅ Artifact saved:`)
  console.log(`   JSON: ${jsonPath}`)
  console.log(`   MD:   ${mdPath}`)

  // Persist to DB via PMOS API
  console.log(`\n↗  Persisting to PMOS DB (${pmosUrl})...`)
  const ok = await persistToDb(artifact, pmosUrl)
  if (ok) {
    console.log('✅ Persisted to PMOS database.')
  } else {
    console.log('⚠  PMOS not reachable — filesystem artifact saved. Run db:push when PMOS is online.')
  }

  console.log(`\n📌 Conversation ID: ${artifact.conversation_id}`)
  console.log(`📊 Chronology order: #${artifact.chronology_order}`)
  console.log(`🏷  Importance: ${artifact.importance_level} | Type: ${artifact.conversation_type}\n`)
}

main().catch((err) => {
  console.error('❌ sync-pmos-conversations failed:', err)
  process.exit(1)
})
