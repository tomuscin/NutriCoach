// AI Prompt Registry — ETAP 5.5
// Centralized versioned registry for all prompt configurations.
// Supports A/B prompt experimentation via experimentGroup.
//
// DESIGN:
//   - Prompts are immutable records (never modify, add new version)
//   - Active flag controls which version is live
//   - experimentGroup allows parallel evaluation
//   - Registry is purely in-memory (no DB) — fast, predictable, SSR-safe

import { PROMPT_VERSION } from './prompt-builder'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PromptRecord = {
  id: string                    // unique, e.g. "morning-v1.1-pl"
  version: string               // semver-like: "1.1"
  type: 'MORNING' | 'MIDDAY' | 'EVENING'
  active: boolean               // only one active per type
  description: string           // what changed vs previous
  createdAt: string             // ISO date
  experimentGroup?: string      // 'control' | 'experiment_A' | 'experiment_B'
  deprecatedAt?: string         // ISO date if superseded
}

export type PromptRegistryEntry = PromptRecord & {
  systemPromptKey: string       // key in SYSTEM_PROMPTS map
  features: string[]            // features this version supports
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PROMPT_REGISTRY: PromptRegistryEntry[] = [
  // ── v1.0 — ETAP 5 initial (deprecated by v1.1) ───────────────────────────
  {
    id: 'morning-v1.0-pl',
    version: '1.0',
    type: 'MORNING',
    active: false,
    description: 'Initial morning prompt — no explainability fields',
    createdAt: '2026-05-11',
    deprecatedAt: '2026-05-12',
    experimentGroup: 'control',
    systemPromptKey: 'MORNING',
    features: ['summary', 'readiness', 'recommendation', 'warnings', 'confidence'],
  },
  {
    id: 'midday-v1.0-pl',
    version: '1.0',
    type: 'MIDDAY',
    active: false,
    description: 'Initial midday prompt — no explainability fields',
    createdAt: '2026-05-11',
    deprecatedAt: '2026-05-12',
    experimentGroup: 'control',
    systemPromptKey: 'MIDDAY',
    features: ['summary', 'pacingStatus', 'remainingCalories', 'warnings', 'confidence'],
  },
  {
    id: 'evening-v1.0-pl',
    version: '1.0',
    type: 'EVENING',
    active: false,
    description: 'Initial evening prompt — no explainability fields',
    createdAt: '2026-05-11',
    deprecatedAt: '2026-05-12',
    experimentGroup: 'control',
    systemPromptKey: 'EVENING',
    features: ['summary', 'dayScore', 'consistency', 'tomorrowFocus', 'warnings', 'confidence'],
  },

  // ── v1.1 — ETAP 5.5 (active) ─────────────────────────────────────────────
  {
    id: 'morning-v1.1-pl',
    version: '1.1',
    type: 'MORNING',
    active: true,
    description: 'Explainability: added primaryDrivers, supportingSignals. Quality context injection.',
    createdAt: '2026-05-12',
    systemPromptKey: 'MORNING',
    features: ['summary', 'readiness', 'recommendation', 'explanations', 'warnings', 'confidence', 'quality_context'],
  },
  {
    id: 'midday-v1.1-pl',
    version: '1.1',
    type: 'MIDDAY',
    active: true,
    description: 'Explainability: added primaryDrivers, supportingSignals. Quality context injection.',
    createdAt: '2026-05-12',
    systemPromptKey: 'MIDDAY',
    features: ['summary', 'pacingStatus', 'remainingCalories', 'explanations', 'warnings', 'confidence', 'quality_context'],
  },
  {
    id: 'evening-v1.1-pl',
    version: '1.1',
    type: 'EVENING',
    active: true,
    description: 'Explainability: added primaryDrivers, supportingSignals. Quality context injection.',
    createdAt: '2026-05-12',
    systemPromptKey: 'EVENING',
    features: ['summary', 'dayScore', 'consistency', 'tomorrowFocus', 'explanations', 'warnings', 'confidence', 'quality_context'],
  },
]

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getActivePrompt(type: 'MORNING' | 'MIDDAY' | 'EVENING'): PromptRegistryEntry {
  const active = PROMPT_REGISTRY.find((p) => p.type === type && p.active)
  if (!active) throw new Error(`No active prompt found for type: ${type}`)
  return active
}

export function getPromptById(id: string): PromptRegistryEntry | undefined {
  return PROMPT_REGISTRY.find((p) => p.id === id)
}

export function getActiveVersion(): string {
  return PROMPT_VERSION  // from prompt-builder.ts
}

export function getRegistrySnapshot(): PromptRecord[] {
  return PROMPT_REGISTRY.map(({ systemPromptKey: _sk, features: _f, ...rest }) => rest)
}

// ─── Experiment group resolver ────────────────────────────────────────────────
// Future: route user to experiment_A or experiment_B based on userId hash

export function resolveExperimentGroup(userId: string): 'control' | 'experiment_A' | 'experiment_B' {
  // Simple deterministic hash for consistent routing per user
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  const bucket = Math.abs(hash) % 100
  if (bucket < 80) return 'control'
  if (bucket < 90) return 'experiment_A'
  return 'experiment_B'
}
