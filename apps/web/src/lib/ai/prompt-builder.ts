// AI Prompt Builder — ETAP 5 + ETAP 5.5
// Versioned, modular, deterministic prompts for all coaching touchpoints.
// All prompts return strict JSON — no free-form text.
// ETAP 5.5: Added explainability fields + quality context injection.

import type { AIContext } from './context-builder'
import type { QualityReport } from './quality-engine'

export const PROMPT_VERSION = '1.1'  // bumped for explainability fields

// ─── JSON Schema instructions (appended to every user prompt) ─────────────────

const JSON_INSTRUCTION = `
Odpowiedź WYŁĄCZNIE w formacie JSON. Nie dodawaj żadnych komentarzy, markdown ani wyjaśnień poza JSON.
Odpowiedź musi być jednym obiektem JSON zaczynającym się od { i kończącym na }.`

const EXPLANATIONS_SCHEMA = `  "explanations": {
    "primaryDrivers": ["max 3 główne czynniki wpływające na zalecenie (np. 'Niski HRV = obniżona readiness')"],
    "supportingSignals": ["max 3 sygnały potwierdzające (np. 'Sen 7.2h w normie')"],
    "warnings": ["max 2 ważne zastrzeżenia lub []"]
  },`

// ─── System prompts ───────────────────────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  MORNING: `Jesteś Leaxaro — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz dane użytkownika i generujesz poranny brief dnia.
Twoje zalecenia są konkretne, oparte na danych i bezpieczne.
Nigdy nie diagnozujesz chorób. Nie zastępujesz lekarza.
Zawsze wyjaśniaj DLACZEGO — podaj konkretne sygnały danych jako uzasadnienie.
Odpowiadasz wyłącznie w JSON.`,

  MIDDAY: `Jesteś Leaxaro — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz dane bieżącego dnia i generujesz południkowy check-in.
Twoje zalecenia są zwięzłe, praktyczne i oparte na danych.
Zawsze wyjaśniaj DLACZEGO — podaj konkretne sygnały danych jako uzasadnienie.
Odpowiadasz wyłącznie w JSON.`,

  EVENING: `Jesteś Leaxaro — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz miniony dzień i przygotowujesz wieczorne podsumowanie z planem na jutro.
Twoje zalecenia są konstruktywne, oparte na danych i bezpieczne.
Zawsze wyjaśniaj DLACZEGO — podaj konkretne sygnały danych jako uzasadnienie.
Odpowiadasz wyłącznie w JSON.`,
} as const

export type PromptType = keyof typeof SYSTEM_PROMPTS

// ─── User prompt builders ─────────────────────────────────────────────────────

export function buildMorningPrompt(serializedContext: string, qualitySection?: string): string {
  return `${serializedContext}${qualitySection ? `\n\n${qualitySection}` : ''}

Wygeneruj poranny brief dla użytkownika.

Wymagany JSON:
{
  "summary": "Zwięzłe podsumowanie dnia (max 2 zdania, po polsku, na 'Ty')",
  "readiness": "low" | "medium" | "high",
  "yesterdaySummary": "Co udało się wczoraj (kalorie, białko, trening) — 1 zdanie",
  "recommendation": {
    "calories": <int, min 1200, max 4500>,
    "protein": <int, min 80, max 350>,
    "carbs": <int, min 50, max 700>,
    "fat": <int, min 25, max 250>
  },
  "movement": "Zalecenie ruchowe na dziś (1 zdanie)",
  "recoveryNote": "Opcjonalna notatka o regeneracji (1 zdanie lub null)",
${EXPLANATIONS_SCHEMA}
  "warnings": ["max 3 krótkie ostrzeżenia lub pusta tablica []"],
  "confidence": <float 0.0-1.0, niżej gdy mało danych lub brakujące sygnały>
}
${JSON_INSTRUCTION}`
}

export function buildMiddayPrompt(serializedContext: string, qualitySection?: string): string {
  return `${serializedContext}${qualitySection ? `\n\n${qualitySection}` : ''}

Wygeneruj południkowy check-in dla użytkownika.

Wymagany JSON:
{
  "summary": "Stan na południe — 1-2 zdania, po polsku",
  "remainingCalories": <int, pozostałe kalorie do celu (0 jeśli brak celu lub przekroczony)>,
  "remainingProtein": <int, pozostałe białko do celu (0 jeśli brak celu lub osiągnięte)>,
  "pacingStatus": "ahead" | "on_track" | "behind" | "no_data",
  "tip": "Jeden praktyczny tip na drugą połowę dnia (1 zdanie)",
${EXPLANATIONS_SCHEMA}
  "warnings": ["max 2 ostrzeżenia lub []"],
  "confidence": <float 0.0-1.0>
}
${JSON_INSTRUCTION}`
}

export function buildEveningPrompt(serializedContext: string, qualitySection?: string): string {
  return `${serializedContext}${qualitySection ? `\n\n${qualitySection}` : ''}

Wygeneruj wieczorne podsumowanie dnia użytkownika.

Wymagany JSON:
{
  "summary": "Podsumowanie dnia — 2 zdania, po polsku",
  "dayScore": <int 0-100, ogólna ocena dnia>,
  "calorieBalance": <int, bilans kaloryczny (consumed - target, może być ujemny)>,
  "proteinAchieved": <bool, czy osiągnięto cel białkowy>,
  "consistency": "excellent" | "good" | "fair" | "poor",
  "tomorrowFocus": "Jeden priorytet na jutro (1 zdanie)",
  "recoveryRecommendation": "Zalecenie na regenerację lub null",
${EXPLANATIONS_SCHEMA}
  "warnings": ["max 3 ostrzeżenia lub []"],
  "confidence": <float 0.0-1.0>
}
${JSON_INSTRUCTION}`
}

// ─── Prompt factory ───────────────────────────────────────────────────────────

export function buildPrompt(
  type: PromptType,
  ctx: AIContext,
  serializedContext: string,
  qualityReport?: QualityReport,
): { system: string; user: string; promptVersion: string } {
  const system = SYSTEM_PROMPTS[type]
  const qualitySection = qualityReport
    ? buildQualitySection(qualityReport)
    : undefined

  let user: string

  switch (type) {
    case 'MORNING':
      user = buildMorningPrompt(serializedContext, qualitySection)
      break
    case 'MIDDAY':
      user = buildMiddayPrompt(serializedContext, qualitySection)
      break
    case 'EVENING':
      user = buildEveningPrompt(serializedContext, qualitySection)
      break
  }

  return {
    system,
    user,
    promptVersion: `${PROMPT_VERSION}-${type.toLowerCase()}-ctx${ctx._version}`,
  }
}

// ─── Quality section injection ────────────────────────────────────────────────

function buildQualitySection(report: QualityReport): string {
  const { breakdown, tier, primaryWarnings } = report
  const pct = Math.round(breakdown.overall * 100)
  const lines = [
    `JAKOŚĆ DANYCH: ${tierToPolish(tier)} (${pct}% pewności)`,
    `Żywienie: ${pct2(breakdown.nutritionConfidence)}% | Regeneracja: ${pct2(breakdown.recoveryConfidence)}% | Trening: ${pct2(breakdown.trainingConfidence)}%`,
  ]

  if (breakdown.missingSignals.length > 0) {
    lines.push(`Brak sygnałów: ${breakdown.missingSignals.slice(0, 3).join('; ')}`)
  }

  if (tier === 'low' || tier === 'insufficient') {
    lines.push(
      'INSTRUKCJA JAKOŚCI: Ustaw confidence na max 0.45. ' +
      'Wymień brakujące sygnały w explanations.warnings. ' +
      'Zaznacz w summary że dane są niekompletne.',
    )
  }

  if (primaryWarnings.length > 0) {
    lines.push(`Kontekst ostrzeżeń: ${primaryWarnings.slice(0, 2).join('; ')}`)
  }

  return lines.join('\n')
}

function tierToPolish(tier: string): string {
  const m: Record<string, string> = {
    high: 'Wysoka', medium: 'Średnia', low: 'Niska', insufficient: 'Niewystarczająca',
  }
  return m[tier] ?? tier
}

function pct2(val: number): number {
  return Math.round(val * 100)
}

