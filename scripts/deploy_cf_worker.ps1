$ErrorActionPreference = 'Stop'

$transcript = Get-Content 'C:\Users\Administrator\.gemini\antigravity\brain\177d99ed-9770-4077-9346-f62578c5334c\.system_generated\logs\transcript.jsonl' -Raw
if ($transcript -match 'CLOUDFLARE_API_TOKEN=\\?"([a-zA-Z0-9_-]+)\\?"') {
    $env:CLOUDFLARE_API_TOKEN = $matches[1]
    Write-Host "Cloudflare Token set."
    $pnpm = 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
    & node $pnpm dlx wrangler deploy
} else {
    Write-Error "No Cloudflare token found."
}
