# Deploy the existing Cloudflare Worker using an explicitly supplied token.
# Never extract credentials from Antigravity transcripts, shell history, or project files.
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)) {
    throw 'CLOUDFLARE_API_TOKEN is required. Supply it via a secure environment/credential provider before deployment.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    npx.cmd wrangler deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Wrangler deploy failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
