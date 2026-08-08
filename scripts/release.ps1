[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,

    [string]$SigningKeyPath = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.tauri\nexthive.key'),

    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$repositoryOwner = 'voilabs'
$repositoryName = 'nexthive'
$tagName = "v$Version"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$desktopRoot = Join-Path $repoRoot 'apps\desktop'
$previousSigningKey = $env:TAURI_SIGNING_PRIVATE_KEY
$previousSigningPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
$githubToken = $null
$temporaryPassword = $null

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $Command $($Arguments -join ' ')"
    }
}

function Get-NpmCommand {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -ne $npm) {
        return $npm.Source
    }

    $fallback = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\nodejs\npm.cmd'
    if (Test-Path -LiteralPath $fallback -PathType Leaf) {
        return $fallback
    }

    throw 'npm was not found. Install Node.js or add npm to PATH before publishing.'
}

function Get-GitHubToken {
    $credentialRequest = "protocol=https`nhost=github.com`n`n"
    $credentialResult = $credentialRequest | git credential fill
    if ($LASTEXITCODE -ne 0) {
        throw 'Git credential manager could not provide GitHub credentials.'
    }

    $passwordLine = $credentialResult |
        Where-Object { $_ -like 'password=*' } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($passwordLine)) {
        throw 'No GitHub credential was found. Sign in to GitHub through Git Credential Manager and try again.'
    }

    return $passwordLine.Substring('password='.Length)
}

function Get-ChangelogNotes {
    param([string]$ReleaseVersion)

    $changelog = Get-Content (Join-Path $repoRoot 'CHANGELOG.md') -Raw
    $escapedVersion = [regex]::Escape($ReleaseVersion)
    $match = [regex]::Match(
        $changelog,
        "(?ms)^## \[$escapedVersion\][^`r`n]*`r?`n(?<notes>.*?)(?=^## \[|\z)"
    )

    if (-not $match.Success) {
        throw "CHANGELOG.md does not contain a section for $ReleaseVersion."
    }

    return $match.Groups['notes'].Value.Trim()
}

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('Get', 'Post')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [object]$Body
    )

    $headers = @{
        Authorization = "Bearer $githubToken"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent' = 'NextHive-local-release'
    }

    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
    }

    $jsonBody = $Body | ConvertTo-Json -Depth 8
    $utf8Body = [Text.UTF8Encoding]::new($false).GetBytes($jsonBody)
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $utf8Body
}

function Publish-ReleaseAsset {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Release,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$ContentType
    )

    $file = Get-Item -LiteralPath $Path
    $existingAsset = $Release.assets |
        Where-Object { $_.name -eq $file.Name } |
        Select-Object -First 1

    if ($null -ne $existingAsset) {
        if ([int64]$existingAsset.size -eq $file.Length) {
            Write-Host "Already uploaded: $($file.Name)"
            return
        }

        throw "Release asset '$($file.Name)' already exists with a different size. Remove it manually before retrying."
    }

    $uploadBaseUrl = $Release.upload_url -replace '\{\?name,label\}$', ''
    $encodedName = [Uri]::EscapeDataString($file.Name)
    $headers = @{
        Authorization = "Bearer $githubToken"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent' = 'NextHive-local-release'
    }

    $uploadParameters = @{
        Method = 'Post'
        Uri = "${uploadBaseUrl}?name=$encodedName"
        Headers = $headers
        ContentType = $ContentType
        InFile = $file.FullName
    }
    Invoke-RestMethod @uploadParameters | Out-Null

    Write-Host "Uploaded: $($file.Name)"
}

Push-Location $repoRoot
try {
    $branch = (git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') {
        throw "Releases must be published from the main branch. Current branch: '$branch'."
    }

    if (-not [string]::IsNullOrWhiteSpace((git status --porcelain))) {
        throw 'The working tree is not clean. Commit or stash changes before publishing a release.'
    }

    $packageVersion = (Get-Content (Join-Path $desktopRoot 'package.json') -Raw | ConvertFrom-Json).version
    $packageLock = Get-Content (Join-Path $desktopRoot 'package-lock.json') -Raw
    $packageLockMatch = [regex]::Match($packageLock, '(?m)^\s*"version"\s*:\s*"([^"]+)"')
    $tauriVersion = (Get-Content (Join-Path $desktopRoot 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json).version
    $cargoManifest = Get-Content (Join-Path $desktopRoot 'src-tauri\Cargo.toml') -Raw
    $cargoMatch = [regex]::Match($cargoManifest, '(?ms)^\[package\]\s*.*?^version\s*=\s*"([^"]+)"')

    if (-not $packageLockMatch.Success -or -not $cargoMatch.Success) {
        throw 'Could not read the application version from package-lock.json or Cargo.toml.'
    }

    $versions = @(
        $packageVersion,
        $packageLockMatch.Groups[1].Value,
        $tauriVersion,
        $cargoMatch.Groups[1].Value
    )

    if ($versions | Where-Object { $_ -ne $Version }) {
        throw "Version mismatch. apps/desktop package.json, package-lock.json, Cargo.toml and tauri.conf.json must all be $Version."
    }

    if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
        throw "Updater signing key was not found at '$SigningKeyPath'."
    }

    Invoke-CheckedCommand -Command git -Arguments @('fetch', 'origin', 'main', '--tags')
    $headCommit = (git rev-parse HEAD).Trim()
    $remoteCommit = (git rev-parse origin/main).Trim()
    if ($headCommit -ne $remoteCommit) {
        throw 'Local main must exactly match origin/main before publishing.'
    }

    git show-ref --verify --quiet "refs/tags/$tagName"
    $tagLookupExitCode = $LASTEXITCODE
    if ($tagLookupExitCode -eq 0) {
        $existingTagCommit = git rev-list -n 1 $tagName
        if ($existingTagCommit.Trim() -ne $headCommit) {
            throw "Tag $tagName already points to a different commit."
        }
    }
    elseif ($tagLookupExitCode -eq 1) {
        $existingTagCommit = $null
    }
    else {
        throw "Could not inspect the local tag $tagName."
    }

    $releaseNotes = Get-ChangelogNotes -ReleaseVersion $Version

    if (-not $SkipBuild) {
        $npmCommand = Get-NpmCommand
        $env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path -LiteralPath $SigningKeyPath).Path

        if ([string]::IsNullOrEmpty($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD)) {
            Write-Host 'Enter the updater signing-key password, or press Enter if the key has no password.'
            $securePassword = Read-Host -AsSecureString
            $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
            try {
                $temporaryPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
                $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $temporaryPassword
            }
            finally {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
            }
        }

        Push-Location $desktopRoot
        try {
            Invoke-CheckedCommand -Command $npmCommand -Arguments @('ci')
            Invoke-CheckedCommand -Command $npmCommand -Arguments @('run', 'build')
            Invoke-CheckedCommand -Command cargo -Arguments @('test', '--manifest-path', 'src-tauri/Cargo.toml')
            Invoke-CheckedCommand -Command $npmCommand -Arguments @('run', 'tauri', 'build', '--', '--bundles', 'nsis')
        }
        finally {
            Pop-Location
        }
    }

    $bundleDirectory = Join-Path $desktopRoot 'src-tauri\target\release\bundle\nsis'
    $installerName = "NextHive_${Version}_x64-setup.exe"
    $installerPath = Join-Path $bundleDirectory $installerName
    $signaturePath = "$installerPath.sig"

    if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
        throw "Installer not found: $installerPath"
    }

    if (-not (Test-Path -LiteralPath $signaturePath -PathType Leaf)) {
        throw "Updater signature not found: $signaturePath"
    }

    $signature = (Get-Content -LiteralPath $signaturePath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($signature)) {
        throw 'The updater signature file is empty.'
    }

    $assetBaseUrl = "https://github.com/$repositoryOwner/$repositoryName/releases/download/$tagName"
    $platform = @{
        signature = $signature
        url = "$assetBaseUrl/$installerName"
    }
    $manifest = [ordered]@{
        version = $Version
        notes = $releaseNotes
        pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        platforms = [ordered]@{
            'windows-x86_64-nsis' = $platform
            'windows-x86_64' = $platform
        }
    }

    $releaseDirectory = Join-Path ([IO.Path]::GetTempPath()) "nexthive-release-$Version"
    [IO.Directory]::CreateDirectory($releaseDirectory) | Out-Null
    $manifestPath = Join-Path $releaseDirectory 'latest.json'
    $manifestJson = $manifest | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText($manifestPath, $manifestJson, [Text.UTF8Encoding]::new($false))

    if ([string]::IsNullOrWhiteSpace($existingTagCommit)) {
        Invoke-CheckedCommand -Command git -Arguments @('tag', '-a', $tagName, '-m', "NextHive $tagName")
    }

    Invoke-CheckedCommand -Command git -Arguments @('push', 'origin', "refs/tags/$tagName")

    $githubToken = Get-GitHubToken
    $apiBaseUrl = "https://api.github.com/repos/$repositoryOwner/$repositoryName"
    try {
        $release = Invoke-GitHubApi -Method Get -Uri "$apiBaseUrl/releases/tags/$tagName"
    }
    catch {
        $statusCode = 0
        if ($null -ne $_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($statusCode -ne 404) {
            throw
        }

        $release = Invoke-GitHubApi -Method Post -Uri "$apiBaseUrl/releases" -Body @{
            tag_name = $tagName
            target_commitish = 'main'
            name = "NextHive $tagName"
            body = $releaseNotes
            draft = $false
            prerelease = $false
            make_latest = 'true'
        }
    }

    Publish-ReleaseAsset -Release $release -Path $installerPath -ContentType 'application/vnd.microsoft.portable-executable'
    Publish-ReleaseAsset -Release $release -Path $signaturePath -ContentType 'text/plain'
    Publish-ReleaseAsset -Release $release -Path $manifestPath -ContentType 'application/json'

    Write-Host "Release published: $($release.html_url)"
}
finally {
    $env:TAURI_SIGNING_PRIVATE_KEY = $previousSigningKey
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $previousSigningPassword
    $temporaryPassword = $null
    $githubToken = $null
    Pop-Location
}
