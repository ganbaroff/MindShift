$apiKey = 'AIzaSyA-2eTA9jCsWalZ_DVBeA5NagV-gEQOJ_Q'
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey"
$body = @{
    contents = @(
        @{
            parts = @(
                @{ text = 'Reply with just: {"ok":true}' }
            )
        }
    )
    generationConfig = @{
        maxOutputTokens = 50
        temperature = 0.1
    }
} | ConvertTo-Json -Depth 5

try {
    $resp = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
        Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
    }
}
