import React, { useState, useEffect } from "react";
import { Task, Secret } from "../shared/types";
import Dashboard from "./components/Dashboard";
import TaskManager from "./components/TaskManager";
import SecretManager from "./components/SecretManager";
import SettingsManager from "./components/SettingsManager";
import { LoginDialog } from "./components/LoginDialog";
import ThemeToggle from "./components/ThemeToggle";
import ChangelogModal from "./components/ChangelogModal";
import VersionBadge from "./components/VersionBadge";
import { Layout, CheckSquare, Shield, BarChart3, Settings } from "lucide-react";

const packageJson = require("../../package.json");

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    "dashboard" | "tasks" | "secrets" | "settings"
  >("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string>("");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [appSettings, setAppSettings] = useState({
    appTitle: "Private Dashboard",
    username: "",
  });

  // Load app settings
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem("dashboard-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setAppSettings({
            appTitle: parsed.username
              ? `${parsed.username} Dashboard`
              : parsed.appTitle || "Private Dashboard",
            username: parsed.username || "",
          });
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      }
    };

    loadSettings();

    // Listen for settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "dashboard-settings") {
        loadSettings();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab updates
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener("settingsUpdated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settingsUpdated", handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    // Check if this is first time setup
    const checkFirstTime = async () => {
      try {
        const firstTime = await (window.electronAPI as any).isFirstTime();
        setIsFirstTime(firstTime);
      } catch (error) {
        console.error("Error checking first time status:", error);
        setIsFirstTime(true); // Default to first time if error
      } finally {
        setLoading(false);
      }
    };
    checkFirstTime();
  }, []);

  const handleLogin = async (password: string) => {
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isFirstTime) {
        // Set new password for first time
        const success = await window.electronAPI.setPassword(password);
        if (success) {
          setIsAuthenticated(true);
          setIsFirstTime(false);
          await loadData();
        } else {
          setAuthError("Failed to set password. Please try again.");
        }
      } else {
        // Verify existing password
        const isValid = await window.electronAPI.verifyPassword(password);
        if (isValid) {
          setIsAuthenticated(true);
          await loadData();
        } else {
          setAuthError("Invalid password. Please try again.");
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [taskData, secretData] = await Promise.all([
        window.electronAPI.getTasks(),
        window.electronAPI.getSecrets(),
      ]);
      setTasks(taskData);
      setSecrets(secretData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleTaskUpdate = () => {
    window.electronAPI.getTasks().then(setTasks);
  };

  const handleSecretUpdate = () => {
    window.electronAPI.getSecrets().then(setSecrets);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dashboard-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginDialog
        onLogin={handleLogin}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layout className="h-6 w-6 text-dashboard-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {appSettings.appTitle}
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <nav className="mt-6 flex-1 px-3">
          <div>
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                currentView === "dashboard"
                  ? "bg-dashboard-100 dark:bg-dashboard-800 text-dashboard-700 dark:text-dashboard-300 border-r-2 border-dashboard-600"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Dashboard
            </button>

            <button
              onClick={() => setCurrentView("tasks")}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors mt-1 ${
                currentView === "tasks"
                  ? "bg-dashboard-100 dark:bg-dashboard-800 text-dashboard-700 dark:text-dashboard-300 border-r-2 border-dashboard-600"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <CheckSquare className="h-5 w-5 mr-3" />
              Tasks
              <span className="ml-auto bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView("secrets")}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors mt-1 ${
                currentView === "secrets"
                  ? "bg-dashboard-100 dark:bg-dashboard-800 text-dashboard-700 dark:text-dashboard-300 border-r-2 border-dashboard-600"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Shield className="h-5 w-5 mr-3" />
              Secrets
              <span className="ml-auto bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                {secrets.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView("settings")}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors mt-1 ${
                currentView === "settings"
                  ? "bg-dashboard-100 dark:bg-dashboard-800 text-dashboard-700 dark:text-dashboard-300 border-r-2 border-dashboard-600"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium">© 2025 Julscha</p>
            <VersionBadge
              version={packageJson.version}
              onChangelogClick={() => setShowChangelog(true)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "dashboard" && (
          <Dashboard tasks={tasks} secrets={secrets} />
        )}
        {currentView === "tasks" && (
          <TaskManager tasks={tasks} onUpdate={handleTaskUpdate} />
        )}
        {currentView === "secrets" && (
          <SecretManager secrets={secrets} onUpdate={handleSecretUpdate} />
        )}
        {currentView === "settings" && <SettingsManager />}
      </div>

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </div>
  );
};

export default App;
