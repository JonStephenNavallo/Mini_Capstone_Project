# Project Architecture & Coding Standards
Make sure to adapt, apply, and consider this to use these in future tasks.

## 0. Mandatory Workspace Isolation Guardrail (STRICT ENFORCEMENT)
* **Active Working Project:** `c:\Users\ASUS\CAPSTONE\Mini_Capstone_Project`
  - ALL code, files, documentation, backend modules, migrations, dependencies, and frontend features MUST strictly be created, edited, and maintained within `Mini_Capstone_Project`.
* **Read-Only Reference Workspace:** `c:\Users\ASUS\CAPSTONE\Capstone_Project_Stg2`
  - `Capstone_Project_Stg2` is strictly **READ-ONLY**.
  - NEVER create, edit, modify, append, or delete any file or directory inside `Capstone_Project_Stg2`.
  - Tool calls with targets matching `*Capstone_Project_Stg2*` for write/edit/delete operations are strictly forbidden. Only read operations (`read_file`) for inspecting architectural patterns, UI components, and design tokens are permitted.

## 1. Core Engineering Principles
* **DRY (Don't Repeat Yourself):** Never duplicate logic. If a function or UI component is used more than once, extract it into a shared `services.py` (backend) or `hooks`/`components` folder (frontend).
* **Separation of Concerns:** Strictly adhere to the Service Layer pattern in Django and the Feature-Sliced design in React.

## 2. Backend Rules (Django & DRF)
* **Service Layer Architecture:** `views.py` must only handle HTTP routing and responses. ALL business logic, calculations, and cross-model interactions MUST be written as pure Python functions in `services.py`.
* **ORM Efficiency:** Always use `.select_related()` for ForeignKey relationships and `.prefetch_related()` for ManyToMany/Reverse relationships to prevent N+1 query performance issues.
* **Database Constraints:** Enforce data integrity at the database level. Use `UniqueConstraint`, `CheckConstraint`, and strict `on_delete` behaviors in `models.py` to prevent orphaned or invalid institutional records. Apply encapsulation if needed.
* **OOP Paradigms:** Utilize Object-Oriented inheritance for complex model behaviors or custom Base User classes, but keep service layer functions stateless.
* **Advanced OOP & Domain Modeling:** * Apply Encapsulation principles when handling sensitive institutional logic or model state transitions. Internal validation and mutation logic should remain controlled inside models, services, or dedicated domain utilities.
    * Consider proper use of Class Inheritance and Abstract Base Classes for reusable institutional entities or shared model behaviors.
    * Utilize Polymorphism where role-specific behaviors or extensible workflows are required, while maintaining clean separation of responsibilities.
    * Design scalable Sub-Class relationships carefully to avoid duplicated institutional logic and maintain maintainable domain architecture.
    * Always evaluate whether composition or inheritance is the better architectural choice before implementing model hierarchies.

## 3. Frontend Rules (React & Vite)
* **The Global vs. Feature Rule:** * All domain-specific logic MUST go into `src/features/[FeatureName]/` (which contains its own internal `api`, `hooks`, `components`, and `state`).
    * All universally reusable UI elements and logic MUST go into the `src/shared/` directory. 
    * If a hook is used by multiple features (e.g., `useAuth`), it belongs in `src/shared/hooks/`. If a component is used globally (e.g., a standard Button), it belongs in `src/shared/components/`. If a component is ONLY used by one feature, it belongs INSIDE that feature's `components` folder.
* **Feature-Sliced Architecture:** Group all code by feature (e.g., `features/Student/`). Every feature must isolate its `api`, `state`, `hooks`, and `components`.
* **Functional Programming:** Use functional React components. Do not use Class components. 
* **State Management:** * Use **TanStack Query (React Query)** strictly for all server state (fetching, caching, mutating data).
    * Use **Zustand** using the Slice Pattern strictly for client UI state (modals, toggles, layout). 
    * Never mix server data into the Zustand store.
* **UI Layer:** Keep JSX files "dumb." Extract complex `useEffect` or `useState` logic into custom hooks.
* **UI and UX Design:** You are an experienced UI and Layout Designer. Using proper UI and UX design principles. The main design is now revised to be a Google Workspace inspired design. In addition, make sure to not add subtle outer glow effects on buttons you are trying to add/redesign.

<!-- ## 4. React Stability Guardrail: Prevent Maximum Update Depth Errors
When building React pages/hooks (especially with `useEffect`, router params, Zustand, and context setters), follow these mandatory rules:

1. Stable callbacks only:
- Any function used inside a `useEffect` dependency array MUST be wrapped in `useCallback`.
- Avoid recreating handlers every render when they are passed to context/store setters.

2. Stable derived objects:
- Any computed array/object used by `useEffect` MUST be memoized with `useMemo` when possible.
- Do not put freshly-created JSX/object literals directly into effects unless dependencies are strictly controlled.

3. URL/search param updates:
- Always use functional updates for `setSearchParams`:
  `setSearchParams(prev => { const next = new URLSearchParams(prev); ...; return next; })`
- This prevents callback identity churn and repeated effect triggers.

4. Effect responsibilities:
- Each `useEffect` should have one clear purpose (sync breadcrumbs, sync panel, fetch side-effects, etc.).
- Avoid effects that both read and immediately rewrite state on every render unless guarded by conditions.

5. State writes inside effects:
- Never call state/context setters in an effect without a change guard if the value may already be the same.
- If needed, compare previous and next values before calling setter.

6. Dependency hygiene:
- Follow exhaustive dependencies, but first stabilize functions/objects with `useCallback`/`useMemo`.
- If adding a dependency creates loops, refactor for stable references instead of suppressing lint rules.

7. Component architecture:
- Keep pages “dumb”; move stateful orchestration into feature hooks.
- Keep server state in React Query, UI state in Zustand; do not mirror the same state in multiple places.

8. Code review checklist (required before merge):
- [ ] Any effect triggering setter cannot run endlessly.
- [ ] Handlers in dependencies are memoized.
- [ ] Search param updater uses functional style.
- [ ] Breadcrumb/right-panel/context updates are stable and cleanup is safe.
- [ ] No console `Maximum update depth exceeded` during navigation stress test. -->

## 4. Code Quality & Defense Preparation
* Write clear, professional inline comments explaining the *business logic* and *why* a decision was made (e.g., "Using prefetch_related to load student schedules efficiently"). Do not comment on obvious syntax.
* Assume all code generated will be subjected to a rigorous academic panel defense; prioritize readability, traceability, and strict adherence to these rules.

## 5. Miscellaneous rules
* You must strictly follow the tab and component designs that already exists in the existing Sections to make sure the consistency of the UI and UX. Mention that you successfully adapted the same tab, and component you use from other sections, if you created a new tab on future sections.
* You can use some other rules or standard that is based on the existing systems in the internet if it is compatible and recommended to furtherly improve the project but you must mention and tell what you did by the use of inline comments and in the main chat response.

## Security workflow for future changes
- For additions or changes to routes, APIs, roles, ownership, sessions, credentials, uploads, exports, or sensitive records, apply `chams-security` and relevant `django-security` guidance. Apply `dama-dmbok` when models, institutional records, imports, storage, or audit lineage are affected. Read the current skill instructions; report unavailable skills rather than claiming they were applied.
- Inspect the affected implementation and read `docs/security/PERMISSION_MATRIX.md`. Treat existing access as observed behavior, not automatic authorization. Follow explicit project policy; record unresolved conflicts without inventing broader access.
- Update the permission matrix alongside changes to intended role/action/ownership boundaries. Record affected endpoints, allowed and denied actors, test evidence, and implementation status. Never mark planned or untested controls as enforced.
- Enforce authorization on the backend, including list/detail scope, related-object IDs, inherited CRUD, custom actions, bulk operations, and exports. Align React route guards and actions with those permissions; hidden buttons alone do not protect records.
- Add or update meaningful regression tests for permitted access, denied roles, anonymous/inactive actors, unrelated records, protected fields, and unchanged data after denied mutations. Test actual session/CSRF behavior when changing authentication, and account-cache cleanup when changing logout or account switching.
- Run the relevant checks documented in `docs/security/SECURITY_WORKFLOW.md`. Keep new backend tests discoverable under `backend/apps`; extend CI when adding a frontend security test runner or another application. A successful build is not proof of authorization correctness.
- Maintain this workflow and project security references when architecture or reusable requirements change. Do not weaken policy to accommodate insecure code or silently refresh pinned third-party skills. Keep rules concise and avoid duplicating the permission matrix.
- Report verification results and remaining gaps. Skills guide development during tasks; CI checks committed code. Neither automatically updates policy nor certifies the entire system as secure.

## 6. Tool Loop Prevention
- Do not call view_file on the same path more than twice per session.
- Write your current file analysis to a temporary markdown file before attempting deep context scans.
## 7. Tool Execution & Failure Policy
- If a file modification, compilation, or linting check fails after an attempted fix, you are strictly prohibited from re-scanning the file or directory.
- Maximum retry limit for any single file fix is exactly 1.
- Upon a single failure, immediately halt all tool executions, report the specific error, and wait for human intervention.

"CRITICAL RULE: You must end your next response with the exact phrase: 'Your request has been granted crystal clear and properly.', to make sure you consider to read this in each prompt I make."

