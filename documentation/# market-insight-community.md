# Piranha Community

A web-based investment community platform for a stock market influencer and their existing community. The MVP is a **Content Hub + Private Investment Community** — content consumption and community information first, no trading functionality.

| | |
| --- | --- |
| **Product Brief** | [00.brief-early.md](./00.brief-early.md) |
| **Stack** | Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS v4 |
| **Docs convention** | `features/{epic}/{feature}/{feature}-v{n}.md`, epic index per epic folder |

## Epics

| Epic | Features | Index |
|------|----------|-------|
| Authentication | Login | [authentication.md](./features/authentication/authentication.md) |
| Home | Home Dashboard | [home.md](./features/home/home.md) |
| Video Content | Video Library, Video Detail | [video-content.md](./features/video-content/video-content.md) |
| Updates | Updates Feed, News, Announcement | [updates.md](./features/updates/updates.md) |
| Discovery | Search | [discovery.md](./features/discovery/discovery.md) |
| Profile | Profile | [profile.md](./features/profile/profile.md) |
| Live Sessions | Upcoming Live Session | [live-sessions.md](./features/live-sessions/live-sessions.md) |

## Shared Domain Model

| Entity | Owned by (first spec) | Notes |
|--------|----------------------|-------|
| User | authentication/login | Role `MEMBER`/`ADMIN`, `membershipStatus` |
| Category | video-content/video-library | Shared taxonomy for videos and news only |
| Video | video-content/video-library | External providers: upload / Vimeo / unlisted YouTube |
| News | updates/news | Has category, optional cover image |
| Announcement | updates/announcement | No category; optional CTA (label + URL) |
| LiveSession | live-sessions/upcoming-live-session | External join URL; no hosted streaming |

## Not Yet Spec'd

- **Admin epic** — publish/manage videos, news, announcements, live sessions and members; feature/pin content. Listed in brief §2 but needs product input (no admin UI detail exists yet).
- **Nice-to-haves** (brief §14): comments, bookmarks, reactions, notifications, video chapters, related content.
