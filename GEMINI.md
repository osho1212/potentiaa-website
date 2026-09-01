# Agent Workflow & Engineering Guidelines (GEMINI.md)

This document defines the mandatory operating protocol for the AI coding assistant working on the **POTENTIAA Website** codebase.

---

## 🧭 Mandatory 5-Step Workflow Protocol

Whenever a new user request or feature is assigned, the assistant MUST follow these sequential phases:

```
[1. Ask & Clarify] ──► [2. Structured Plan & Tasks] ──► [3. Side Branch & Execute] ──► [4. Thorough Verification] ──► [5. User Approval & Merge]
```

---

### Phase 1: Clarify & Ask Questions First
* **Never assume or guess intent** on ambiguous, underspecified, or design-critical requirements.
* Proactively ask clarifying questions to align on:
  * Visual aesthetics, motion dynamics, layout structure, and design intent.
  * Behavioral expectations across desktop and mobile screens.
* Ensure all constraints and edge cases are clearly understood **before** formulating the implementation plan.

---

### Phase 2: Mandatory Planning & Task Breakdown
* **Always create/update an `implementation_plan.md`** before making any code modifications.
* The plan must include:
  1. **User Review Required**: Breaking changes, architectural choices, or design decisions.
  2. **Open Questions**: Any remaining design questions for user feedback.
  3. **Structured Task Breakdown**: Discrete, ordered checklist of tasks (components, styles, shaders, state, verification).
* **Wait for user feedback/approval** on the plan before proceeding to execution.

---

### Phase 3: Side Branch Execution
* **Never work directly on the `main` branch for unverified work**.
* Create and checkout a dedicated feature/experiment branch (e.g. `feat/...`, `experiment/...`) for any major work or changes.
* Keep edits modular, clean, and strictly aligned with the approved task list.
* Follow the project's premium design standards:
  * Pure `#000000` deep black aesthetic.
  * Custom glassmorphism, responsive 3D transforms, and smooth shaders.
  * Zero placeholder elements & no visual clipping across section boundaries.

---

### Phase 4: Thorough Re-Checking & Verification
* **Rigorously verify all work before presenting to the user**:
  1. **Automated Verification**: Run `npm run build` to verify zero TypeScript errors, compilation errors, or lint issues.
  2. **Visual & Interaction Checks**: Ensure all animations, 3D card tilt/parallaxes, particle simulations, and constellation nodes function smoothly without clipping or frame drops.
  3. **Cross-Browser & Responsiveness**: Verify responsive layouts, scrollbar invisibility, and fluid scaling.
* Document all verified items and changes in `walkthrough.md`.

---

### Phase 5: User Approval & Commit Protocol
* Present the verified results clearly in the walkthrough.
* Only commit and merge changes into `main` after thorough verification and explicit user confirmation.
