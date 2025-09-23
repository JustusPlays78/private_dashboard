import React, { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { ChangelogEntry, ChangelogChange } from "../../shared/changelog-types";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadChangelog();
    }
  }, [isOpen]);

  const loadChangelog = async () => {
    try {
      // Import changelog.json
      const changelogData = require("../../../changelog.json");
      setChangelog(changelogData);
      if (changelogData.length > 0) {
        setSelectedVersion(changelogData[0].version);
      }
    } catch (error) {
      console.error("Failed to load changelog:", error);
      setChangelog([]);
    }
    setLoading(false);
  };

  const getChangeIcon = (type: ChangelogChange["type"]) => {
    switch (type) {
      case "added":
        return <span className="text-sm">✨</span>;
      case "changed":
        return <span className="text-sm">🔄</span>;
      case "fixed":
        return <span className="text-sm">🔧</span>;
      case "removed":
        return <span className="text-sm">🗑️</span>;
      default:
        return <span className="text-sm">⚡</span>;
    }
  };

  const getChangeColor = (type: ChangelogChange["type"]) => {
    switch (type) {
      case "added":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "changed":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "fixed":
        return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "removed":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const selectedEntry = changelog.find(
    (entry) => entry.version === selectedVersion
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              What's New
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Latest updates and improvements
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Version Sidebar */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Versions
            </h3>
            <div className="space-y-2">
              {changelog.map((entry, index) => (
                <button
                  key={entry.version}
                  onClick={() => setSelectedVersion(entry.version)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedVersion === entry.version
                      ? "bg-dashboard-100 dark:bg-dashboard-800 text-dashboard-700 dark:text-dashboard-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        v{entry.version}
                        {index === 0 && (
                          <span className="ml-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(entry.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {entry.changes.length} change
                    {entry.changes.length !== 1 ? "s" : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dashboard-600"></div>
              </div>
            ) : selectedEntry ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Version {selectedEntry.version}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Released on {formatDate(selectedEntry.date)}
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedEntry.changes.map((change, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${getChangeColor(
                        change.type
                      )}`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3 mt-0.5">
                          {getChangeIcon(change.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {change.type}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No changelog entries found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
