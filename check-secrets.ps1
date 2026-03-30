$accessToken = 'sbp_463784e58f49e7aff39ec2570ca66e50d365d0c1'
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
