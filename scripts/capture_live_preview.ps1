$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$base = 'https://f1.tike69.cc.cd'
$proxy = '--proxy-server=http://127.0.0.1:7890'

$tasks = @(
    @{ name = 'preview_desktop_home.png'; url = "$base/"; size = '--window-size=1440,1100' },
    @{ name = 'preview_desktop_system.png'; url = "$base/system"; size = '--window-size=1440,1200' },
    @{ name = 'preview_desktop_standings.png'; url = "$base/standings"; size = '--window-size=1440,1100' },
    @{ name = 'preview_desktop_ai.png'; url = "$base/ai"; size = '--window-size=1440,1000' },
    @{ name = 'prod_desktop_hash_ai.png'; url = "$base/#ai"; size = '--window-size=1440,1100' },
    @{ name = 'preview_mobile_home.png'; url = "$base/"; size = '--window-size=390,844' },
    @{ name = 'preview_mobile_system.png'; url = "$base/system"; size = '--window-size=390,844' }
)

foreach ($t in $tasks) {
    Write-Host "Capturing $($t.name)..."
    $shotPath = Join-Path (Get-Location) $t.name
    $argList = @(
        '--headless=new',
        '--disable-gpu',
        $proxy,
        '--virtual-time-budget=5000',
        $t.size,
        "--screenshot=$shotPath",
        $t.url
    )
    $proc = Start-Process -FilePath $chrome -ArgumentList $argList -Wait -PassThru -NoNewWindow
    Write-Host "$($t.name) captured (Exit code: $($proc.ExitCode))"
}
Write-Host "All live screenshots completed."
