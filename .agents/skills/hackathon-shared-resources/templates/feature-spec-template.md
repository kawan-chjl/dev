# Feature Spec: [Feature Name]

**Project:** [Project name]
**Feature ID:** FS-[NUMBER]
**Author:** [Name]
**Date:** YYYY-MM-DD
**Status:** [Draft | Approved | In Progress | Complete]
**Parent PRD:** [Link or reference]
**Priority:** [P0 — Must Have | P1 — Should Have | P2 — Nice to Have]

---

## Summary

[One paragraph: what this feature does, who uses it, and why it matters to the demo or product.]

---

## User Story

**As a** [type of user],
**I want to** [perform some action],
**so that** [I achieve some outcome].

---

## Scope

### In Scope

- [Specific behavior or interaction included]
- [Specific behavior or interaction included]

### Out of Scope

- [Explicitly excluded behavior]
- [Explicitly excluded behavior]

---

## Functional Requirements

| ID    | Requirement                  | Priority     |
| ----- | ---------------------------- | ------------ |
| FR-01 | [System shall / User can...] | Must         |
| FR-02 | [System shall / User can...] | Must         |
| FR-03 | [System shall / User can...] | Should       |
| FR-04 | [System shall / User can...] | Nice to Have |

---

## Non-Functional Requirements

| Requirement   | Target                             | Notes     |
| ------------- | ---------------------------------- | --------- |
| Performance   | [e.g., response < 2s]              | [Context] |
| Reliability   | [e.g., must not crash during demo] | [Context] |
| Compatibility | [e.g., Chrome only is acceptable]  | [Context] |
| Accessibility | [e.g., not required for MVP]       | [Context] |

---

## User Interface

### Screen / State: [Name]

**Description:** [What the user sees and can do]

```
[ASCII mockup or description of UI layout]
```

**Interactions:**

- [Action] → [Result]
- [Action] → [Result]

### Error States

- [Error condition] → [What the user sees]
- [Error condition] → [What the user sees]

---

## Data Model

| Field        | Type   | Required | Description   |
| ------------ | ------ | -------- | ------------- |
| [field_name] | [type] | Yes/No   | [Description] |
| [field_name] | [type] | Yes/No   | [Description] |

---

## API / Integration

**Endpoint / Service:** [Name]

**Request:**

```json
{
  "field": "value"
}
```

**Response:**

```json
{
  "field": "value"
}
```

**Error handling:** [How errors are handled]

---

## Acceptance Criteria

All criteria must be verifiable by a team member in under 5 minutes.

- [ ] **AC-01:** Given [context], when [action], then [observable outcome].
- [ ] **AC-02:** Given [context], when [action], then [observable outcome].
- [ ] **AC-03:** Given [context], when [action], then [observable outcome].
- [ ] **AC-04 (Edge case):** Given [edge context], when [action], then [system handles gracefully].

---

## Implementation Notes

[Technical notes for the developer implementing this feature. Include library recommendations, known pitfalls, or shortcuts acceptable for the hackathon.]

**Acceptable shortcuts for hackathon:**

- [Shortcut 1 — e.g., hardcode user session]
- [Shortcut 2 — e.g., mock third-party API response]

**Tech debt to note:**

- [Item 1]

---

## Dependencies

| Dependency             | Type      | Status        |
| ---------------------- | --------- | ------------- | ------ | ----------- | -------- |
| [Feature / Task / API] | [Blocking | Non-blocking] | [Ready | In Progress | Blocked] |

---

## Estimated Effort

**Estimate:** [X hours]
**Assigned to:** [Name or role]
**Target completion:** H+[N] (hour offset from hackathon start)
