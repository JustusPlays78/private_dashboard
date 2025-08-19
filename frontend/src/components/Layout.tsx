import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, CheckSquare, Terminal } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <nav
        className="shadow-lg border-b border-accent"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">Dashboard</h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive('/')
                      ? 'text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                  style={
                    isActive('/')
                      ? { borderColor: 'var(--accent-blue-light)' }
                      : {}
                  }
                  onMouseEnter={(e) =>
                    !isActive('/') &&
                    (e.currentTarget.style.borderColor =
                      'var(--border-secondary)')
                  }
                  onMouseLeave={(e) =>
                    !isActive('/') &&
                    (e.currentTarget.style.borderColor = 'transparent')
                  }
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <Link
                  to="/notes"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive('/notes')
                      ? 'text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                  style={
                    isActive('/notes')
                      ? { borderColor: 'var(--accent-blue-light)' }
                      : {}
                  }
                  onMouseEnter={(e) =>
                    !isActive('/notes') &&
                    (e.currentTarget.style.borderColor =
                      'var(--border-secondary)')
                  }
                  onMouseLeave={(e) =>
                    !isActive('/notes') &&
                    (e.currentTarget.style.borderColor = 'transparent')
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Notizen
                </Link>
                <Link
                  to="/tasks"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive('/tasks')
                      ? 'text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                  style={
                    isActive('/tasks')
                      ? { borderColor: 'var(--accent-blue-light)' }
                      : {}
                  }
                  onMouseEnter={(e) =>
                    !isActive('/tasks') &&
                    (e.currentTarget.style.borderColor =
                      'var(--border-secondary)')
                  }
                  onMouseLeave={(e) =>
                    !isActive('/tasks') &&
                    (e.currentTarget.style.borderColor = 'transparent')
                  }
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Tasks
                </Link>
                <Link
                  to="/scripts"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive('/scripts')
                      ? 'text-primary'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                  style={
                    isActive('/scripts')
                      ? { borderColor: 'var(--accent-blue-light)' }
                      : {}
                  }
                  onMouseEnter={(e) =>
                    !isActive('/scripts') &&
                    (e.currentTarget.style.borderColor =
                      'var(--border-secondary)')
                  }
                  onMouseLeave={(e) =>
                    !isActive('/scripts') &&
                    (e.currentTarget.style.borderColor = 'transparent')
                  }
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Scripts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default Layout;
