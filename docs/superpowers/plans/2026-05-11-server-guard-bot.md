# Server Guard Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure Telegram duty bot that reports server/service health and controls only whitelisted services.

**Architecture:** The bot reads a service registry, accepts Telegram updates only from allowed users/chats, requires TOTP confirmation for mutating actions, and executes only predefined command templates. No arbitrary shell commands are exposed.

**Tech Stack:** Node.js, TypeScript, built-in `node:test`, Telegram Bot API over `fetch`, local process execution through `spawn` without shell.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `config/services.example.json`

- [x] Define scripts for build, test, and local bot run.
- [x] Define example registry for Docker Compose, systemd, and PM2 services discovered on the first VPS.

### Task 2: Security Core

**Files:**
- Create: `src/security/auth.ts`
- Create: `src/security/totp.ts`
- Create: `src/security/rate-limit.ts`
- Test: `tests/security.test.ts`

- [x] Implement strict allowlist checks for Telegram user and chat ids.
- [x] Implement TOTP verification with time-window tolerance.
- [x] Implement cooldown/rate-limit for dangerous actions.

### Task 3: Service Registry And Command Whitelist

**Files:**
- Create: `src/config/registry.ts`
- Create: `src/services/actions.ts`
- Test: `tests/registry.test.ts`
- Test: `tests/actions.test.ts`

- [x] Parse and validate registry entries.
- [x] Reject unknown service kinds, duplicate ids, and unsupported actions.
- [x] Build exact command argv arrays for status/logs/start/restart/stop.

### Task 4: Telegram Interface

**Files:**
- Create: `src/telegram/api.ts`
- Create: `src/telegram/bot.ts`
- Create: `src/telegram/keyboards.ts`

- [x] Add button menu for servers, services, status, logs, and mutating actions.
- [x] Ask for TOTP code before start/restart/stop.
- [x] Log all accepted and rejected actions.

### Task 5: Deployment Assets

**Files:**
- Create: `deploy/server-guard-bot.service`
- Create: `README_RU.md`

- [x] Document secure installation, secrets, sudoers boundary, and deployment flow.
