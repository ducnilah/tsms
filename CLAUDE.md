# CLAUDE.md - TSMS System Planning Guide

This file guides AI-assisted planning and implementation for TSMS (Teaching Schedule Management System).

## Product Context

TSMS is a university teaching schedule management system for the Training Department. The system replaces Excel/email-based scheduling with a centralized web platform for master data, lecturer preferences, teaching assignment, schedule planning, conflict detection, schedule publication, lookup, notifications, and reporting.

Primary business goals:

- Reduce semester scheduling time by at least 60%.
- Detect all uncontrolled conflicts before schedule publication.
- Provide one consistent schedule data source for all user roles.
- Support web/mobile schedule lookup for lecturers and students.
- Provide teaching workload reporting for payment and evaluation processes.

## Current Tech Stack

- TypeScript strict across the project.
- Frontend: React, Vite, TanStack Router, TanStack Query, shared shadcn/ui components.
- Backend: Hono as HTTP host, oRPC for type-safe procedures.
- Database: PostgreSQL with Drizzle ORM.
- Monorepo: Turborepo.
- Formatting/linting: Biome.

## Architectural Direction

Keep the architecture modular:

- `apps/web`: UI routes, pages, client-side state, TanStack Query usage.
- `apps/server`: Hono HTTP server, CORS, logger, oRPC handler mounting.
- `packages/api`: business procedures, validation, auth, scheduling use cases.
- `packages/db`: schema, migrations, database access.
- `packages/ui`: shared UI primitives and styles.
- `packages/env`: validated environment variables.

Do not put business logic in Hono route handlers. Hono should stay as the HTTP adapter. Business behavior belongs in `packages/api`, and persistent data shape belongs in `packages/db`.

## Domain Model Plan

Core entities:

- User: account identity and status.
- Role: system role for RBAC.
- UserRole: many-to-many user-role mapping.
- Department: faculty/department tree.
- Lecturer: teaching profile, department, academic title, workload quota, status.
- Course: course code, name, credits, theory/practice periods, required room type.
- StudentGroup: class/group taking a course in a semester.
- Room: room code, building, capacity, room type, equipment, status.
- Semester: academic year, term, date range, teaching weeks, status.
- TimeSlot: day/period/session configuration.
- LecturerPreference: teachable courses, preferred/unavailable time, constraints.
- TeachingAssignment: lecturer assigned to a student group/course.
- ScheduleDraft: versioned schedule plan before publication.
- TeachingSession: actual scheduled lesson/block with time, room, lecturer, group.
- Conflict: detected schedule conflict and resolution status.
- ChangeRequest: request to change room/time/cancel/make-up class.
- Notification: messages to users/groups.
- AuditLog: traceable important actions.

## Functional Planning

Priority labels:

- `M`: mandatory for initial acceptance.
- `S`: should-have after the core is stable.
- `C`: nice-to-have extension.

Phase 1 (core/M):

- Auth and RBAC.
- Master data CRUD/import for departments, lecturers, courses, groups, rooms, slots, semesters.
- Teaching assignment.
- Manual scheduling with conflict detection.
- Schedule lookup by lecturer, room, group, department.
- Audit logs.
- Basic teaching workload report.

Phase 2 (S):

- Lecturer preference registration and approval.
- Assisted/automatic scheduling suggestions.
- Change request workflow.
- Notifications.
- Reporting exports and dashboards.

Phase 3 (C):

- Advanced auto-scheduling weights.
- Calendar sync (Google/Outlook/iCal).
- Advanced leadership dashboard.
- External LMS/student portal API integrations.

## Scheduling Rules

Conflict detection should be treated as core domain logic, not UI logic.

Hard conflicts:

- Same lecturer assigned to overlapping sessions.
- Same room assigned to overlapping sessions.
- Same student group assigned to overlapping sessions.
- Room capacity is smaller than group size.
- Room type/equipment does not satisfy course requirement.
- Session falls outside semester/time-slot configuration.
- Lecturer is unavailable at the scheduled time.

Soft constraints:

- Avoid undesirable periods.
- Group lecturer sessions into fewer days when possible.
- Prefer lecturer/faculty preferred campus or room type.
- Avoid overloading lecturers per day/week.

Design conflict logic to be testable with plain data inputs and deterministic outputs.

## API Planning

Use oRPC procedures with Zod input validation.

Suggested procedure groups:

- `auth.*`: login, register, refresh, logout, me.
- `users.*`: list, create, update, lock, reset password.
- `roles.*`: list, assign, revoke.
- `departments.*`
- `lecturers.*`
- `courses.*`
- `studentGroups.*`
- `rooms.*`
- `semesters.*`
- `timeSlots.*`
- `preferences.*`
- `assignments.*`
- `schedules.*`
- `conflicts.*`
- `changeRequests.*`
- `notifications.*`
- `reports.*`
- `auditLogs.*`

Use `ORPCError` for business errors:

- `UNAUTHORIZED`: unauthenticated or invalid credentials.
- `FORBIDDEN`: authenticated but not allowed.
- `CONFLICT`: duplicate data or schedule conflict.
- `BAD_REQUEST`: invalid action or unsupported state transition.
- `NOT_FOUND`: missing record.

## Database Planning

Use Drizzle schemas under `packages/db/src/schema`.

Rules:

- Export every schema file from `packages/db/src/schema/index.ts`.
- Generate a migration after schema changes.
- Prefer explicit unique constraints for natural identifiers such as user email, course code, room code, department code.
- Keep audit data append-only.
- Use foreign keys for core relationships.
- Avoid deleting published schedule history; prefer status fields or archival.

Migration commands:

```bash
pnpm db:generate
pnpm db:migrate
```

For local development with Docker PostgreSQL on port `5433`:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/tsms
```

## Frontend Planning

Use TanStack Router file routes in `apps/web/src/routes`.

UI principles:

- Build operational screens, not marketing pages.
- Prefer dense but readable layouts for scheduling workflows.
- Use shared UI components from `@tsms/ui/components`.
- Use TanStack Query for data fetching/mutations.
- Use TanStack Table for large grids such as schedules, rooms, assignments, conflict lists.
- Keep form validation aligned with backend Zod schemas where possible.

Important screens:

- Login/register.
- Dashboard by role.
- Master data management.
- Lecturer preference registration.
- Assignment board.
- Weekly schedule planner.
- Conflict list/resolution panel.
- Room availability search.
- Change request workflow.
- Schedule lookup.
- Reports.

## Auth And Session Direction

Current auth direction:

- Access token: short-lived JWT.
- Refresh token: random token returned to client for local learning.
- Database stores hashed refresh token in `sessions`.
- Future production improvement: move refresh token into HttpOnly Secure Cookie.

Required next steps:

- Add `auth.refresh`.
- Add `auth.logout`.
- Add protected procedure middleware.
- Add role-aware authorization checks.

## Quality Bar

Before marking a feature complete:

- TypeScript passes.
- Database migration is present and applied.
- API uses Zod validation and typed responses.
- Business errors use `ORPCError`, not generic `Error`.
- Important scheduling/conflict logic has tests.
- UI handles loading, success, empty, and error states.
- Role permissions are considered.
- Audit log is recorded for destructive or official scheduling actions.

## Implementation Order

Recommended order:

1. Stabilize auth/session/RBAC.
2. Build master data tables and CRUD.
3. Build semester/time-slot model.
4. Build assignment model.
5. Build manual schedule creation.
6. Implement conflict detection.
7. Build schedule lookup.
8. Add change requests and audit logs.
9. Add reports.
10. Add auto-scheduling suggestions.

