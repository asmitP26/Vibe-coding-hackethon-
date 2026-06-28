# Deadline Guardian AI

### Your AI-powered deadline & productivity command center — never miss a deadline again.

> **Elevator pitch:** Most to-do apps are passive lists that shout every task equally loud. **Deadline Guardian AI** is an *active* AI guardian that scores every task by risk, tells you exactly what to do next, plans your day into focus blocks, automatically re-plans when life happens, and coaches you to finish — all powered by **Google Gemini** behind a secure backend.

---

## Submission at a Glance

| | |
| --- | --- |
| **Project Name** | Deadline Guardian AI |
| **Category** | AI Productivity / Personal Assistant |
| **Core AI** | Google Gemini (`gemini-1.5-flash`) via a secure backend proxy |
| **One-liner** | An AI chief-of-staff that answers *"What should I do right now?"* |
| **Status** | Working MVP — fully functional, responsive, production build passing |
| **Tech** | React 18 · Vite 5 · Tailwind · Framer Motion · Node/Express · Gemini |

---

## Table of Contents

1. [Problem Statement Selected](#1-problem-statement-selected)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [Technologies Used](#4-technologies-used)
5. [Google Technologies Utilized](#5-google-technologies-utilized)
6. [AI Agent Workflow](#6-ai-agent-workflow)
7. [Architecture (Frontend → Backend → Gemini)](#7-architecture-frontend--backend--gemini)
8. [Screenshots](#8-screenshots)
9. [How It Solves the Problem Better Than Reminders](#9-how-it-solves-the-problem-better-than-reminders)
10. [Innovation Highlights](#10-innovation-highlights)

---

## 1. Problem Statement Selected

**Theme: Personal productivity is broken because our tools are passive.**

Students, builders, and professionals juggle hackathons, assignments, interviews, bills, and habits across a dozen apps that all demand attention equally. The tools meant to help actually add to the chaos:

- **No sense of risk.** Traditional to-do apps and reminders treat every task the same. A bill due in 2 hours looks identical to a chore due next week.
- **The user does all the thinking.** You must manually decide *what* to do next and *when* to do it — every single day. That is constant decision fatigue.
- **They don't adapt.** When you miss a task, nothing happens. The app doesn't re-plan; it just shows a red overdue label and moves on.
- **No feedback loop.** There is no coaching, no pattern detection, no "here's why you keep slipping." You never actually get better.

**The result:** missed deadlines, last-minute crunches, anxiety, and a graveyard of half-used productivity apps.

> **The gap we target:** A reminder tells you a deadline *exists*. It never tells you what to do about it. We close that gap.

---

## 2. Solution Overview

**Deadline Guardian AI flips the passive to-do list into an active guardian.** It pairs a fast, deterministic **priority engine** (works instantly, even offline) with an **AI agent layer** powered by Google Gemini that reasons about your context, plans your day, and explains every recommendation in plain language.

At any moment, the app answers the one question that matters: **"What should I do right now?"**

It does five things a reminder never could:

1. **Scores & ranks** every task using a deadline-urgency + importance + effort model (0–100).
2. **Detects deadline risk** early — `Critical → High → Attention → Safe` — so nothing slips silently.
3. **Plans your day** into focus-optimized time blocks, scheduling your hardest work first while energy is high.
4. **Re-plans automatically** when a task is missed, fitting it into the next open slot.
5. **Coaches you** with an AI Productivity Copilot, task breakdowns, habit streaks, and personalized insights.

The deterministic engine guarantees the app is **always useful and instant**, while the Gemini layer adds **natural-language intelligence** on top. The result feels less like an app and more like a personal chief-of-staff.

---

## 3. Key Features

| Feature | What it does | Why it matters |
| --- | --- | --- |
| **Daily Brief** | An at-a-glance AI summary of your day, top highlights, and the one thing that matters most. | Replaces "where do I even start?" with a clear answer. |
| **Priority Tasks** | Every task scored 0–100 by a deadline + importance + effort engine. | Surfaces what's truly urgent, not just what's newest. |
| **Deadline Risk Radar** | Color-coded badges — Critical / High / Attention / Safe — that warn *before* a deadline slips. | Catches risk early, not after you've already missed. |
| **Productivity Score** | A single radial-gauge metric with a 7-day trend. | Turns vague effort into a number you can improve. |
| **AI Planner** | A time-blocked daily schedule (8:00–24:00) built around your highest-priority work. | Removes the daily "when do I do this?" decision. |
| **Auto-Replan** | One click reschedules missed / at-risk tasks into the next open slots. | The app adapts to your life instead of punishing you. |
| **Habit Tracker** | Streak-based habits with weekly heatmaps and daily goals. | Builds the routines that prevent future crunches. |
| **Personalized Insights** | Completion rate, missed-task ratio, average delay, most productive time of day, most ignored category, plus AI coaching (strengths / focus areas / recommendations) and a 7-day Weekly Report. | Closes the feedback loop — you actually get better over time. |
| **Productivity Copilot** | A context-aware chat assistant that reasons over your *live* tasks, habits, schedule, and stats — answering "what now?", feasibility, time-boxing, energy, and "what am I doing wrong?" with structured cards, a typing animation, and **voice input**. | A real assistant grounded in your actual data, not a generic chatbot. |
| **Stunning, Resilient UI** | Glassmorphism design, smooth Framer Motion animations, full loading / empty / error states, and a global error boundary. | Demo-ready and production-stable from 390px mobile to 1440px desktop. |

---

## 4. Technologies Used

| Layer | Technology |
| --- | --- |
| **Framework** | React 18 (single-page app) |
| **Build Tool** | Vite 5 |
| **Routing** | React Router 6 |
| **Styling** | Tailwind CSS 3 + PostCSS + Autoprefixer (glassmorphism design system) |
| **Animation** | Framer Motion 11 |
| **Charts / Data Viz** | Recharts 2 |
| **Icons** | lucide-react |
| **Backend** | Node.js + Express (secure Gemini proxy) |
| **AI** | Google Gemini API (`gemini-1.5-flash`) — called **only** from the backend |
| **Voice** | Web Speech API (browser-native, zero dependency) |
| **State Management** | React Context + hooks (memoized for performance) |
| **Persistence** | Browser `localStorage` with a safe mock-data fallback |

**Engineering quality built in:** deterministic priority engine for instant/offline results, a global error boundary, defensive try/catch on every async call, corruption-safe storage, memoized components, and a clean production build.

---

## 5. Google Technologies Utilized

| Technology | Role in the project | Status |
| --- | --- | --- |
| **Google Gemini API** (`gemini-1.5-flash`) | The core reasoning engine — powers task analysis, daily planning, task breakdown, rescheduling, coaching, and the context-aware Copilot. | **Live** via secure backend proxy |
| **Gemini Structured Output** | We request `responseMimeType: application/json` so Gemini returns strict, schema-conformant JSON that the UI can render directly — no fragile text parsing. | **In use** (server-side) |
| **Google AI Studio** | API key provisioning and rapid prompt prototyping. | **In use** |
| **Google Calendar API** | Two-way sync of AI-generated time blocks to the user's calendar. | Planned (roadmap) |
| **Firebase Hosting** | Static deployment of the production build behind HTTPS. | Planned (roadmap) |

> **🔒 Security note (judge-friendly):** The Gemini API key lives **only on the backend** (`process.env.GEMINI_API_KEY`). The browser never receives it. The React app calls our own `/api/ai/*` endpoints, and the Express server attaches the key server-side via the `x-goog-api-key` header over HTTPS. The key is never hardcoded, logged, committed, or shipped in the frontend bundle.

---

## 6. AI Agent Workflow

Deadline Guardian AI runs **six specialized AI agents**, each with a single responsibility, all sharing one secure flow: **React Frontend → Backend API Route → Gemini API.**

| # | Agent | Backend Endpoint | What it returns |
| --- | --- | --- | --- |
| 1 | **Task Analyst** | `POST /api/ai/analyze-task` | Priority score, risk level, effort estimate, reason, suggested subtasks |
| 2 | **Daily Planner** | `POST /api/ai/generate-daily-plan` | Non-overlapping, focus-optimized time blocks + total focus hours |
| 3 | **Task Breakdown** | `POST /api/ai/break-down-task` | An ordered, effort-estimated checklist for a big task |
| 4 | **Rescheduler** | `POST /api/ai/reschedule-tasks` | New slots for missed / at-risk tasks |
| 5 | **Productivity Coach** | `POST /api/ai/productivity-coach` | A review + tone-coded, prioritized recommendations |
| 6 | **Context-Aware Copilot** | `POST /api/ai/assistant-chat` | Intent-aware reply grounded in live tasks, habits, schedule & stats, with last-5-turn memory |

**How a single request flows:**

1. **User acts or asks** — e.g., adds a task, clicks "Plan my day", or types "What should I do right now?"
2. **Intent detection** routes the request to the correct agent.
3. The **frontend builds a deterministic mock** of the expected result, then **POSTs** the request to our backend. *The frontend holds no API key.*
4. The **backend selects the prompt template + JSON schema**, injects the user's data, and calls Gemini server-side requesting **strict JSON**.
5. The response is **safely parsed and validated** against the schema.
6. The **typed result is rendered** — as a score, a plan, a checklist, or a chat reply with structured cards.

**Reliability by design — the AI can never crash the app:**
- If the Gemini key is absent, the backend returns a **realistic mock in the identical schema**.
- If the backend is unreachable or times out (20s), the **frontend falls back to its local mock**.
- The current mode is reported by `GET /api/ai/status` and shown live in the in-app **"Gemini Live" / "Mock AI"** badge.

> This means the app is **always demo-safe**: it works with a real key, with no key, or fully offline — and degrades gracefully with friendly messaging every time.

---

## 7. Architecture (Frontend → Backend → Gemini)

A clean separation across a **secure boundary** keeps the API key off the client and keeps the UI fast and resilient.

```
┌─────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│            BROWSER  ·  NO API KEY            │        │       BACKEND  ·  holds GEMINI_API_KEY        │
│                                             │        │                                              │
│  React 18 SPA (Vite + Tailwind + Framer)    │        │  Node.js + Express secure proxy              │
│                                             │        │                                              │
│  • Deterministic Priority/Task Engine       │  HTTP  │  • Prompt templates + JSON response schemas  │
│  • 6 agent clients (geminiService.js)       │  JSON  │  • CORS allow-list, 100kb body cap           │
│  • Builds local MOCK for every request  ────┼───────▶│  • generateJSON transport ───────────────────┼──┐
│  • Context Copilot (live tasks/habits/      │ /api/  │  • safeParseJSON + schema validation         │  │
│    schedule/stats + 5-turn memory)          │  ai/*  │  • Mock fallback in identical schema         │  │
│  • localStorage persistence (safe fallback) │        │  • Never logs the key                        │  │
└─────────────────────────────────────────────┘        └──────────────────────────────────────────────┘  │
                  ▲                                                                                        │
                  │ typed JSON result (score / plan / checklist / reply)                                  ▼
                  │                                                              ┌─────────────────────────────────┐
                  └──────────────────────────────────────────────────────────  │   GOOGLE GEMINI API             │
                                                                                │   gemini-1.5-flash              │
                                                                                │   strict application/json output │
                                                                                └─────────────────────────────────┘
```

**Flow in one line:** `User action → Intent → Frontend mock + POST /api/ai/* → Express injects key + prompt → Gemini (strict JSON) → validate → render`.

**Why this architecture wins:**
- **Secure** — the key never leaves the server; the frontend bundle is safe to ship publicly.
- **Resilient** — three layers of fallback (no key → mock; backend down → mock; bad JSON → validated mock) mean **no blank screens, no infinite loaders, no crashes.**
- **Fast** — the deterministic engine renders instantly while AI enriches in the background.
- **Maintainable** — six single-purpose agents, each with its own endpoint, prompt, and schema.

> *(A Mermaid `flowchart` version of this diagram is also included in the project README for rendering in supported viewers.)*

---

## 8. Screenshots

> *Replace each placeholder below with a screenshot. Suggested captions are provided for judges.*

### 📸 Screenshot 1 — Landing Page
*[ Paste screenshot here ]*
**Caption:** The premium, glassmorphism landing page introducing Deadline Guardian AI.

### 📸 Screenshot 2 — Dashboard (AI Command Center)
*[ Paste screenshot here ]*
**Caption:** The bento-grid dashboard — Daily Brief, Deadline Risk Radar, Productivity Score, Top Priority Tasks, and Habit Tracker at a glance.

### 📸 Screenshot 3 — Tasks with Priority & Risk
*[ Paste screenshot here ]*
**Caption:** Every task scored 0–100 and color-coded by deadline risk (Critical → Safe).

### 📸 Screenshot 4 — AI Planner (Time-Blocked Day)
*[ Paste screenshot here ]*
**Caption:** A Gemini-generated, focus-optimized daily schedule with one-click Auto-Replan.

### 📸 Screenshot 5 — Personalized Insights
*[ Paste screenshot here ]*
**Caption:** Completion rate, missed ratio, most productive time, AI coaching, and a 7-day Weekly Report.

### 📸 Screenshot 6 — Productivity Copilot (Context-Aware Chat)
*[ Paste screenshot here ]*
**Caption:** The Copilot reasoning over live tasks and schedule, answering "What should I do right now?" with structured cards and voice input.

### 📸 Screenshot 7 — "Gemini Live via Secure Backend" Badge
*[ Paste screenshot here ]*
**Caption:** The live AI-mode indicator, proving the secure proxy architecture in action.

---

## 9. How It Solves the Problem Better Than Reminders

| | ⏰ Traditional Reminders / To-Do Apps | 🛡️ Deadline Guardian AI |
| --- | --- | --- |
| **Prioritization** | Flat list; every item looks equal. | Scores 0–100 by urgency + importance + effort. |
| **"What do I do now?"** | You decide, every time. | The app tells you — instantly and with reasoning. |
| **Risk awareness** | A red label *after* you're already late. | Early `Critical → Safe` radar that warns *before* slipping. |
| **Planning** | You build your own schedule. | AI auto-generates a focus-optimized, time-blocked day. |
| **When you miss something** | Nothing — it just stays overdue. | One-click Auto-Replan into the next open slot. |
| **Understanding tasks** | A title and a due date. | Breaks big tasks into an ordered, effort-estimated checklist. |
| **Feedback & growth** | None. | Insights + AI coaching reveal your patterns and how to improve. |
| **Interaction** | Tap, type, repeat. | Natural-language + voice Copilot grounded in *your* data. |
| **Resilience** | Fails or stalls when offline. | Three-layer fallback — always works, never blank. |

> **The core difference:** A reminder is a **notification**. Deadline Guardian AI is a **decision-maker**. One tells you a deadline exists; the other tells you exactly what to do about it — and adapts when things change.

---

## 10. Innovation Highlights

- **🧠 Hybrid intelligence (deterministic + generative).** A local priority/risk engine guarantees instant, offline-capable results, while Gemini layers on natural-language reasoning. You get the **speed of an algorithm** and the **intelligence of an LLM** — never one at the cost of the other.

- **🤖 Six specialized agents, one secure flow.** Instead of a single catch-all prompt, we run six single-purpose agents (Analyst, Planner, Breakdown, Rescheduler, Coach, Copilot), each with its own endpoint, prompt template, and JSON schema — making the AI **predictable, debuggable, and directly renderable**.

- **🔒 Security-first AI architecture.** The Gemini key is **never** exposed to the browser. A dedicated Express proxy holds the key, enforces a CORS allow-list and payload caps, and never logs secrets — a genuinely production-grade pattern, not a hackathon shortcut.

- **🛟 "Can't-crash" resilience.** Three layers of graceful fallback (no key → mock, backend down → mock, invalid JSON → validated mock) plus a global error boundary mean **no blank screens, no infinite loaders, no undefined crashes** — the app is demo-safe under any condition.

- **🎯 Context-grounded Copilot with memory.** The assistant reasons over your **live** tasks, habits, schedule, and stats — with 5-turn conversational memory — so answers are about *your* day, not generic advice. Structured response cards are built client-side from real data, so the AI **can't hallucinate your tasks**.

- **📊 Insight, not just charts.** The Insights page converts raw activity into *meaning*: most productive time of day, most ignored category, average delay, and human-readable coaching — turning data into a feedback loop that actually changes behavior.

- **🗣️ Multi-modal, zero-dependency voice.** Browser-native Web Speech API lets users *speak* commands to the Copilot — no extra SDKs, no extra cost.

- **✨ Premium, production-ready polish.** Glassmorphism design, Framer Motion micro-interactions, full loading/empty/error states, memoized rendering, and a passing production build — it looks and feels like a shipped SaaS product, not a prototype.

---

### Thank you for reviewing Deadline Guardian AI 🛡️
*Built to turn anxiety about deadlines into confidence — powered by Google Gemini.*
