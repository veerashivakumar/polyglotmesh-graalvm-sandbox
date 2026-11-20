[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$javaHome = 'C:\Program Files\Java\jdk-25'
$repository = Join-Path $env:USERPROFILE '.m2\repository-polyglotmesh'
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
    throw "Java 25 was not found at '$javaHome'. Install or restore that JDK before continuing."
}
if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\javac.exe'))) {
    throw "javac was not found under '$javaHome'; the selected installation is not a complete JDK."
}

$env:JAVA_HOME = $javaHome
$javaBin = Join-Path $javaHome 'bin'
$otherPathEntries = @($env:PATH -split [IO.Path]::PathSeparator | Where-Object {
    $_.TrimEnd('\') -ine $javaBin.TrimEnd('\')
})
$env:PATH = (@($javaBin) + $otherPathEntries) -join [IO.Path]::PathSeparator

if (-not (Get-Command mvn.cmd -ErrorAction SilentlyContinue)) {
    throw 'Maven (mvn.cmd) is not available on PATH. Install Maven 3.9+ and reopen this terminal.'
}

New-Item -ItemType Directory -Path $repository -Force | Out-Null
$probePath = Join-Path $repository ('.polyglotmesh-write-probe-' + [guid]::NewGuid().ToString('N'))
try {
    [IO.File]::WriteAllText($probePath, 'write access verified')
    Remove-Item -LiteralPath $probePath -Force
} catch {
    Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
    throw "Maven repository '$repository' is not writable: $($_.Exception.Message)"
}

# These JVM properties configure Maven's local repository. Preserve existing
# MAVEN_OPTS and place our values last so this project consistently uses its cache.
$repositoryOption = "-Dmaven.repo.local=$repository"
$homeOption = "-Duser.home=$env:USERPROFILE"
$existingMavenOptions = $env:MAVEN_OPTS
$keptMavenOptions = $existingMavenOptions -replace '(?i)(?:^|\s)-D(?:maven\.repo\.local|user\.home)=(?:"[^"]*"|\S+)', ''
$env:MAVEN_OPTS = "$($keptMavenOptions.Trim()) $repositoryOption $homeOption".Trim()

Push-Location $projectRoot
try {
    Write-Host 'Java:' -ForegroundColor Cyan
    $javaVersion = (& $env:ComSpec /d /c 'java -version 2>&1' | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch '25\.0\.') {
        throw "The selected java command did not report Java 25:`n$javaVersion"
    }
    Write-Host $javaVersion

    $javacVersion = (& $env:ComSpec /d /c 'javac -version 2>&1' | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $javacVersion -notmatch '^javac 25\.') {
        throw "The selected javac command did not report Java 25:`n$javacVersion"
    }
    Write-Host $javacVersion

    Write-Host 'Maven:' -ForegroundColor Cyan
    $mavenVersion = (& $env:ComSpec /d /c 'mvn.cmd -version 2>&1' | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $mavenVersion -notmatch 'Java version: 25\.') {
        throw "Maven did not start on Java 25:`n$mavenVersion"
    }
    Write-Host $mavenVersion

    # A real offline project invocation confirms Maven reads the configured
    # repository. Validate is non-mutating apart from normal Maven cache access.
    $backendPom = Join-Path $projectRoot 'backend\pom.xml'
    $mavenCommand = 'mvn.cmd --offline --batch-mode --debug --file "' + $backendPom + '" validate 2>&1'
    $mavenDebug = (& $env:ComSpec /d /c $mavenCommand | Out-String)
    $mavenExitCode = $LASTEXITCODE
    if ($mavenExitCode -ne 0) {
        throw "Maven could not validate the backend project with the selected cache:`n$mavenDebug"
    }
    if ($mavenDebug -notmatch [regex]::Escape($repository)) {
        throw "Maven validation succeeded, but its output did not confirm use of '$repository'."
    }

    Write-Host "Writable Maven repository confirmed: $repository" -ForegroundColor Green
    Write-Host "Maven project validation confirmed use of that repository." -ForegroundColor Green
    Write-Host 'Environment is ready for this PowerShell session. No Windows environment variables were changed permanently.' -ForegroundColor Green
} finally {
    Pop-Location
}
