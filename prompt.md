# TradeSync Pro — PySide6 Migration Prompt Playbook

This file gives exact, step-by-step migration guidance and copy-paste prompts for moving `trade-sync-client` UI from CustomTkinter to PySide6 without breaking backend/frontend/client contracts.

---

## 0) Non-Negotiable Rules

Before every migration task, enforce these rules:

1. Do not change REST routes, socket event names, or payload keys.
2. Keep node identity semantics:
   - MASTER verifies with `licenseKey`
   - SLAVE verifies with `email`
3. Keep socket events exactly:
   - `register_node`
   - `test_signal`
   - `trade_execution`
4. Keep payload compatibility for slave execution:
   - `event`, `master_ticket`, `symbol`, `action`, `volume` (plus optional `pnl`, `signalId`)
5. Keep MT5 execution logic and magic-number loop prevention intact.
6. Make additive changes first (parallel Qt files), remove old UI only after parity validation.

Canonical references:
- `README.md`
- `SYSTEM_CONTRACT_MATRIX.md`
- `trade-sync-backend/backendReadme.md`
- `trade-sync-frontend/frontendReadme.md`
- `trade-sync-client/clientReadme.md`

---

## 1) Migration Scope Map

## Files expected to stay mostly unchanged
- `trade-sync-client/controllers/mt5_adapter.py`
- `trade-sync-client/controllers/socket_manager.py`
- `trade-sync-client/master_recorder.py`
- `trade-sync-client/models/app_state.py`
- `trade-sync-client/models/trade_signal.py`

## Files expected to change lightly
- `trade-sync-client/controllers/ui_controllers/master_controller.py`
- `trade-sync-client/controllers/ui_controllers/slave_controller.py`

## Files expected to be replaced (UI layer)
- `trade-sync-client/views/master_ui.py`
- `trade-sync-client/views/slave_ui.py`

## Entrypoints to switch later
- `trade-sync-client/main_master.py`
- `trade-sync-client/main_slave.py`

---

## 2) Step-by-Step Migration Plan

## Step 1 — Create Parallel Qt UI (No behavior changes)

- Add new Qt view files in parallel, e.g.:
  - `trade-sync-client/views/qt/master_window.py`
  - `trade-sync-client/views/qt/slave_window.py`
- Mirror existing login/dashboard controls from CustomTkinter.
- Keep old CustomTkinter files untouched.

Exit criteria:
- Qt windows open.
- UI controls render without wiring complete logic yet.

## Step 2 — Add UI Event Bridge (Signals)

- Introduce signal-friendly hooks between controllers and Qt views.
- Replace direct UI callback assumptions with event emission pattern.
- Ensure all UI updates occur on Qt main thread via signals/slots.

Exit criteria:
- Logs update in Qt UI from controller events.
- No direct widget mutation from worker threads.

## Step 3 — Wire Master Flow in Qt

- Connect login form to `MasterController.login_mt5`.
- Connect start/stop button to `toggle_broadcasting`.
- Show logs and connection status in Qt widgets.

Exit criteria:
- Master can verify node, connect MT5, connect socket, and start broadcasting.

## Step 4 — Wire Slave Flow in Qt

- Connect login form to `SlaveController.login_mt5`.
- Wire risk multiplier, mapping actions, and listening toggle.
- Ensure `on_trade_signal` outcomes surface in UI logs.

Exit criteria:
- Slave can verify node, connect MT5/socket, subscribe behavior remains intact, copy engine works.

## Step 5 — Switch Entrypoints

- Update:
  - `main_master.py` to launch Qt master window
  - `main_slave.py` to launch Qt slave window
- Keep rollback path documented (old UI files retained temporarily).

Exit criteria:
- Both entrypoints run Qt UI by default.

## Step 6 — Validation + Cleanup

- Run contract validation checklist (Section 4 below).
- Only after parity passes: archive/remove old CustomTkinter views.
- Update docs (`clientReadme.md`, maybe matrix if contracts changed).

---

## 3) Copy-Paste Prompts for AI (By Phase)

## Prompt A — Phase 1 (Parallel Qt Scaffolding)

```text
You are migrating TradeSync Pro Python desktop UI from CustomTkinter to PySide6.

Read first:
1) README.md
2) SYSTEM_CONTRACT_MATRIX.md
3) trade-sync-client/clientReadme.md

Task:
- Create new parallel Qt UI files only:
  - trade-sync-client/views/qt/master_window.py
  - trade-sync-client/views/qt/slave_window.py
- Replicate high-level structure of current CustomTkinter screens:
  - Login screen for Master and Slave
  - Dashboard screen for Master and Slave
- Do not wire business logic deeply yet.
- Do not modify MT5 adapter, socket manager, or recorder behavior.
- Do not remove existing CustomTkinter files.

Output requirements:
- Provide exact code changes only for new files.
- Keep existing contracts untouched.
```

## Prompt B — Phase 2 (Controller ↔ Qt Signal Bridge)

```text
Continue migration with minimal-risk changes.

Read:
- trade-sync-client/controllers/ui_controllers/master_controller.py
- trade-sync-client/controllers/ui_controllers/slave_controller.py
- newly created Qt files under trade-sync-client/views/qt/
- SYSTEM_CONTRACT_MATRIX.md

Task:
- Add a signal/event-friendly bridge so controller logs/state updates can be consumed by Qt UI safely.
- Ensure background work never mutates Qt widgets directly.
- Keep business logic and contract behavior unchanged.

Do not:
- Rename events, routes, payload fields, or role semantics.
- Refactor unrelated modules.

Output:
- Focused patch with explanation of thread-safety approach.
```

## Prompt C — Phase 3 (Master Qt Wiring)

```text
Wire Master Qt UI to existing controller logic with no contract changes.

Files in scope:
- trade-sync-client/views/qt/master_window.py
- trade-sync-client/controllers/ui_controllers/master_controller.py (only if needed)

Requirements:
- Login invokes login_mt5 with existing parameters.
- Start/stop button invokes toggle_broadcasting.
- Log panel updates from controller events.
- Preserve verify-node semantics (MASTER uses license key).
- Preserve socket register_node and test_signal flow.

Return:
- exact patch + brief validation steps.
```

## Prompt D — Phase 4 (Slave Qt Wiring)

```text
Wire Slave Qt UI to existing controller logic with no contract changes.

Files in scope:
- trade-sync-client/views/qt/slave_window.py
- trade-sync-client/controllers/ui_controllers/slave_controller.py (only if needed)

Requirements:
- Login invokes login_mt5 with existing parameters.
- Risk multiplier and symbol map UI connect to controller methods.
- Listening toggle invokes toggle_listening.
- Logs update correctly.
- Preserve verify-node semantics (SLAVE uses email identifier).
- Preserve trade_execution consumption and ticket_map behavior.

Return:
- exact patch + brief validation steps.
```

## Prompt E — Phase 5 (Entrypoint Switch)

```text
Switch app entrypoints to PySide6 UI while keeping rollback safety.

Files in scope:
- trade-sync-client/main_master.py
- trade-sync-client/main_slave.py
- trade-sync-client/requirements.txt

Requirements:
- Launch Qt app windows from entrypoints.
- Add PySide6 dependency if missing.
- Keep old UI files in repo for rollback.
- No contract changes.

Output:
- exact patch + rollback note.
```

## Prompt F — Phase 6 (Parity Validation + Docs)

```text
Validate PySide6 migration parity and update docs.

Read:
- SYSTEM_CONTRACT_MATRIX.md
- trade-sync-client/clientReadme.md
- all changed client UI/controller files

Task:
- Confirm no REST/socket contract changes.
- Document any behavior differences found.
- Update clientReadme.md migration section.
- If any contract changed (should not), update SYSTEM_CONTRACT_MATRIX.md.

Output:
- patch + validation checklist with pass/fail notes.
```

---

## 4) Contract Parity Validation Checklist

Use this exact checklist after each phase:

1. MASTER login
   - verify-node request uses `{ role: "MASTER", identifier: <licenseKey> }`
   - MT5 connection succeeds
2. SLAVE login
   - verify-node request uses `{ role: "SLAVE", identifier: <email> }`
   - MT5 connection succeeds
3. Socket registration
   - both roles emit `register_node` after connect
4. Master broadcasting
   - emits `test_signal` with expected keys
5. Slave execution
   - receives `trade_execution`
   - applies risk multiplier
   - honors symbol mapping rules
   - maintains ticket map for CLOSE symmetry
6. No contract drift
   - event names and payload keys unchanged

---

## 5) Safe Prompt Usage Pattern

When asking any AI model to implement a step:

1. Attach this `prompt.md`.
2. Attach `SYSTEM_CONTRACT_MATRIX.md`.
3. Attach only files in the current phase scope.
4. Ask for minimal patch and explicit “contract impact: none/changed”.
5. Run checklist from Section 4 before moving to next phase.

---

## 6) One-Shot “Master Prompt” Template

```text
You are implementing one phase of TradeSync Pro's CustomTkinter -> PySide6 migration.

Must-read docs:
- prompt.md
- SYSTEM_CONTRACT_MATRIX.md
- trade-sync-client/clientReadme.md

Current phase:
[PASTE PHASE NAME]

Files allowed to modify:
[PASTE ALLOWED FILE LIST]

Hard constraints:
- Do not change REST routes, event names, role semantics, payload keys.
- Do not refactor unrelated code.
- Keep changes additive and minimal.

Deliverables:
1) concise plan
2) exact patch
3) contract impact statement
4) phase validation checklist results
```

---

This playbook is intentionally strict so you can scale AI-assisted migration with minimal regression risk.
