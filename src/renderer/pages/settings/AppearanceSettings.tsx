import { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Monitor, Type, Sidebar, Check, Sparkles } from 'lucide-react';

type Theme = 'dark' | 'light' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan';

interface AppearanceSettings {
  theme: Theme;
  fontSize: FontSize;
  accentColor: AccentColor;
  compactSidebar: boolean;
  showClock: boolean;
}

const ACCENT_COLORS: { id: AccentColor; name: string; color: string; bgClass: string }[] = [
  { id: 'blue', name: 'Blau', color: '#3b82f6', bgClass: 'bg-blue-500' },
  { id: 'purple', name: 'Lila', color: '#8b5cf6', bgClass: 'bg-purple-500' },
  { id: 'green', name: 'Grün', color: '#22c55e', bgClass: 'bg-green-500' },
  { id: 'orange', name: 'Orange', color: '#f97316', bgClass: 'bg-orange-500' },
  { id: 'pink', name: 'Pink', color: '#ec4899', bgClass: 'bg-pink-500' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4', bgClass: 'bg-cyan-500' },
];

const FONT_SIZES: { id: FontSize; name: string; scale: string }[] = [
  { id: 'small', name: 'Klein', scale: '14px' },
  { id: 'medium', name: 'Normal', scale: '16px' },
  { id: 'large', name: 'Groß', scale: '18px' },
];

const THEMES: { id: Theme; name: string; icon: any; description: string }[] = [
  { id: 'dark', name: 'Dark', icon: Moon, description: 'Dunkles Theme für die Augen' },
  { id: 'light', name: 'Light', icon: Sun, description: 'Helles Theme für gute Beleuchtung' },
  { id: 'system', name: 'System', icon: Monitor, description: 'Folgt deinen System-Einstellungen' },
];

export default function AppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    fontSize: 'medium',
    accentColor: 'blue',
    compactSidebar: false,
    showClock: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appearance-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse appearance settings');
      }
    }
  }, []);

  const updateSetting = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('appearance-settings', JSON.stringify(newSettings));
    
    // Apply changes immediately
    applySettings(newSettings);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const applySettings = (s: AppearanceSettings) => {
    // Apply accent color as CSS variable
    document.documentElement.style.setProperty('--accent-color', 
      ACCENT_COLORS.find(c => c.id === s.accentColor)?.color || '#3b82f6'
    );

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('appearanceChanged', { detail: s }));
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Palette className="w-7 h-7 text-purple-400" />
          Appearance
        </h1>
        <p className="text-muted-foreground mt-1">
          Passe das Aussehen deines Dashboards an
        </p>
      </div>

      {/* Saved Indicator */}
      {saved && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Einstellungen gespeichert!
        </div>
      )}

      <div className="space-y-6">
        {/* Theme Selection */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Theme
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('theme', theme.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  settings.theme === theme.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-muted/50'
                }`}
              >
                <theme.icon className={`w-6 h-6 mb-2 ${settings.theme === theme.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium text-foreground">{theme.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{theme.description}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Light-Mode ist noch in Entwicklung. Aktuell wird nur Dark-Mode unterstützt.
          </p>
        </div>

        {/* Accent Color */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-purple-400" />
            Akzentfarbe
          </h3>
          <div className="flex gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => updateSetting('accentColor', color.id)}
                className={`relative w-10 h-10 rounded-full ${color.bgClass} transition-transform hover:scale-110 ${
                  settings.accentColor === color.id ? 'ring-2 ring-offset-2 ring-offset-card ring-white' : ''
                }`}
                title={color.name}
              >
                {settings.accentColor === color.id && (
                  <Check className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Wähle eine Farbe für Buttons, Links und Highlights
          </p>
        </div>

        {/* Font Size */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-purple-400" />
            Schriftgröße
          </h3>
          <div className="flex gap-3">
            {FONT_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => updateSetting('fontSize', size.id)}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  settings.fontSize === size.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="font-medium">{size.name}</div>
                <div className="text-xs opacity-75">{size.scale}</div>
              </button>
            ))}
          </div>
        </div>

        {/* UI Options */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Sidebar className="w-4 h-4 text-purple-400" />
            UI-Optionen
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-foreground">Kompakte Sidebar</div>
                <div className="text-sm text-muted-foreground">Zeigt nur Icons in der Sidebar</div>
              </div>
              <div
                onClick={() => updateSetting('compactSidebar', !settings.compactSidebar)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.compactSidebar ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.compactSidebar ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-foreground">Uhr im Dashboard</div>
                <div className="text-sm text-muted-foreground">Zeigt die aktuelle Uhrzeit auf der Startseite</div>
              </div>
              <div
                onClick={() => updateSetting('showClock', !settings.showClock)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.showClock ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.showClock ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-sm text-purple-400">
          💡 <strong>Hinweis:</strong> Einige Einstellungen werden erst nach einem Neustart der App vollständig übernommen.
        </p>
      </div>
    </div>
  );
}
