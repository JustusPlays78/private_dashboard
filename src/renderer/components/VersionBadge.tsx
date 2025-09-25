import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface VersionBadgeProps {
  version: string;
  onChangelogClick: () => void;
}

const VersionBadge: React.FC<VersionBadgeProps> = ({
  version,
  onChangelogClick,
}) => {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    // Check if user has seen this version
    const lastSeenVersion = localStorage.getItem("last-seen-version");
    if (!lastSeenVersion || lastSeenVersion !== version) {
      setHasNewVersion(true);
    }
  }, [version]);

  const handleClick = () => {
    // Mark version as seen
    localStorage.setItem("last-seen-version", version);
    setHasNewVersion(false);
    onChangelogClick();
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center justify-center text-center text-xs text-gray-500 dark:text-gray-400 hover:text-dashboard-600 dark:hover:text-dashboard-400 transition-colors group mx-auto"
    >
      <span>V{version}</span>
      {hasNewVersion && (
        <>
          <Sparkles className="h-3 w-3 ml-1 text-green-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></span>
        </>
      )}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {hasNewVersion ? "What's New" : "View Changelog"}
      </div>
    </button>
  );
};

export default VersionBadge;
