# Handoff: Server Guard Bot

Дата: 2026-05-11

## Цель

Создаётся отдельный безопасный Telegram-бот-диспетчер `server-guard-bot`, который будет следить за VPS и управлять ботами/сервисами: смотреть статус, логи, запускать, останавливать и перезапускать только разрешённые сервисы.

Проект отдельный от QA-тестировщика, чтобы не смешивать код.

## GitHub и локальная папка

Локально:

```text
C:\Users\user\Documents\GitHub\server-guard-bot
```

GitHub:

```text
https://github.com/flycited2-dotcom/server-guard-bot
```

Первый коммит уже запушен:

```text
29d6f11 Initial secure server guard bot
```

## Что уже реализовано

- Node.js + TypeScript проект.
- Telegram allowlist по `user_id` и `chat_id`.
- TOTP-подтверждение для опасных действий: `start`, `restart`, `stop`.
- Реестр сервисов в `config/services.example.json`.
- Поддержка:
  - Docker Compose;
  - systemd;
  - PM2.
- Whitelist-команды без свободного shell.
- Audit log в JSONL.
- Systemd unit шаблон: `deploy/server-guard-bot.service`.
- Sudoers шаблон: `deploy/serverguard.sudoers.example`.
- README_RU с установкой и безопасностью.
- Генератор TOTP-секрета:

```bash
npm run gen:totp-secret
```

Проверка проходит:

```bash
npm run check
```

Текущее состояние тестов:

```text
8 passed
```

## Первый VPS

Текущий сервер:

```text
212.116.115.150
```

Обнаруженные сервисы:

```text
Docker:
- climat-simf-qa-agent

systemd:
- parser_admin_bot.service

PM2:
- climat-simf-store
```

Они уже добавлены в пример реестра:

```text
config/services.example.json
```

## Важные принципы безопасности

- Не запускать Server Guard от root.
- Создать отдельного пользователя `serverguard`.
- Не давать Telegram-боту свободный терминал.
- Не добавлять команды типа `bash`, `sh`, `docker exec`, `python`, `node` в sudoers.
- Разрешать только конкретные команды из whitelist.
- Секреты хранить только в `.env`, не коммитить.
- Для production включить:

```text
USE_SUDO=true
```

## Что нужно для деплоя

Перед установкой на VPS нужны:

```text
TELEGRAM_BOT_TOKEN=токен нового Server Guard Bot
ALLOWED_TELEGRAM_USER_IDS=Telegram user_id владельца
ALLOWED_CHAT_IDS=chat_id личного чата или группы
TOTP_SECRET_BASE32=секрет из npm run gen:totp-secret
```

После этого:

1. Залить проект на VPS в `/opt/server-guard-bot`.
2. Создать пользователя `serverguard`.
3. Настроить `.env`.
4. Настроить `/etc/sudoers.d/serverguard` по шаблону.
5. Установить `deploy/server-guard-bot.service`.
6. Запустить через systemd.

## Состояние QA-тестировщика на момент handoff

Проект QA:

```text
C:\Users\user\Documents\GitHub\agent_test_site_QA
https://github.com/flycited2-dotcom/agent_test_site_QA
```

VPS-папка:

```text
/root/climat-simf-qa-agent
```

Контейнер:

```text
climat-simf-qa-agent
```

Состояние:

- контейнер живой;
- расписание в runtime стояло `critical`;
- разово запускался `full`;
- отчёты уходят в Telegram и Google Drive;
- были сетевые ошибки Telegram polling `fetch failed`, но bot-процесс живой;
- найденные проблемы сайта: на карточке товара не срабатывает кнопка добавления/покупки, также падают части пользовательского journey.

## Следующий шаг

Продолжить с деплоя `server-guard-bot` после получения:

1. токена нового Telegram-бота;
2. Telegram `user_id`;
3. `chat_id`;
4. подтверждения, что ставим на первый VPS;
5. позже добавить второй и третий серверы в registry.
