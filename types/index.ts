// ============================================================
// PROMPT GENOME NETWORK — Zentrale TypeScript-Typen
// ============================================================

export type Plan = 'free' | 'pro' | 'team'
export type Category = 'code' | 'writing' | 'analysis' | 'creative' | 'business'
export type FeedbackSignal = 1 | -1

/**
 * Der 6-dimensionale Genotyp-Vektor eines Prompts.
 * Alle Werte zwischen 0.0 und 1.0.
 */
export interface GenotypVektor {
  klarheit: number        // [0] Wie klar ist die Anweisung?
  spezifitaet: number     // [1] Wie spezifisch ist der Kontext?
  struktur: number        // [2] Wie gut strukturiert ist der Prompt?
  ton: number             // [3] Wie angemessen ist der Ton?
  kontext_tiefe: number   // [4] Wie tief ist der Kontext?
  erfolgsrate: number     // [5] Historische Erfolgsrate
}

export interface Prompt {
  id: string
  user_id: string
  title: string
  text: string
  category: Category
  vektor: number[]        // Rohe Float-Array Darstellung des GenotypVektors
  erfolgsrate: number
  nutzungen: number
  parent_id: string | null
  generation: number
  kollektiver_score: number
  is_public: boolean
  pinecone_id: string | null
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  prompt_id: string
  user_id: string
  signal: FeedbackSignal
  kontext: string | null
  created_at: string
}

export interface Genealogie {
  id: string
  parent_id: string
  child_id: string
  generation: number
  vererbungs_rate: number
  created_at: string
}

export interface Profile {
  id: string
  name: string | null
  api_key: string | null
  plan: Plan
  prompts_verwendet: number
  stripe_customer_id: string | null
  created_at: string
}

export interface KisHistory {
  id: string
  prompt_id: string
  score: number
  erfolgsrate: number
  nutzungen: number
  berechnet_am: string
}

export interface VektorHistory {
  id: string
  prompt_id: string
  vektor: number[]
  trigger_type: 'feedback' | 'mutation' | 'vererbung'
  created_at: string
}

// API Request/Response Typen
export interface FeedbackRequest {
  prompt_id: string
  signal: FeedbackSignal
  kontext?: string
}

export interface FeedbackResponse {
  success: boolean
  neuer_vektor: number[]
  neue_erfolgsrate: number
  vererbung_moeglich: boolean
  message: string
}

export interface VerbessernRequest {
  prompt_text: string
  kategorie: Category
}

export interface VerbessernResponse {
  verbesserter_prompt: string
  vektor: GenotypVektor
  empfehlungen: string[]
  erklaerung: string
}

export interface KindErzeugenRequest {
  parent_id: string
}

export interface KindErzeugenResponse {
  success: boolean
  kind: Prompt
  vektor_diff: number[]
}

// Plan-Limits
export const PLAN_LIMITS = {
  free: {
    verbesserungen_pro_tag: 5,
    bibliothek_zugang: false,
    genealogie_zugang: false,
    team_prompts: false,
  },
  pro: {
    verbesserungen_pro_tag: Infinity,
    bibliothek_zugang: true,
    genealogie_zugang: true,
    team_prompts: false,
  },
  team: {
    verbesserungen_pro_tag: Infinity,
    bibliothek_zugang: true,
    genealogie_zugang: true,
    team_prompts: true,
  },
} as const

export const PLAN_PREISE = {
  free: 0,
  pro: 12,
  team: 39,
} as const

// Kategorie-Labels auf Deutsch
export const KATEGORIE_LABELS: Record<Category, string> = {
  code: 'Code',
  writing: 'Schreiben',
  analysis: 'Analyse',
  creative: 'Kreativ',
  business: 'Business',
}

export const VEKTOR_DIMENSIONEN = [
  'klarheit',
  'spezifität',
  'struktur',
  'ton',
  'kontext_tiefe',
  'erfolgsrate',
] as const
