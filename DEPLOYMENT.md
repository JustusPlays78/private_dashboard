# Deployment Guide

Anleitung zur Verteilung und Installation der Terraform Dashboard Desktop-App.

## 📦 Deployment-Optionen

### Option 1: NSIS Installer (Empfohlen)

**Datei:** `Terraform Dashboard-1.0.0-x64.exe` (~100 MB)

**Vorteile:**
- Professionelle Installation mit Setup-Wizard
- Automatische Shortcuts (Desktop + Startmenü)
- Saubere Deinstallation möglich
- Versionsverwaltung über Windows Registry

**Verteilung:**
1. Installer an Nutzer senden (E-Mail, File-Share, etc.)
2. Nutzer führt .exe aus
3. Installationspfad wählen
4. App wird installiert

**Installation für Endnutzer:**
```
1. Installer-Datei herunterladen
2. Doppelklick auf "Terraform Dashboard-1.0.0-x64.exe"
3. "Next" klicken
4. Installationspfad bestätigen (Standard: C:\Program Files\Terraform Dashboard)
5. "Install" klicken
6. Nach Installation: App über Desktop-Icon oder Startmenü starten
```

### Option 2: Portable Version

**Quelle:** `win-unpacked/` Ordner als ZIP

**Vorteile:**
- Keine Installation erforderlich
- Kann von USB-Stick gestartet werden
- Keine Admin-Rechte nötig
- Mehrere Versionen parallel möglich

**Verteilung:**
```powershell
# 1. Portable ZIP erstellen
cd frontend/release
Compress-Archive -Path win-unpacked -DestinationPath "Terraform-Dashboard-1.0.0-Portable.zip"

# 2. ZIP an Nutzer verteilen
```

**Nutzung für Endnutzer:**
```
1. ZIP-Datei entpacken
2. Ordner "win-unpacked" öffnen
3. "Terraform Dashboard.exe" doppelklicken
4. App startet ohne Installation
```

## 🔐 Erste Inbetriebnahme

### Schritt 1: App starten

Nach der Installation/Entpackung:
```
1. App-Icon doppelklicken
2. App startet und zeigt Unlock-Screen
3. "Initialize Database" Button erscheint (nur beim ersten Start)
```

### Schritt 2: Master-Passwort einrichten

```
1. Auf "Initialize Database" klicken
2. Sicheres Master-Passwort eingeben
3. Passwort bestätigen
4. "Initialize" klicken
5. Datenbank wird erstellt und verschlüsselt
```

**Passwort-Anforderungen:**
- Mindestens 8 Zeichen
- Keine Wiederherstellung möglich bei Verlust!
- Passwort wird mit Argon2id + AES-256-GCM verschlüsselt

### Schritt 3: App nutzen

```
1. Dashboard öffnet sich automatisch
2. Sidebar zeigt Navigation (Dashboard, Terraform, Settings)
3. Nach 30 Minuten Inaktivität: Automatische Sperre
4. Manuell sperren: Lock-Button in der Sidebar
```

## 📂 Datenspeicherung

### Datenbank-Pfad

```
%AppData%\Roaming\TerraformDashboard\terraform.db
```

**Voller Pfad (Beispiel):**
```
C:\Users\z003h6nh\AppData\Roaming\TerraformDashboard\terraform.db
```

### Backup erstellen

```powershell
# Datenbank sichern
Copy-Item "$env:APPDATA\TerraformDashboard\terraform.db" -Destination "C:\Backups\terraform-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

### Restore durchführen

```powershell
# App schließen, dann:
Copy-Item "C:\Backups\terraform-backup-2025-11-06.db" -Destination "$env:APPDATA\TerraformDashboard\terraform.db" -Force
```

## 🔄 Update-Prozess

### Neue Version installieren (NSIS)

1. **Aktuelle Daten sichern** (optional):
   ```powershell
   Copy-Item "$env:APPDATA\TerraformDashboard" -Destination "C:\Backups\TerraformDashboard-Backup" -Recurse
   ```

2. **App schließen** (wichtig!)

3. **Neue Installer-Version ausführen**:
   - Alte Version wird automatisch deinstalliert
   - Neue Version wird installiert
   - Datenbank bleibt erhalten

4. **App neu starten**:
   - Master-Passwort eingeben
   - Daten sind wieder verfügbar

### Neue Version installieren (Portable)

1. **App schließen**

2. **Alte Version umbenennen**:
   ```powershell
   Rename-Item "win-unpacked" -NewName "win-unpacked-old"
   ```

3. **Neue Version entpacken**:
   - ZIP-Datei entpacken
   - Neuer `win-unpacked` Ordner

4. **Datenbank ist unverändert** (liegt in AppData)

5. **Neue Version testen**:
   - Bei Erfolg: Alte Version löschen
   - Bei Problem: Alte Version wiederherstellen

## 🌐 Netzwerk & Firewall

### Ports

**Backend (intern):**
- Port: `8080`
- Binding: `localhost` (127.0.0.1)
- Extern nicht erreichbar

**Kein Firewall-Setup nötig:**
- App kommuniziert nur intern (Electron ↔ Go Backend)
- Keine eingehenden Verbindungen von außen

### Proxy-Umgebungen

Falls hinter Corporate Proxy:
```powershell
# Git-Proxy für GitLab-Integration
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy https://proxy.example.com:8080
```

## 🔒 Sicherheitshinweise

### Für Endnutzer

1. **Master-Passwort sicher aufbewahren**
   - Keine Wiederherstellung möglich
   - Bei Verlust: Datenbank unbrauchbar
   - Empfehlung: Passwort-Manager nutzen

2. **Auto-Lock beachten**
   - Nach 30 Minuten ohne Aktivität
   - Schützt vor unbefugtem Zugriff
   - Manuelles Sperren jederzeit möglich

3. **Datenbank-Backups**
   - Regelmäßig Backups erstellen
   - Backups verschlüsselt aufbewahren
   - Restore-Prozess testen

### Für Administratoren

1. **Code-Signing (optional)**
   - Installer ist nicht signiert (Standard)
   - Windows SmartScreen-Warnung möglich
   - Für Enterprise: Eigenes Zertifikat nutzen

2. **Zentrale Verteilung**
   - NSIS Installer über Software-Deployment-Tools
   - Beispiel: Microsoft SCCM, Intune
   - Silent Installation: `/S` Parameter

3. **GPO Deployment (optional)**
   ```
   Computer Configuration
   → Policies
   → Software Settings
   → Software Installation
   → Neue Paket hinzufügen
   ```

## 📊 Monitoring & Logs

### App-Logs

**Electron Logs:**
```
%AppData%\Roaming\TerraformDashboard\logs\
```

**Backend-Logs:**
- Derzeit: Console-Output
- Für Production: Logging in Datei implementieren

### Fehlersuche

**App startet nicht:**
```powershell
# 1. Prozesse prüfen
Get-Process | Where-Object {$_.ProcessName -like "*Terraform*"}

# 2. Alte Prozesse killen
Get-Process | Where-Object {$_.ProcessName -like "*Terraform*"} | Stop-Process -Force

# 3. Datenbank-Pfad prüfen
Test-Path "$env:APPDATA\TerraformDashboard\terraform.db"
```

**Backend startet nicht:**
- Port 8080 bereits belegt?
- Datenbank-Datei korrupt?
- Berechtigungen fehlen?

**UI lädt nicht:**
- Frontend-Ressourcen fehlen?
- Console-Logs prüfen (F12 in Electron)

## 🚀 Enterprise Deployment

### Silent Installation

```powershell
# NSIS Installer im Silent Mode
Start-Process "Terraform Dashboard-1.0.0-x64.exe" -ArgumentList "/S" -Wait

# Installation in Custom-Pfad
Start-Process "Terraform Dashboard-1.0.0-x64.exe" -ArgumentList "/S /D=C:\Tools\TerraformDashboard" -Wait
```

### Pre-Configuration

**Master-Passwort vorsetzen (nicht empfohlen!):**
Aus Sicherheitsgründen sollte jeder Nutzer sein eigenes Passwort setzen.

**Shared Database (nicht unterstützt):**
Jeder Nutzer hat seine eigene lokale Datenbank.

### Unattended Installation

```powershell
# Installation-Script für IT-Abteilung
$installerPath = "\\fileserver\software\Terraform-Dashboard\Terraform Dashboard-1.0.0-x64.exe"

# Check if already installed
$installed = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
             Where-Object { $_.DisplayName -like "Terraform Dashboard*" }

if (-not $installed) {
    Write-Host "Installing Terraform Dashboard..."
    Start-Process $installerPath -ArgumentList "/S" -Wait
    Write-Host "Installation complete!"
} else {
    Write-Host "Terraform Dashboard already installed (Version: $($installed.DisplayVersion))"
}
```

## 🔧 Deinstallation

### NSIS Installer

**Über Systemsteuerung:**
```
1. Systemsteuerung → Programme und Features
2. "Terraform Dashboard" suchen
3. Rechtsklick → Deinstallieren
4. Uninstaller folgen
```

**Über PowerShell:**
```powershell
# Uninstaller finden und ausführen
$uninstaller = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
               Where-Object { $_.DisplayName -eq "Terraform Dashboard" } | 
               Select-Object -ExpandProperty UninstallString

if ($uninstaller) {
    Start-Process $uninstaller -ArgumentList "/S" -Wait
}
```

**Datenbank behalten oder löschen:**
```powershell
# Nur löschen wenn gewünscht!
Remove-Item "$env:APPDATA\TerraformDashboard" -Recurse -Force
```

### Portable Version

```powershell
# Einfach Ordner löschen
Remove-Item "win-unpacked" -Recurse -Force

# Optional: Datenbank auch löschen
Remove-Item "$env:APPDATA\TerraformDashboard" -Recurse -Force
```

## 📋 Checkliste für Rollout

**Pre-Deployment:**
- [ ] Installer/ZIP-Datei bereitstellen
- [ ] Dokumentation an Nutzer verteilen
- [ ] Support-Kontakt kommunizieren
- [ ] Testinstallation durchführen

**Deployment:**
- [ ] Installer an Nutzer verteilen (E-Mail/File-Share)
- [ ] Installation-Guide bereitstellen
- [ ] Erste Hilfe bei Problemen

**Post-Deployment:**
- [ ] Feedback sammeln
- [ ] Häufige Probleme dokumentieren
- [ ] FAQ erstellen
- [ ] Update-Strategie definieren

## 🆘 Support-Szenarien

### "Ich habe mein Master-Passwort vergessen"

**Antwort:**
```
Leider gibt es keine Möglichkeit, das Master-Passwort wiederherzustellen.
Die Datenbank ist mit AES-256-GCM verschlüsselt.

Lösung:
1. App schließen
2. Datenbank löschen: %AppData%\TerraformDashboard\terraform.db
3. App neu starten
4. Neues Master-Passwort setzen
5. Alle Daten neu eingeben

⚠️ Alle bisherigen Daten gehen verloren!
```

### "Die App sperrt sich zu oft"

**Antwort:**
```
Die Auto-Lock-Zeit beträgt 30 Minuten.
Dies ist eine Sicherheitsfunktion.

Wenn Sie länger arbeiten:
- Bewegen Sie regelmäßig die Maus
- Tippen Sie etwas in der App
- Oder: Entwickler kann Timeout anpassen (siehe BUILD.md)
```

### "Windows Defender blockiert die App"

**Antwort:**
```
Der Installer ist nicht Code-signiert, daher zeigt Windows SmartScreen eine Warnung.

Lösung:
1. Bei SmartScreen-Warnung: "Weitere Informationen" klicken
2. "Trotzdem ausführen" wählen
3. Installation fortsetzen

Für Unternehmen:
- Eigenes Code-Signing-Zertifikat nutzen
- App zur Whitelist hinzufügen
```

## 📞 Kontakt & Support

Bei Problemen oder Fragen:
- **Entwickler:** [Dein Name/Team]
- **E-Mail:** [support@example.com]
- **Issue Tracker:** [GitHub/GitLab URL]
