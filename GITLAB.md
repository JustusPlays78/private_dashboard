# GitLab Integration Guide

Vollständige Anleitung zur GitLab-Integration für Terraform-Projekte.

## 🚀 Features

- ✅ Verbindung zu gitlab.com oder Self-Hosted GitLab
- ✅ Personal Access Token Authentifizierung
- ✅ Projekt-Browsing und Suche
- ✅ Repository Cloning mit Git
- ✅ Pull Latest Changes
- ✅ Terraform-Datei-Erkennung (.tf files)
- ✅ Branch und Commit-Informationen
- ✅ Read-Only (kein In-App Editing)

## 📋 Voraussetzungen

### 1. Git Installation

GitLab-Integration benötigt Git auf deinem System:

**Prüfen ob installiert:**
```powershell
git --version
```

**Download:** https://git-scm.com/downloads

**Nach Installation:** Terminal neu starten

### 2. GitLab Personal Access Token

**Erstellen eines Tokens:**

1. GitLab öffnen (gitlab.com oder deine Self-Hosted Instanz)
2. Profil → Settings → Access Tokens
3. Token Name eingeben (z.B. "Terraform Dashboard")
4. Scopes auswählen:
   - ✅ `api`
   - ✅ `read_api`
   - ✅ `read_repository`
5. Expiration Date setzen (optional)
6. "Create personal access token" klicken
7. Token kopieren (wird nur einmal angezeigt!)

**Token Format:**
- gitlab.com: `glpat-xxxxxxxxxxxxxxxxxxxx`
- Self-Hosted: Variiert je nach Konfiguration

## 🔧 Setup in der App

### Schritt 1: GitLab-Seite öffnen

1. App starten und mit Master-Passwort entsperren
2. Sidebar: "GitLab" klicken
3. Wenn Git nicht installiert: Warnung erscheint mit Download-Link

### Schritt 2: GitLab konfigurieren

**Formular ausfüllen:**

**GitLab URL:**
- Für gitlab.com: `gitlab.com` eingeben
- Für Self-Hosted: `gitlab.example.com` eingeben
- Automatisches HTTPS, wenn nicht angegeben

**Personal Access Token:**
- Token aus Step 2 einfügen
- Wird verschlüsselt in der App gespeichert
- Niemals im Code hardcoden!

**Verbinden:**
- "Connect to GitLab" klicken
- Bei Erfolg: Liste aller zugänglichen Projekte erscheint
- Bei Fehler: Token oder URL prüfen

## 📚 Projekte durchsuchen

### Alle Projekte anzeigen

- Nach erfolgreicher Verbindung werden automatisch alle Projekte geladen
- Es werden nur Projekte angezeigt, zu denen du Zugriff hast

### Projekte suchen

1. Suchfeld nutzen (oben)
2. Projektname oder Namespace eingeben
3. Enter drücken oder "Search" Button klicken
4. Zurück zu allen: Suchfeld leeren und erneut suchen

### Refresh Button

- Projekte neu laden (falls neue hinzugekommen)
- Icon: Refresh-Symbol oben rechts

## 📥 Projekt clonen

### Vorgang

1. Projekt in der Liste finden
2. "Clone" Button klicken
3. App clont das Repository lokal
4. Nach Erfolg: Projekt erscheint in "Cloned Projects"

### Wo werden Projekte gespeichert?

```
%AppData%\TerraformDashboard\gitlab-projects\
```

**Beispiel:**
```
C:\Users\YourName\AppData\Roaming\TerraformDashboard\gitlab-projects\
├── user_project-name\
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── another_project\
    └── ...
```

### Nach dem Clonen

Geclonte Projekte zeigen:
- ✅ Projekt-Name
- ✅ Lokaler Pfad
- ✅ Aktueller Branch
- ✅ Letzter Commit (Hash + Message)
- ✅ Anzahl .tf Dateien

## 🔄 Updates pullen

### Manuelles Update

1. Bei geclonem Projekt: "Pull" Button klicken
2. Lädt neueste Änderungen vom Remote
3. Commit-Info wird aktualisiert

### Automatisches Update

Derzeit nicht implementiert. Projekte müssen manuell aktualisiert werden.

## 📁 Geclonte Projekte nutzen

### Terraform-Dateien ansehen

Geclonte Projekte sind im Dateisystem verfügbar:

```powershell
# Ordner öffnen
explorer %AppData%\TerraformDashboard\gitlab-projects
```

### Mit externen Tools

```powershell
# VS Code öffnen
cd %AppData%\TerraformDashboard\gitlab-projects\project-name
code .

# Terraform Commands
terraform init
terraform plan
terraform apply
```

### ⚠️ Wichtig: Read-Only Konzept

Die App selbst bietet **kein Code-Editing** an!

**Änderungen vornehmen:**
1. Projekt lokal im Editor bearbeiten
2. Änderungen in GitLab committen/pushen
3. In der App: "Pull" klicken für neueste Version

**Warum Read-Only?**
- Fokus auf Deployment, nicht Development
- GitLab bleibt Single Source of Truth
- Keine Merge-Konflikte in der App
- Professioneller Git-Workflow wird gefördert

## 🔐 Sicherheit & Datenschutz

### Token-Speicherung

- Token wird **nicht** in der verschlüsselten Datenbank gespeichert
- Token bleibt nur für die Sitzung im Speicher
- Nach Lock/Neustart: Token muss neu eingegeben werden
- Empfehlung: Token im Passwort-Manager speichern

### Git-Credentials

Bei Clone mit Token:
```
https://oauth2:YOUR_TOKEN@gitlab.com/user/repo.git
```

Token wird temporär in die Clone-URL injiziert, aber nicht in Git-Config gespeichert.

### Lokale Repositories

- Projekte werden lokal im AppData-Ordner gespeichert
- Sind normale Git-Repositories
- Können mit Git-Tools verwendet werden
- Bei App-Deinstallation: Manuell löschen

## 🐛 Troubleshooting

### "Git is not installed"

**Problem:** Git nicht im PATH

**Lösung:**
1. Git installieren: https://git-scm.com/downloads
2. Bei Installation: "Git from command line" wählen
3. Terminal neu starten
4. App neu starten

### "GitLab connection failed"

**Mögliche Ursachen:**

**Falscher Token:**
- Token kopieren (kein Whitespace)
- Scopes prüfen (api, read_api, read_repository)
- Token nicht abgelaufen?

**Falsche URL:**
- gitlab.com ohne https://
- Self-Hosted: Korrekte Domain?
- Firewall/Proxy blockiert?

**Netzwerk:**
- Internet-Verbindung aktiv?
- Corporate Proxy konfiguriert?

### "Failed to clone repository"

**Mögliche Ursachen:**

**Kein Zugriff:**
- Ist das Projekt privat?
- Hat dein Token Zugriff?
- Ist dein GitLab-User Member des Projekts?

**Speicherplatz:**
- Genug Speicherplatz auf C:\?
- AppData-Ordner beschreibbar?

**Git-Fehler:**
- Git-Credentials korrekt?
- SSH vs HTTPS (App nutzt HTTPS)

**Lösung:**
```powershell
# Manuell testen
git clone https://oauth2:YOUR_TOKEN@gitlab.com/user/repo.git

# Bei Erfolg: App-Problem
# Bei Fehler: Git/Token-Problem
```

### "Failed to pull updates"

**Problem:** Pull schlägt fehl

**Mögliche Ursachen:**
- Lokale Änderungen im Projekt
- Merge-Konflikt
- Remote gelöscht/umbenannt

**Lösung:**
```powershell
cd %AppData%\TerraformDashboard\gitlab-projects\project-name

# Status prüfen
git status

# Lokale Änderungen verwerfen
git reset --hard HEAD

# Erneut in App pullen
```

### Projekt bereits geclont

Wenn ein Projekt bereits existiert:
- App versucht automatisch zu pullen
- Kein Error, nur Update
- Bereits geclonte Projekte werden nicht doppelt erstellt

## 📊 API Endpoints (für Entwickler)

### POST /api/gitlab/configure
Konfiguriert GitLab-Verbindung
```json
{
  "base_url": "gitlab.com",
  "token": "glpat-xxxxxxxxxxxx"
}
```

### GET /api/gitlab/projects
Listet alle zugänglichen Projekte

### GET /api/gitlab/projects/search?q=searchterm
Sucht nach Projekten

### GET /api/gitlab/projects/:id
Holt Details zu einem Projekt

### GET /api/gitlab/projects/:id/tree?path=&ref=main
Holt Datei-Baum eines Repositories

### POST /api/gitlab/clone
Clont ein Repository
```json
{
  "project_id": 12345,
  "token": "glpat-xxxxxxxxxxxx"
}
```

### POST /api/gitlab/pull
Pullt neueste Änderungen
```json
{
  "project_path": "C:\\Users\\...\\project-name"
}
```

### GET /api/gitlab/git/check
Prüft Git-Installation

## 🎯 Best Practices

### Token-Management

✅ **Do:**
- Token im Passwort-Manager speichern
- Expiration Date setzen
- Minimal nötige Scopes vergeben
- Regelmäßig rotieren

❌ **Don't:**
- Token in Code committen
- Token per E-Mail teilen
- Alle Scopes aktivieren
- Token ohne Expiration

### Projekt-Workflow

1. **Clonen:** Projekt in App clonen
2. **Entwickeln:** In lokalem Editor (VS Code, etc.)
3. **Committen:** Änderungen in GitLab pushen
4. **Updaten:** In App "Pull" klicken
5. **Deployen:** Terraform in App ausführen (coming soon)

### Ordnerstruktur

Empfohlene GitLab-Repository-Struktur für Terraform:

```
terraform-project/
├── main.tf              # Haupt-Terraform-Config
├── variables.tf         # Variable Definitionen
├── outputs.tf           # Outputs
├── terraform.tfvars     # Variable Werte (in .gitignore!)
├── modules/             # Wiederverwendbare Module
│   ├── vpc/
│   ├── ec2/
│   └── rds/
├── environments/        # Pro Environment
│   ├── dev/
│   ├── staging/
│   └── prod/
└── README.md
```

## 🔮 Geplante Features

- [ ] Auto-Pull bei App-Start
- [ ] Branch-Switching
- [ ] Tag/Release-Auswahl
- [ ] Direktes Terraform Execute aus geclonem Projekt
- [ ] Projekt-Status-Dashboard
- [ ] GitLab CI/CD Integration
- [ ] Webhook-Support für Auto-Updates
- [ ] Multi-Repository Management
- [ ] Favorites/Bookmarks

## 📞 Support

Bei Problemen:
1. Logs prüfen: `%AppData%\TerraformDashboard\logs\`
2. Git-Version prüfen: `git --version` (mind. 2.x)
3. Token-Scopes verifizieren
4. Netzwerk-Connectivity testen

## 🔗 Weiterführende Links

- [GitLab API Docs](https://docs.gitlab.com/ee/api/)
- [Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- [Git Dokumentation](https://git-scm.com/doc)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/)
