$Port = 3000
$Root = $PSScriptRoot
$LogFile = Join-Path $Root "logs"

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Calculadora rodando em http://localhost:$Port"
Write-Host "Logs salvos em: $LogFile"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  try {
    if ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/api/log") {
      $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
      $body = $reader.ReadToEnd()
      $reader.Close()

      $data = $body | ConvertFrom-Json
      if ($null -eq $data.entry -or $data.entry -eq "") {
        $response.StatusCode = 400
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false}')
      } else {
        Add-Content -Path $LogFile -Value $data.entry -Encoding UTF8
        $response.StatusCode = 200
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
      }
    } else {
      $relativePath = $request.Url.AbsolutePath
      if ($relativePath -eq "/") { $relativePath = "/index.html" }

      $filePath = Join-Path $Root ($relativePath.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar)

      if (-not $filePath.StartsWith($Root)) {
        $response.StatusCode = 403
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
      } elseif (-not (Test-Path $filePath)) {
        $response.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
      } else {
        $ext = [IO.Path]::GetExtension($filePath)
        $contentType = $MimeTypes[$ext]
        if ($contentType) { $response.ContentType = $contentType }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.StatusCode = 200
      }
    }
  } catch {
    $response.StatusCode = 500
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
  }

  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}
