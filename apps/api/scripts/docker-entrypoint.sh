#!/bin/sh
set -e

echo "🚀 Starting entrypoint script..."

# Create credentials directory if it doesn't exist
mkdir -p /app/credentials
echo "📁 Created /app/credentials directory"

# Decode Google credentials from base64 if provided
if [ -n "$GOOGLE_CREDENTIALS_JSON_BASE64" ]; then
  echo "🔐 Decoding Google credentials from base64..."
  if echo "$GOOGLE_CREDENTIALS_JSON_BASE64" | base64 -d > /app/credentials/google-credentials.json 2>/dev/null; then
    chmod 600 /app/credentials/google-credentials.json
    echo "✅ Google credentials file created at /app/credentials/google-credentials.json"
    export GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-credentials.json
  else
    echo "❌ Failed to decode GOOGLE_CREDENTIALS_JSON_BASE64. Check if the base64 string is valid."
    exit 1
  fi
else
  echo "⚠️  GOOGLE_CREDENTIALS_JSON_BASE64 not set, skipping credentials file creation"
fi

echo "▶️  Executing command: $@"
# Execute the main command
exec "$@"

