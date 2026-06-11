# check-secrets.ps1 — utility to inspect Supabase project secrets and deployed functions
# Usage: $env:SUPABASE_PAT = "***REMOVED***" ; .\check-secrets.ps1
#
# SECURITY: Never hardcode the token here. Use environment variable SUPABASE_PAT.
# To generate a new PAT: https://supabase.com/dashboard/account/tokens

$accessToken = $env:SUPABASE_PAT
if (-not $accessToken) {
    Write-Error "ERROR: SUPABASE_PAT environment variable is not set."
    Write-Host "Set it with: `$env:SUPABASE_PAT = '***REMOVED***'"
    exit 1
}

$projectRef = 'awfoqycoltvhamtrsvxk'

$headers = @{
    'Authorization' = "Bearer $accessToken"
    'Content-Type' = 'application/json'
}

# Check secrets
Write-Host "=== Checking secrets ==="
$resp = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/secrets" -Headers $headers
$resp | ForEach-Object { Write-Host "$($_.name) => $($_.value.Substring(0, [Math]::Min(8, $_.value.Length)))..." }

# Also list deployed functions
Write-Host "`n=== Deployed functions ==="
$funcs = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/functions" -Headers $headers
$funcs | ForEach-Object { Write-Host "$($_.name) — status: $($_.status) — updated: $($_.updated_at)" }
