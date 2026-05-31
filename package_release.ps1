param(
    [string]$OutFile = "..\ai-interview-system-release.zip"
)

# Create a temporary folder and copy repo files excluding secrets and git metadata
$tmp = Join-Path $env:TEMP "ai_interview_release"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

$excludes = @('.git', '.gitignore', '.env', '.env.local', 'node_modules', '.venv')

Get-ChildItem -Path . -Force | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
    $dest = Join-Path $tmp $_.Name
    if ($_.PSIsContainer) {
        Copy-Item $_.FullName -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Copy-Item $_.FullName -Destination $dest -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $OutFile -Force
Write-Host "Created release archive: $OutFile"
