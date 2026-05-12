// Excel column mapping — maps spreadsheet column headers to domain field names
// Based on "redukcjaod 04.05.2026.xlsx" — must be verified against actual file headers
// Run: npx tsx scripts/inspect-excel.ts to print actual column names from the file

export type DomainField =
  | 'date'
  | 'weight'
  | 'bodyFat'
  | 'muscleMass'
  | 'waist'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'water'
  | 'tss'
  | 'ctl'
  | 'atl'
  | 'tsb'
  | 'hrv'
  | 'restingHR'
  | 'sleepTotal'
  | 'sleepDeep'
  | 'sleepREM'
  | 'readiness'
  | 'notes'

/**
 * Default column name → domain field mapping.
 * Keys are case-insensitive Excel column headers (trimmed).
 */
export const EXCEL_COLUMN_MAP: Record<string, DomainField> = {
  'data': 'date', 'date': 'date', 'dzień': 'date', 'dzien': 'date',
  'waga': 'weight', 'masa ciała': 'weight', 'masa ciala': 'weight',
  'weight': 'weight', 'weight (kg)': 'weight', 'kg': 'weight',
  'tkanka tłuszczowa': 'bodyFat', 'tkanka tluszczowa': 'bodyFat',
  'body fat': 'bodyFat', 'bf%': 'bodyFat', 'bf': 'bodyFat', 'fat%': 'bodyFat',
  'masa mięśniowa': 'muscleMass', 'masa miesniowa': 'muscleMass', 'muscle mass': 'muscleMass',
  'talia': 'waist', 'obwód talii': 'waist', 'waist': 'waist', 'waist (cm)': 'waist',
  'kalorie': 'calories', 'kcal': 'calories', 'calories': 'calories',
  'kalorii': 'calories', 'kalorie spożyte': 'calories', 'kalorie spozytre': 'calories',
  'białko': 'protein', 'bialko': 'protein', 'protein': 'protein', 'protein (g)': 'protein', 'prot': 'protein',
  'węglowodany': 'carbs', 'weglowodany': 'carbs', 'carbs': 'carbs',
  'carbohydrates': 'carbs', 'carbs (g)': 'carbs',
  'tłuszcze': 'fat', 'tluszcze': 'fat', 'fat': 'fat', 'fat (g)': 'fat',
  'tłuszcz': 'fat', 'tluszcz': 'fat',
  'błonnik': 'fiber', 'blonnik': 'fiber', 'fiber': 'fiber', 'fibre': 'fiber',
  'woda': 'water', 'water': 'water', 'nawodnienie': 'water', 'hydration': 'water', 'water (ml)': 'water',
  'tss': 'tss', 'training stress score': 'tss',
  'ctl': 'ctl', 'chronic training load': 'ctl', 'fitness': 'ctl',
  'atl': 'atl', 'acute training load': 'atl', 'fatigue': 'atl',
  'tsb': 'tsb', 'training stress balance': 'tsb', 'form': 'tsb', 'forma': 'tsb',
  'hrv': 'hrv', 'heart rate variability': 'hrv',
  'hr spoczynkowe': 'restingHR', 'resting hr': 'restingHR',
  'resting heart rate': 'restingHR', 'hr spoc': 'restingHR',
  'sen': 'sleepTotal', 'sleep': 'sleepTotal', 'sleep (h)': 'sleepTotal',
  'czas snu': 'sleepTotal', 'godzin snu': 'sleepTotal',
  'sen głęboki': 'sleepDeep', 'sen gleboki': 'sleepDeep', 'deep sleep': 'sleepDeep',
  'rem': 'sleepREM', 'rem sleep': 'sleepREM',
  'gotowość': 'readiness', 'gotowosc': 'readiness',
  'readiness': 'readiness', 'readiness score': 'readiness',
  'notatki': 'notes', 'notes': 'notes', 'uwagi': 'notes', 'komentarz': 'notes',
}

/** Normalise a column header for map lookup: lowercase + trim. */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Find domain field for a given Excel column header. */
export function findDomainField(
  header: string,
  customMap?: Record<string, string>,
): DomainField | null {
  const normalised = normaliseHeader(header)
  const merged = { ...EXCEL_COLUMN_MAP, ...(customMap as Record<string, DomainField> | undefined) }
  return merged[normalised] ?? null
}

/** Field-level validators — returns error message or null if valid. */
export const FIELD_VALIDATORS: Partial<Record<DomainField, (raw: string) => string | null>> = {
  date: (v) => {
    const d = new Date(v.replace(/\./g, '-'))
    return isNaN(d.getTime()) ? `Cannot parse date: "${v}"` : null
  },
  weight: (v) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) || n < 20 || n > 350 ? `Invalid weight: "${v}"` : null
  },
  calories: (v) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) || n < 0 || n > 10000 ? `Invalid calories: "${v}"` : null
  },
  protein: (v) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) || n < 0 || n > 500 ? `Invalid protein: "${v}"` : null
  },
  tss: (v) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) || n < 0 || n > 1000 ? `Invalid TSS: "${v}"` : null
  },
  hrv: (v) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) || n < 0 || n > 300 ? `Invalid HRV: "${v}"` : null
  },
}
