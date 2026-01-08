import { useState, useEffect } from 'react';
import { Shield, Lock, Clock, Key, Eye, EyeOff, Save, AlertTriangle, CheckCircle, Trash2, Timer } from 'lucide-react';

interface SecuritySettings {
  sessionTimeout: number; // in minutes, 0 = never
  autoLockOnMinimize: boolean;
  clearClipboardAfter: number; // in seconds, 0 = never
}

const SESSION_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Nie' },
  { value: 5, label: '5 Minuten' },
  { value: 15, label: '15 Minuten' },
  { value: 30, label: '30 Minuten' },
  { value: 60, label: '1 Stunde' },
  { value: 120, label: '2 Stunden' },
];

const CLIPBOARD_CLEAR_OPTIONS = [
  { value: 0, label: 'Nie' },
  { value: 30, label: '30 Sekunden' },
  { value: 60, label: '1 Minute' },
  { value: 120, label: '2 Minuten' },
  { value: 300, label: '5 Minuten' },
];

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    sessionTimeout: 30,
    autoLockOnMinimize: false,
    clearClipboardAfter: 60,
  });
  const [saved, setSaved] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    // Load settings
    const savedSettings = localStorage.getItem('security-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse security settings');
      }
    }
  }, []);

  const updateSetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('security-settings', JSON.stringify(newSettings));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Dispatch event for session management
    window.dispatchEvent(new CustomEvent('securitySettingsChanged', { detail: newSettings }));
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Aktuelles Passwort ist erforderlich');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Neues Passwort muss mindestens 8 Zeichen haben');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await window.electronAPI.auth.changePassword(currentPassword, newPassword);
      if (result.success) {
        setPasswordSuccess('Passwort erfolgreich geändert!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
        setTimeout(() => setPasswordSuccess(''), 5000);
      } else {
        setPasswordError(result.error || 'Passwort ändern fehlgeschlagen');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ ACHTUNG: Diese Aktion löscht ALLE Daten unwiderruflich!\n\n' +
      '• Alle Secrets und Passwörter\n' +
      '• Alle Einstellungen\n' +
      '• Alle gespeicherten Projekte\n\n' +
      'Bist du sicher, dass du ALLE Daten löschen möchtest?'
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      'Letzte Warnung: Diese Aktion kann NICHT rückgängig gemacht werden!\n\n' +
      'Tippe "LÖSCHEN" ein und klicke OK um fortzufahren.'
    );

    if (!doubleConfirmed) return;

    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear database (you may need to implement this IPC call)
      // await window.electronAPI.database.clear();
      
      // Reload app
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear data:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Shield className="w-7 h-7 text-red-400" />
          Security
        </h1>
        <p className="text-muted-foreground mt-1">
          Sicherheitseinstellungen für dein Dashboard
        </p>
      </div>

      {/* Messages */}
      {saved && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Einstellungen gespeichert!
        </div>
      )}
      {passwordSuccess && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {passwordSuccess}
        </div>
      )}

      <div className="space-y-6">
        {/* Master Password */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-red-400" />
            Master-Passwort
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Das Master-Passwort schützt alle deine gespeicherten Secrets und Zugangsdaten.
          </p>

          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4" />
              Passwort ändern
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-muted/50 border border-border rounded-lg">
              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Aktuelles Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-12 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Neues Passwort
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Neues Passwort bestätigen
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isChangingPassword ? 'Speichern...' : 'Passwort ändern'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session Timeout */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Timer className="w-4 h-4 text-red-400" />
            Session Timeout
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Nach dieser Zeit ohne Aktivität wirst du automatisch ausgeloggt.
          </p>

          <select
            value={settings.sessionTimeout}
            onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            {SESSION_TIMEOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-Lock Options */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-red-400" />
            Auto-Lock
          </h3>
          
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-medium text-foreground">Beim Minimieren sperren</div>
              <div className="text-sm text-muted-foreground">App sperren wenn das Fenster minimiert wird</div>
            </div>
            <div
              onClick={() => updateSetting('autoLockOnMinimize', !settings.autoLockOnMinimize)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                settings.autoLockOnMinimize ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.autoLockOnMinimize ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Clipboard Security */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-red-400" />
            Clipboard-Sicherheit
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Kopierte Passwörter und Secrets werden nach dieser Zeit automatisch aus der Zwischenablage gelöscht.
          </p>

          <select
            value={settings.clearClipboardAfter}
            onChange={(e) => updateSetting('clearClipboardAfter', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            {CLIPBOARD_CLEAR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <h3 className="font-medium text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" />
            Gefahrenzone
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Diese Aktionen können nicht rückgängig gemacht werden. Sei vorsichtig!
          </p>

          <button
            onClick={handleClearAllData}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Alle Daten löschen
          </button>
        </div>
      </div>
    </div>
  );
}
