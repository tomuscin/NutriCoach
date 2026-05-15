/**
 * NCIC Intent Registry
 *
 * Static definitions for all canonical intents.
 * Each entry defines: keywords, contextual signals, capabilities, base confidence.
 *
 * This is the single source of truth for what an intent means
 * and how to route it to capabilities.
 */

import type { IntentDefinition } from './types'
import { INTENT_NAMES } from './types'

export const INTENT_REGISTRY: Record<string, IntentDefinition> = {
  [INTENT_NAMES.FOOD_LOG]: {
    name: INTENT_NAMES.FOOD_LOG,
    description: 'User is logging food, a meal, or a snack',
    keywords: [
      // Polish
      'zjadłem', 'zjadłam', 'jadłem', 'jadłam', 'piłem', 'piłam',
      'zjedzone', 'spożyłem', 'spożyłam', 'loguj jedzenie', 'zapisz posiłek',
      'na śniadanie', 'na lunch', 'na obiad', 'na kolację', 'na przekąskę',
      'burger', 'pizza', 'sałatka', 'makaron', 'ryż', 'kurczak', 'owsianka',
      'koktajl', 'shake', 'jogurt', 'kanapka', 'zupa', 'chleb',
      // English
      'ate', 'had', 'consumed', 'drank', 'logged', 'log food', 'log meal',
      'breakfast', 'lunch', 'dinner', 'snack', 'supper',
      'burger', 'pizza', 'salad', 'pasta', 'rice', 'chicken', 'oatmeal',
      'smoothie', 'shake', 'yogurt', 'sandwich', 'soup',
    ],
    contextualSignals: ['nutrition'],
    capabilities: ['nutrition.ingest'],
    baseConfidence: 0.8,
  },

  [INTENT_NAMES.MEAL_ANALYSIS]: {
    name: INTENT_NAMES.MEAL_ANALYSIS,
    description: 'User wants nutritional analysis of a specific food or meal',
    keywords: [
      // Polish
      'ile kalorii', 'ile białka', 'ile węglowodanów', 'ile tłuszczu',
      'wartości odżywcze', 'makro', 'analiza posiłku', 'co ma', 'co zawiera',
      'czy to dobre', 'czy to zdrowe', 'policz kalorie', 'oblicz makro',
      // English
      'how many calories', 'how much protein', 'how many carbs', 'how much fat',
      'nutrition facts', 'macros', 'analyze meal', 'what does it have',
      'is this healthy', 'count calories', 'calculate macros',
    ],
    contextualSignals: ['nutrition'],
    capabilities: ['nutrition.analyze'],
    baseConfidence: 0.75,
  },

  [INTENT_NAMES.TRAINING_REFERENCE]: {
    name: INTENT_NAMES.TRAINING_REFERENCE,
    description: 'User is referencing, logging, or asking about a training session',
    keywords: [
      // Polish
      'trening', 'pojechałem', 'pojechałam', 'przebiegłem', 'przebiegłam',
      'pływałem', 'pływałam', 'ćwiczyłem', 'ćwiczyłam',
      'rower', 'rowerze', 'rowerem', 'na rowerze', 'bieganie', 'biegałem', 'biegałam',
      'pływanie', 'siłownia', 'interwały', 'tss', 'ctl', 'atl', 'tsb',
      'strefa', 'intensywność', 'dystans', 'tempo', 'tętno', 'hr',
      // English
      'workout', 'training', 'rode', 'ran', 'swam', 'cycled', 'lifting',
      'bike', 'running', 'swimming', 'gym', 'intervals', 'zone',
      'intensity', 'distance', 'pace', 'heart rate',
    ],
    contextualSignals: ['training'],
    capabilities: ['training.contextualize'],
    baseConfidence: 0.8,
  },

  [INTENT_NAMES.RECOVERY_REFLECTION]: {
    name: INTENT_NAMES.RECOVERY_REFLECTION,
    description: 'User is reflecting on recovery, sleep, fatigue, or readiness',
    keywords: [
      // Polish
      'zmęczony', 'zmęczona', 'sen', 'spałem', 'spałam', 'odpoczynek',
      'regeneracja', 'hrv', 'gotowość', 'readiness', 'nogi ciężkie',
      'ciało boli', 'przeciążony', 'przemęczony', 'nie ma siły',
      'nie śpię dobrze', 'słabo spałem', 'słabo spałam',
      // English
      'tired', 'exhausted', 'sleep', 'slept', 'rest', 'recovery',
      'hrv', 'readiness', 'heavy legs', 'body aches', 'overloaded',
      'overtrained', 'no energy', 'poor sleep', 'slept badly',
    ],
    contextualSignals: ['recovery', 'training'],
    capabilities: ['recovery.reflect'],
    baseConfidence: 0.72,
  },

  [INTENT_NAMES.BEHAVIORAL_REFLECTION]: {
    name: INTENT_NAMES.BEHAVIORAL_REFLECTION,
    description: 'User is reflecting on mood, energy, stress, or general wellbeing',
    keywords: [
      // Polish
      'nastrój', 'energia', 'stres', 'motywacja', 'czuję się', 'samopoczucie',
      'dziś mam', 'mam dziś', 'nie mam siły', 'jestem w formie',
      'niedobrze', 'super dziś', 'kiepski dzień', 'zły dzień', 'dobry dzień',
      // English
      'mood', 'energy', 'stress', 'motivation', 'feeling', 'how i feel',
      'wellbeing', 'today i have', 'no energy', 'great today', 'bad day', 'good day',
    ],
    contextualSignals: ['behavioral'],
    capabilities: ['behavior.reflect'],
    baseConfidence: 0.65,
  },

  [INTENT_NAMES.GOAL_UPDATE]: {
    name: INTENT_NAMES.GOAL_UPDATE,
    description: 'User wants to update, set, or review a goal',
    keywords: [
      // Polish
      'cel', 'chcę schudnąć', 'chcę przytyć', 'chcę zbudować', 'cel wagowy',
      'cel treningowy', 'zmień cel', 'nowy cel', 'aktualizuj cel',
      // English
      'goal', 'want to lose', 'want to gain', 'want to build', 'weight goal',
      'training goal', 'change goal', 'new goal', 'update goal', 'target weight',
    ],
    contextualSignals: [],
    capabilities: ['goals.update'],
    baseConfidence: 0.78,
  },

  [INTENT_NAMES.PROGRESS_CHECK]: {
    name: INTENT_NAMES.PROGRESS_CHECK,
    description: 'User wants to check progress toward a goal or review recent trends',
    keywords: [
      // Polish
      'jak idzie', 'jak mi idzie', 'postęp', 'wyniki', 'statystyki',
      'trend', 'ile schudłem', 'ile schudłam', 'jak wyglądają dane',
      'podsumowanie', 'raport', 'ostatni tydzień', 'ostatni miesiąc',
      // English
      'how am i doing', 'progress', 'results', 'stats', 'statistics',
      'trend', 'how much have i lost', 'summary', 'report',
      'last week', 'last month', 'overview',
    ],
    contextualSignals: ['nutrition', 'training', 'recovery'],
    capabilities: ['analytics.summarize'],
    baseConfidence: 0.75,
  },

  [INTENT_NAMES.COACH_QUESTION]: {
    name: INTENT_NAMES.COACH_QUESTION,
    description: 'User is asking for coaching advice, recommendations, or expert guidance',
    keywords: [
      // Polish
      'co radzisz', 'co polecasz', 'co powinienem', 'co powinnam',
      'jak powinienem', 'jak powinnam', 'pomóż mi', 'doradź',
      'czy powinienem', 'czy powinnam', 'co sądzisz', 'jaka jest najlepsza',
      'jak poprawić', 'jak zwiększyć', 'jak zmniejszyć',
      // English
      'what do you recommend', 'what should i', 'help me', 'advise',
      'should i', 'what do you think', 'what is the best', 'how to improve',
      'how to increase', 'how to decrease', 'coach', 'guidance', 'advice',
    ],
    contextualSignals: [],
    capabilities: ['conversation.respond', 'coaching.advise'],
    baseConfidence: 0.7,
  },

  [INTENT_NAMES.CASUAL_CONVERSATION]: {
    name: INTENT_NAMES.CASUAL_CONVERSATION,
    description: 'User is engaging in casual, non-task-oriented conversation',
    keywords: [
      // Polish
      'cześć', 'hej', 'dzień dobry', 'dobry wieczór', 'dobranoc',
      'dziękuję', 'dzięki', 'ok', 'super', 'świetnie', 'fajnie',
      'rozumiem', 'jasne', 'dobra', 'no to pa', 'do zobaczenia',
      // English
      'hi', 'hello', 'hey', 'good morning', 'good evening', 'goodnight',
      'thank you', 'thanks', 'ok', 'great', 'cool', 'awesome', 'nice',
      'understand', 'got it', 'bye', 'see you',
    ],
    contextualSignals: ['conversation'],
    capabilities: ['conversation.respond'],
    baseConfidence: 0.6,
  },

  [INTENT_NAMES.UNKNOWN]: {
    name: INTENT_NAMES.UNKNOWN,
    description: 'Intent could not be determined from the input',
    keywords: [],
    contextualSignals: [],
    capabilities: ['conversation.respond'],
    baseConfidence: 0.1,
  },
} as const

/** Ordered list for classifier iteration — unknown always last */
export const INTENT_REGISTRY_ORDER: Array<keyof typeof INTENT_REGISTRY> = [
  INTENT_NAMES.FOOD_LOG,
  INTENT_NAMES.MEAL_ANALYSIS,
  INTENT_NAMES.TRAINING_REFERENCE,
  INTENT_NAMES.RECOVERY_REFLECTION,
  INTENT_NAMES.BEHAVIORAL_REFLECTION,
  INTENT_NAMES.GOAL_UPDATE,
  INTENT_NAMES.PROGRESS_CHECK,
  INTENT_NAMES.COACH_QUESTION,
  INTENT_NAMES.CASUAL_CONVERSATION,
  INTENT_NAMES.UNKNOWN,
]
