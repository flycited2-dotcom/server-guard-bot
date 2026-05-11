# Server Guard Bot

Безопасный Telegram-бот для дежурного управления сервисами на VPS.

## Что уже поддерживается

- Telegram allowlist по `user_id` и `chat_id`.
- TOTP-код для опасных действий: `start`, `restart`, `stop`.
- Только whitelist-действия из `config/services.example.json`.
- Docker Compose, systemd, PM2.
- Audit log в JSONL.
- Никаких свободных shell-команд из Telegram.

## Первый сервер

В стартовый реестр добавлен текущий VPS:

```text
main-vps / 212.116.115.150
- qa-agent: Docker Compose, /root/climat-simf-qa-agent/docker-compose.yml
- parser-admin-bot: systemd, parser_admin_bot.service
- climat-store: PM2, climat-simf-store
```

## Локальная проверка

```bash
npm install
npm run check
```

## Секреты

Создать `.env` из `.env.example`:

```bash
cp .env.example .env
npm run gen:totp-secret
```

В `.env` заполнить:

```text
TELEGRAM_BOT_TOKEN=...
ALLOWED_TELEGRAM_USER_IDS=твой_telegram_user_id
ALLOWED_CHAT_IDS=id_личного_чата_или_группы
TOTP_SECRET_BASE32=секрет_из_gen_totp_secret
USE_SUDO=true
```

`.env` нельзя коммитить в GitHub.

## Безопасность

Бот должен запускаться отдельным пользователем `serverguard`, не от root.

Опасные действия должны идти через узкий `sudoers` whitelist. Шаблон лежит в:

```text
deploy/serverguard.sudoers.example
```

Не добавлять в sudoers:

```text
bash
sh
docker exec
python
node
cat /root/...
любые wildcard-команды шире необходимого
```

## Установка на VPS

Пример:

```bash
useradd --system --create-home --shell /usr/sbin/nologin serverguard
mkdir -p /opt/server-guard-bot
chown -R serverguard:serverguard /opt/server-guard-bot

npm ci
npm run build

install -m 644 deploy/server-guard-bot.service /etc/systemd/system/server-guard-bot.service
systemctl daemon-reload
systemctl enable --now server-guard-bot.service
```

Перед включением на production обязательно настроить `.env` и `/etc/sudoers.d/serverguard`.

## Добавление серверов

Следующие серверы добавляются в registry отдельными блоками. Для первой версии транспорт `local`; SSH-управление вторым/третьим сервером будет добавлено отдельным безопасным слоем после получения IP и ролей.
