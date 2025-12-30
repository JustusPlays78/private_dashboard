# Release Helper for Dashboard

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

# Validate version format (e.g., 1.0.0)
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Version must be in format X.Y.Z (e.g., 1.0.0)"
    exit 1
}

$Tag = "v$Version"

Write-Host "Creating release for version: $Version" -ForegroundColor Green
Write-Host "Git tag: $Tag" -ForegroundColor Cyan

# Update version in package.json
Write-Host "`nUpdating package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "frontend/package.json" -Raw | ConvertFrom-Json
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content "frontend/package.json"

# Commit version change
Write-Host "`nCommitting version change..." -ForegroundColor Yellow
git add frontend/package.json
git commit -m "chore: bump version to $Version"

# Create and push tag
Write-Host "`nCreating and pushing tag..." -ForegroundColor Yellow
git tag -a $Tag -m "Release $Version"
git push origin main
git push origin $Tag

Write-Host "`n✅ Release process started!" -ForegroundColor Green
Write-Host "GitHub Actions will now build and create the release." -ForegroundColor Cyan
Write-Host "Check: https://github.com/JustusPlays78/private_dashboard/actions" -ForegroundColor Cyan
