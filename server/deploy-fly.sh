#!/usr/bin/env bash
# One-shot Fly.io deploy for the ClientIQ bot server.
# Run this from the server/ directory after installing flyctl and logging in.
#
#   curl -L https://fly.io/install.sh | sh   # install flyctl
#   fly auth login                           # log into your account
#   ./deploy-fly.sh
#
set -euo pipefail

APP_NAME="${1:-clientiq-bot-$(whoami)}"
REGION="${2:-iad}"

echo "▶ Deploying app: $APP_NAME (region: $REGION)"

# 1. Create the app if it doesn't exist yet.
if ! fly apps list | grep -q "$APP_NAME"; then
  fly apps create "$APP_NAME"
fi

# 2. Point fly.toml at this app name.
sed -i.bak "s/^app = .*/app = \"$APP_NAME\"/" fly.toml && rm -f fly.toml.bak

# 3. Create a persistent volume for recordings (1GB).
if ! fly volumes list -a "$APP_NAME" | grep -q recordings; then
  fly volumes create recordings --size 1 --region "$REGION" -a "$APP_NAME" --yes
fi

# 4. Generate and set the shared secret the app uses to authenticate.
TOKEN="$(openssl rand -hex 24)"
fly secrets set BOT_API_TOKEN="$TOKEN" -a "$APP_NAME"

# 5. Deploy.
fly deploy -a "$APP_NAME"

echo ""
echo "✅ Deployed!"
echo "   Bot server URL:   https://$APP_NAME.fly.dev"
echo "   Bot server token: $TOKEN"
echo ""
echo "Paste both into ClientIQ → Settings → Meeting bot. Keep the token secret."
