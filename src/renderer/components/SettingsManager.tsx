import React, { useState, useEffect } from "react";
import { User, Settings, Save, RotateCcw } from "lucide-react";

interface UserSettings {
  firstName: string;
  lastName: string;
  username: string;
  appTitle: string;
}

const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    firstName: "",
    lastName: "",
    username: "",
    appTitle: "Private Dashboard",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("dashboard-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("dashboard-settings", JSON.stringify(settings));

      // Dispatch custom event to notify App component
      window.dispatchEvent(new CustomEvent("settingsUpdated"));

      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    const defaultSettings: UserSettings = {
      firstName: "",
      lastName: "",
      username: "",
      appTitle: "Private Dashboard",
    };
    setSettings(defaultSettings);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const getDisplayName = () => {
    if (settings.firstName && settings.lastName) {
      return `${settings.firstName} ${settings.lastName}`;
    }
    if (settings.username) {
      return settings.username;
    }
    return "User";
  };

  const getAppTitle = () => {
    if (settings.username) {
      return `${settings.username} Dashboard`;
    }
    return settings.appTitle;
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your personal information and application preferences.
        </p>
      </div>

      <div className="max-w-2xl">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/20 p-6 mb-8">
          <div className="flex items-center mb-6">
            <User className="h-6 w-6 text-dashboard-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              General Settings
            </h2>
          </div>

          <div className="space-y-6">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={settings.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dashboard-500 focus:border-dashboard-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={settings.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dashboard-500 focus:border-dashboard-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your last name"
              />
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={settings.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dashboard-500 focus:border-dashboard-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your username"
              />
            </div>

            {/* App Title */}
            <div>
              <label
                htmlFor="appTitle"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Application Title
              </label>
              <input
                type="text"
                id="appTitle"
                value={settings.appTitle}
                onChange={(e) => handleInputChange("appTitle", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dashboard-500 focus:border-dashboard-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter application title"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preview
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Display Name:{" "}
              </span>
              <span className="text-gray-900 dark:text-white">
                {getDisplayName()}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                App Title:{" "}
              </span>
              <span className="text-gray-900 dark:text-white">
                {getAppTitle()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>

          <div className="flex items-center space-x-4">
            {saveSuccess && (
              <span className="text-green-600 dark:text-green-400 text-sm">
                Settings saved successfully!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center px-6 py-2 rounded-md transition-colors ${
                hasChanges && !isSaving
                  ? "bg-dashboard-600 hover:bg-dashboard-700 text-white"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
