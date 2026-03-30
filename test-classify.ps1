$url = 'https://awfoqycoltvhamtrsvxk.supabase.co/functions/v1/classify-voice-input'
$anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmN0YnNsdmVqcWljeGFudm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjkzNTYsImV4cCI6MjA4ODYwNTM1Nn0.QWSu9zWLk4VgUYp-I2QBd1MbAXforqY1vMtgcAiv2FQ'
$bodyJson = '{"text":"buy milk on the way home","language":"en"}'

$wc = New-Object System.Net.WebClient
$wc.Headers.Add('Content-Type', 'application/json')
$wc.Headers.Add('Authorization', "Bearer $anonKey")
try {
    $result = $wc.UploadString($url, 'POST', $bodyJson)
    Write-Host "SUCCESS: $result"
} catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "HTTP $([int]$resp.StatusCode): $body"
}
