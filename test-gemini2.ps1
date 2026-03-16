$apiKey = 'AIzaSyA-2eTA9jCsWalZ_DVBeA5NagV-gEQOJ_Q'
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey"
$bodyJson = '{"contents":[{"parts":[{"text":"Reply with only: {\"ok\":true}"}]}],"generationConfig":{"maxOutputTokens":50}}'

$wc = New-Object System.Net.WebClient
$wc.Headers.Add('Content-Type', 'application/json')
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
