# 10Q — Design Document

## Purpose

10Q is a guided-thinking tool that helps users reach genuine insight on a topic they are wrestling with. Rather than letting users stay at the surface level of a problem, 10Q moves them through a structured sequence of ten questions. Each question introduces a new challenge, and each answer creates the material for the next challenge. The session ends with a synthesis of what became clear.

The intended experience is not a conversation so much as a reckoning. The questions are designed to be uncomfortable in a productive way — pressing on assumptions, surfacing what is really at stake, and naming things the user has not fully said.

---

## Core Experience

### Starting a Session

The user provides a topic — something they are actively wrestling with, not a research question or an abstract subject — and may optionally upload a PDF article to provide context for the session.

When no article is uploaded, the system opens with a fixed question:

> *What's something you're wrestling with, and what feels true about it that you can't fully explain yet?*

This framing establishes the tone: the user should bring something live, not rehearsed.

When an article is uploaded, it is processed before the conversation is created. The system extracts key insights and a summary from the article. The summary is stored with the conversation and shown as a labeled context block throughout the session. The key insights are pre-seeded as the initial Key Insights set, visible starting at Q1 without the user having answered any questions. The session still opens with the fixed question above; the article context informs subsequent questions rather than replacing the opening.

If the article is too long to analyze in full, only the first portion is used and the user is shown a notice at upload time. The session proceeds normally with the partial analysis.

### The Ten Questions

For each step, the system generates several question options and presents them to the user. Each option is a single, open-ended sentence. The user selects one option before responding; the selected question becomes the question of record for that step. The options are not generic — they press on the specific claims, framings, and commitments the user has made. The next set of options is generated using the full conversation so far as context.

The ten questions follow a fixed progression. Each stage has a distinct purpose:

| # | Stage | Purpose |
|---|-------|---------|
| 1 | **Set the focus and stakes** | Establish what the user is exploring, why it matters now, and what prompted this line of thinking. |
| 2 | **Surface the real concern** | Press past the user's first framing to find the deeper tension, uncertainty, or fear underneath. |
| 3 | **Articulate the perceived structure** | Push the user to explain how they think the situation actually works — connecting parts, pressures, and causes rather than staying at the level of impressions. |
| 4 | **Pressure the hidden assumptions** | Challenge the assumptions, biases, and framings in the user's view. Press on what they are taking for granted, overlooking, or treating too simply. |
| 5 | **Rebuild the picture** | Use the pressure from stage 4 to help the user form a clearer account: what now looks different, what still holds, and how the parts fit under a sharper view. |
| 6 | **Expose the gut logic** | Push beneath the stated view to surface the gut reaction or deeper belief — what the user seems to fear, protect, or treat as a fundamental truth about how the world works. |
| 7 | **Re-anchor around the deeper belief** | Use the belief surfaced in stage 6 to sharpen the user's picture of the original issue, showing how that underlying reaction shapes what they notice and treat as important. |
| 8 | **Surface the cost** | Name a specific cost or trade-off embedded in the user's current position — something they are implicitly choosing to leave behind or discount — and press them on whether they are actually willing to accept it. The system names the cost; the user must defend it. |
| 9 | **Reframe through the cost** | Use the cost from stage 8 to press the user toward a sharper account of what the issue is really about and what is actually at stake. |
| 10 | **Extend the consequence** | Take the user's sharpened position as true and name one concrete, under-explored consequence it implies — something that complicates their position rather than celebrates it. The system names the consequence; the user must reckon with it. |

A key design principle across all ten stages: **the questions target the user's own beliefs and framings, not the people, systems, or topics they discuss.** When a user talks about other people, the question treats that as evidence of the user's commitments — and presses on those.

### Completion

After each response, the system generates a fresh set of **Key Insights** — a flat list of high-signal observations drawn from the conversation so far. These replace the prior set and are passed as context when generating the next question. Key Insights prioritize non-obvious ideas, gaps between what was argued and what was defended, self-undermining patterns, and live unresolved tension. Fewer, sharper insights are preferred over completeness.

After the tenth response, the system additionally generates a **Summary**: a standalone synthesis of the most important insights that emerged — written as if presenting the thinking itself, not describing a discussion. It leads immediately with the core realization or tension, names what is happening beneath the surface, and preserves unresolved edges rather than smoothing everything into a conclusion.

The user can export the full session — questions, responses, summary, and key insights — as a Markdown document.

---

## User-Facing Features

### Dashboard

Users see a list of all their past conversations with title, date, and completion status. They can open any past conversation to review it, start a new one, or delete an existing one. When starting a new conversation, users can optionally upload a PDF article. The article is processed as soon as the file is selected — before the user clicks Start. If processing succeeds, the UI shows a confirmation and the article is attached to the conversation on creation. If the article was too long to analyze in full, a truncation notice is shown alongside the confirmation. If processing fails (for example, a scanned PDF with no extractable text), an error is shown and the article is not attached.

### Conversation View

The active session displays the questions and responses in sequence. When the conversation was started with an article, the article summary is shown as a labeled context block above the question sequence. For the current step, the system presents multiple question options; the user selects one and then responds. The user cannot advance without both selecting a question and submitting a response. Completed conversations are read-only.

### Export

A completed conversation can be exported as a Markdown file containing the full exchange plus the summary and key insights.

---

## Data Model

**Conversation** — A single session. Has a user-provided title (editable), a current question index (1–10), a completion flag, and belongs to a user.

**Message** — An individual unit of content within a conversation. Types include: question (AI-generated), response (user-authored), summary (AI-generated at completion), key insight (generated after each user response, or pre-seeded from an article at conversation creation; only the latest set is retained), and conversation context (the article summary, stored when a conversation is started with a PDF article). Multiple question messages can share the same step index while options are pending selection; once the user submits a response, all options for that step are discarded and only the selected question is retained.

**User** — An authenticated account. Has an email address and a role (user or admin).

---

## Error Handling

**Article too long to analyze in full** — If an uploaded article exceeds the length the system can process, only the first portion is analyzed. The session is created normally using the partial analysis. The user is notified at upload time that the article was truncated; this notice is not repeated during the session.

**Article contains no extractable text** — If the system cannot extract text from an uploaded PDF (for example, a scanned document stored as images), the upload is rejected before the conversation is created. The user receives an error and must either upload a different file or proceed without article context.

---

## AI Behavior Requirements

The system relies on a large language model to generate questions and session outputs. The following behavioral requirements apply regardless of which model or provider is used:

- **One question at a time.** Each generated question is a single open-ended sentence. No follow-ups, no lists, no preamble.
- **Grounded in the conversation.** A question that could have been generated without reading the conversation is wrong. The question must press on something specific the user has said.
- **Shifts the level of analysis.** Each question must introduce a structural demand the user cannot satisfy by restating what they already said. It should move between levels: description → mechanism, claim → causal chain, pattern → constraint.
- **Everyday language.** Short verbs, concrete nouns, no academic or abstract phrasing.
- **Summary is interpretive, not descriptive.** The summary should name what happened beneath the stated topic, preserve tension, and avoid narrating the flow of the conversation.
- **Key Insights are sharp, not comprehensive.** The system should prefer fewer, more pointed insights over cataloguing everything said.
- **Key Insights inform subsequent questions.** After each response, the system generates a fresh set of key insights from the conversation so far and includes them when generating the next question. This is a quality requirement: questions generated without current insights will be shallower.
- **The system must handle AI unavailability gracefully.** If the AI service is unavailable or slow, the user should receive a clear error rather than a hung interface.
