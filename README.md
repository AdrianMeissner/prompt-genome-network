# Prompt Genome Network (PGN)

> Prompts die sich durch kollektive Nutzung mathematisch selbst verbessern.

Jeder Prompt besitzt einen **6-dimensionalen Genotyp-Vektor**. Durch kollektives Nutzerfeedback mutiert dieser Vektor, lernt und vererbt seine Stärken an neue Prompt-Generationen — ähnlich wie biologische Evolution.

---

## Kern-Konzept: Der Mutations-Algorithmus

```
P_neu = P_alt + α × feedback_signal × gradient

α             = 0.05  (Lernrate)
feedback_signal: +1 (👍) oder -1 (👎)
gradient      = normalisierter Differenzvektor zum besten Prompt der Kategorie
```

Jeder Prompt hat einen **Genotyp-Vektor** mit 6 Dimensionen (je 0.0–1.0):

| Index | Dimension | Bedeutung |
|---|---|---|
| 0 | Klarheit | Wie eindeutig ist die Anweisung? |
| 1 | Spezifität | Wie präzise ist der Kontext? |
| 2 | Struktur | Wie logisch gegliedert? |
| 3 | Ton | Wie angemessen ist der Stil? |
| 4 | Kontext-Tiefe | Wie viel Hintergrundwissen? |
| 5 | Erfolgsrate | Historische Trefferquote |

Prompts mit `erfolgsrate > 0.85` können **Kinder erzeugen**: Das Kind erbt 70% des Eltern-Vektors + 30% Gauss-Mutation.

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Auth + DB | Supabase (PostgreSQL + Realtime) |
| Vektor-Suche | Pinecone (6D, cosine similarity) |
| KI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Payments | Stripe (Subscriptions) |
| Styling | Tailwind CSS |
| Charts | Recharts (Radar, Line) |
| Graph | D3.js (Force-directed Stammbaum) |
| Deployment | Vercel + Vercel Cron |

---

## Projektstruktur

```
prompt-genome-network/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Anmeldeseite
│   │   └── register/page.tsx       # Registrierung
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + Nav (plan-aware)
│   │   ├── DashboardNav.tsx        # Client Nav mit Sign-out
│   │   ├── builder/
│   │   │   ├── page.tsx            # Server Component (lädt User-Daten)
│   │   │   └── BuilderClient.tsx   # Interaktiver Builder mit Tab-Nav
│   │   ├── bibliothek/
│   │   │   ├── page.tsx            # Pro-Gate + SSR Initial-Daten
│   │   │   └── BibliothekClient.tsx # Filter, Pagination, Feedback
│   │   ├── stammbaum/
│   │   │   ├── page.tsx            # Pro-Gate + Genealogie-Daten
│   │   │   └── StammbaumClient.tsx # D3 Graph Wrapper
│   │   ├── analytics/
│   │   │   ├── page.tsx            # Vektor-History SSR
│   │   │   └── AnalyticsClient.tsx # Radar + Linien-Chart
│   │   └── einstellungen/page.tsx  # Plan + Profil + Upgrade
│   ├── api/
│   │   ├── prompts/
│   │   │   ├── route.ts            # GET (eigene) + POST (erstellen)
│   │   │   └── verbessern/route.ts # Claude Analyse + Rate-Limit
│   │   ├── feedback/route.ts       # Mutations-Algorithmus Kern
│   │   ├── bibliothek/route.ts     # Öffentlich, KIS-sortiert
│   │   ├── genealogie/
│   │   │   └── kind-erzeugen/route.ts
│   │   ├── kis/route.ts            # Cron Job (03:00 UTC täglich)
│   │   └── stripe/
│   │       ├── checkout/route.ts   # Session erstellen + Redirect
│   │       └── webhook/route.ts    # Plan-Update nach Zahlung
│   ├── layout.tsx
│   ├── page.tsx                    # Landingpage
│   └── globals.css
├── components/
│   ├── MutationsEngine/            # Builder UI: Input + Analyse + Speichern
│   ├── PromptCard/                 # Karte: KIS Badge + Feedback + Kind-Erzeugung
│   ├── StammbaumGraph/             # D3.js Force Graph (interaktiv, zoombar)
│   └── VektorRadar/                # Recharts Radar mit Vorher/Nachher
├── lib/
│   ├── mutations.ts                # Kern-Algorithmus (mutiere, gradient, vererbe)
│   ├── kis.ts                      # KIS-Berechnung (Einzel + Batch)
│   ├── anthropic.ts                # Claude: Analyse + Verbesserung (mit Caching)
│   ├── pinecone.ts                 # Vektor-Suche + Upsert + Delete
│   ├── supabase.ts                 # Browser Client (für 'use client')
│   └── supabase-server.ts          # Server Client + Admin Client
├── types/index.ts                  # Alle TypeScript-Typen + Plan-Limits
├── supabase/
│   ├── schema.sql                  # Vollständiges DB-Schema (Referenz)
│   └── run-schema.mjs              # Node.js Script zum Schema einspielen
├── proxy.ts                        # Auth-Middleware (Next.js 16: proxy.ts)
├── vercel.json                     # Cron Job: /api/kis täglich 03:00 UTC
└── .env.local                      # Secrets (niemals committen)
```

---

## Datenbank-Schema

6 Tabellen, alle mit Row Level Security (RLS):

```sql
profiles      -- User-Profil (plan, stripe_customer_id, prompts_verwendet)
prompts       -- Kern-Tabelle (vektor FLOAT[6], erfolgsrate, kollektiver_score)
feedback      -- Abstimmungen (+1 / -1), unique pro User+Prompt
genealogie    -- Stammbaum (parent_id → child_id, vererbungs_rate)
kis_history   -- Tägliche KIS-Snapshots für Analytics
vektor_history -- Mutations-Verlauf für Linien-Chart
```

**Automatische Trigger:**
- `on_auth_user_created` → Profil bei Registrierung anlegen
- `prompts_updated_at` → `updated_at` bei jedem Update setzen

**Supabase Realtime** auf `prompts` und `feedback` aktiviert.

---

## Kollektiver Intelligenz Score (KIS)

Täglich um 03:00 UTC per Vercel Cron neu berechnet:

```
KIS = (erfolgsrate × 0.4) + (nutzungen_norm × 0.3) +
      (generations_tiefe_norm × 0.2) + (community_votes_norm × 0.1)
```

| Score | Label |
|---|---|
| ≥ 0.90 | Legendary |
| ≥ 0.75 | Elite |
| ≥ 0.60 | Advanced |
| ≥ 0.40 | Developing |
| < 0.40 | Emerging |

---

## Abo-Pläne

| Feature | Free | Pro (12€/Monat) | Team (39€/Monat) |
|---|---|---|---|
| KI-Verbesserungen | 5/Tag | Unbegrenzt | Unbegrenzt |
| Öffentliche Bibliothek | — | ✓ | ✓ |
| Genealogie + Stammbaum | — | ✓ | ✓ |
| Analytics | Basis | Voll | Voll |
| Team-Prompts | — | — | ✓ |

---

## Setup

### 1. Repository klonen & Dependencies installieren

```bash
git clone <repo-url>
cd prompt-genome-network
npm install
```

### 2. Environment Variables

`.env.local` anlegen (Vorlage ist bereits im Repo):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=prompt-genome-network

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Schema einspielen

```bash
node supabase/run-schema.mjs
```

Oder manuell: Supabase Dashboard → SQL Editor → `supabase/schema.sql` einfügen → Run.

### 4. Pinecone Index erstellen

Pinecone Dashboard → Create Index:
- Name: `prompt-genome-network`
- Dimensions: `6`
- Metric: `cosine`

### 5. Stripe Webhook (Entwicklung)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# → gibt whsec_... aus → in STRIPE_WEBHOOK_SECRET eintragen
```

Stripe Dashboard → Products → 2 Produkte anlegen (Pro 12€, Team 39€) → Price IDs in `.env.local`.

### 6. Dev-Server starten

```bash
npm run dev
```

→ `http://localhost:3000`

---

## API-Routen Übersicht

| Route | Methode | Beschreibung |
|---|---|---|
| `/api/prompts` | GET | Eigene Prompts laden (Filter, Pagination) |
| `/api/prompts` | POST | Neuen Prompt erstellen |
| `/api/prompts/verbessern` | POST | Claude Analyse + verbesserter Prompt |
| `/api/feedback` | POST | 👍/👎 → Vektor mutieren |
| `/api/bibliothek` | GET | Öffentlich, nach KIS sortiert |
| `/api/genealogie/kind-erzeugen` | POST | Kind-Prompt aus Eltern erzeugen |
| `/api/kis` | POST | KIS neu berechnen (Cron, täglich) |
| `/api/stripe/checkout` | GET | Stripe Checkout Session erstellen |
| `/api/stripe/webhook` | POST | Plan nach Zahlung aktualisieren |

---

## Deployment auf Vercel

```bash
vercel deploy
```

**Vercel Environment Variables** — alle Keys aus `.env.local` übertragen.

**Cron Job** ist in `vercel.json` konfiguriert:
```json
{
  "crons": [{ "path": "/api/kis", "schedule": "0 3 * * *" }]
}
```

Der Cron-Endpunkt prüft den `CRON_SECRET` Header. In `.env.local` hinzufügen:
```env
CRON_SECRET=ein-zufaelliger-langer-string
```

---

## Architektur-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| `proxy.ts` statt `middleware.ts` | Next.js 16 Rename — gleiche Funktionalität |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` statt `ANON_KEY` | Neues Supabase 2025 Key-Format |
| `lib/supabase.ts` + `lib/supabase-server.ts` getrennt | Verhindert `next/headers` Import in Client Components |
| Pinecone für Vektor-Suche, kein pgvector | Supabase lean halten; Pinecone als einzige Vektorquelle |
| Prompt Caching in `lib/anthropic.ts` | ~70% Token-Einsparung bei wiederholten System-Prompts |
| Stripe API Version `2026-03-25.dahlia` | Aktuelle Version; `Stripe.Checkout.Session` (nicht `CheckoutSession`) |
| D3 nur per `dynamic(..., { ssr: false })` | Force Graph ist nicht SSR-fähig |
