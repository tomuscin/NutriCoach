# NCIC — Nutrition Conversational Intelligence Core

> **Note:** NCIC is an internal runtime architecture layer within Leaxaro. The "Nutrition" in NCIC reflects the origin domain; NCIC now serves as the runtime for nutrition, training, recovery, and behavioral intelligence across the full Leaxaro platform.

## What is NCIC?

The Nutrition Conversational Intelligence Core is the canonical home for all AI-native conversational logic in Leaxaro.

NCIC is NOT:
- a chatbot
- a wrapper around OpenAI
- a set of prompt strings
- a CRUD layer

NCIC IS:
- a capability-based orchestration layer
- a behavioral runtime for AI coaching
- a memory-aware conversational system
- a domain-specific intelligence model for nutrition, training, and recovery

---

## Location

```
packages/ncic/
```

NCIC is a monorepo package, importable by any app or service within Leaxaro.

---

## Directory Structure

```
packages/ncic/
├── behaviors/          # how the AI coach behaves in different contexts
├── capabilities/       # atomic things the AI can do (log food, analyze trends, etc.)
├── conversational-flows/ # multi-turn dialogue patterns
├── domains/            # domain models (nutrition, training, recovery, sleep)
├── events/             # NCIC-level events (distinct from package/events)
├── intents/            # user intent recognition and classification
├── knowledge/          # static knowledge the AI uses (RDA, macros, periodization)
├── memory/             # user context: short-term, long-term, episodic
├── orchestration/      # how capabilities are selected and composed
├── outcomes/           # what the AI is trying to achieve (goal models)
├── personas/           # AI persona definitions (coach style, tone, personality)
├── policies/           # guardrails: safety, ethics, boundary conditions
├── recommendations/    # recommendation generation and ranking
├── runtime/            # NCIC runtime engine (future)
├── signals/            # input signals: biometric, behavioral, contextual
└── tools/              # tool definitions for function calling
```

---

## Architecture Decisions

### 1. Capability-based design
Every action the AI can take is a discrete, testable capability. Capabilities are composed by the orchestration layer, not chained imperatively.

### 2. Memory-first context
Every conversation runs with memory context:
- **Short-term**: current session state
- **Long-term**: user profile, goals, preferences, history
- **Episodic**: notable past events (PRs, illness, diet breaks, compliance streaks)

### 3. Intent-first routing
User input is classified by intent before any capability is invoked. This allows the system to compose multi-step responses and handle ambiguous inputs gracefully.

### 4. Policy enforcement
Safety and ethics policies are checked at the orchestration layer, not inside individual capabilities. This ensures consistent enforcement regardless of how capabilities are composed.

### 5. Signal-driven intelligence
The AI does not ask for data — it reads signals. Strava syncs, food logs, biometric entries, sleep reports, and compliance history are all signals that inform NCIC context automatically.

---

## Current Status

**FOUNDATION — no runtime logic implemented yet.**

All directories contain `.gitkeep` files. Implementation will proceed in future ETAPs.

---

## Implementation Roadmap (future ETAPs)

| ETAP | Area | Description |
|---|---|---|
| NCIC-1 | Intents | Define canonical intent taxonomy |
| NCIC-2 | Capabilities | Implement first 5 atomic capabilities |
| NCIC-3 | Memory | Short-term session memory adapter |
| NCIC-4 | Orchestration | Basic capability router |
| NCIC-5 | Personas | Coach persona definitions |
| NCIC-6 | Policies | Safety and boundary policy engine |
| NCIC-7 | Runtime | Full NCIC runtime integration |
