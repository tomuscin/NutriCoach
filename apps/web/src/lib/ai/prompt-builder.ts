// AI Prompt Builder — ETAP 5
// Versioned, modular, deterministic prompts for all coaching touchpoints.
// All prompts return strict JSON — no free-form text.

import type { AIContext } from './context-builder'

export const PROMPT_VERSION = '1.0'

// ─── JSON Schema instructions (appended to every user prompt) ─────────────────

const JSON_INSTRUCTION = `
Odpowiedź WYŁĄCZNIE w formacie JSON. Nie dodawaj żadnych komentarzy, markdown ani wyjaśnień poza JSON.
Odpowiedź musi być jednym obiektem JSON zaczynającym się od { i kończącym na }.`

// ─── System prompts ───────────────────────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  MORNING: `Jesteś NutriCoach — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz dane użytkownika i generujesz poranny brief dnia.
Twoje zalecenia są konkretne, oparte na danych i bezpieczne.
Nigdy nie diagnozujesz chorób. Nie zastępujesz lekarza.
Odpowiadasz wyłącznie w JSON.`,

  MIDDAY: `Jesteś NutriCoach — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz dane bieżącego dnia i generujesz południkowy check-in.
Twoje zalecenia są zwięzłe, praktyczne i oparte na danych.
Odpowiadasz wyłącznie w JSON.`,

  EVENING: `Jesteś NutriCoach — silnikiem zaleceń żywieniowo-treningowych.
Analizujesz miniony dzień i przygotowujesz wieczorne podsumowanie z planem na jutro.
Twoje zalecenia są konstruktywne, oparte na danych i bezpieczne.
Odpowiadasz wyłącznie w JSON.`,
} as const

export type PromptType = keyof typeof SYSTEM_PROMPTS

// ─── User prompt builders ─────────────────────────────────────────────────────

export function buildMorningPrompt(serializedContext: string): string {
  return `${serializedContext}

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
  "warnings": ["max 3 krótkie ostrzeżenia lub pusta tablica []"],
  "confidence": <float 0.0-1.0, niżej gdy mało danych>
}
${JSON_INSTRUCTION}`
}

export function buildMiddayPrompt(serializedContext: string): string {
  return `${serializedContext}

Wygeneruj południkowy check-in dla użytkownika.

Wymagany JSON:
{
  "summary": "Stan na południe — 1-2 zdania, po polsku",
  "remainingCalories": <int, pozostałe kalorie do celu (0 jeśli brak celu lub przekroczony)>,
  "remainingProtein": <int, pozostałe białko do celu (0 jeśli brak celu lub osiągnięte)>,
  "pacingStatus": "ahead" | "on_track" | "behind" | "no_data",
  "tip": "Jeden praktyczny tip na drugą połowę dnia (1 zdanie)",
  "warnings": ["max 2 ostrzeżenia lub []"],
  "confidence": <float 0.0-1.0>
}
${JSON_INSTRUCTION}`
}

export function buildEveningPrompt(serializedContext: string): string {
  return `${serializedContext}

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
): { system: string; user: string; promptVersion: string } {
  const system = SYSTEM_PROMPTS[type]
  let user: string

  switch (type) {
    case 'MORNING':
      user = buildMorningPrompt(serializedContext)
      break
    case 'MIDDAY':
      user = buildMiddayPrompt(serializedContext)
      break
    case 'EVENING':
      user = buildEveningPrompt(serializedContext)
      break
  }

  return {
    system,
    user,
    promptVersion: `${PROMPT_VERSION}-${type.toLowerCase()}-ctx${ctx._version}`,
  }
}
