$url = 'https://cinctbslvejqicxanvnr.supabase.co/functions/v1/decompose-task'
$anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmN0YnNsdmVqcWljeGFudm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjkzNTYsImV4cCI6MjA4ODYwNTM1Nn0.QWSu9zWLk4VgUYp-I2QBd1MbAXforqY1vMtgcAiv2FQ'
$body = '{"taskTitle":"Test task"}'
$headers = @{
    'Authorization' = "Bearer $anonKey"
    'Content-Type' = 'application/json'
}
try {
    $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    Write-Host "HTTP Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response body: $body"
        Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)"
    }
}
