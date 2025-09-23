import React, { useState } from "react";
import { Secret } from "../../shared/types";
import { Plus, Edit, Trash2, Eye, EyeOff, Copy } from "lucide-react";

interface SecretManagerProps {
  secrets: Secret[];
  onUpdate: () => void;
}

const SecretManager: React.FC<SecretManagerProps> = ({ secrets, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({ name: "", value: "", description: "" });
    setEditingSecret(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSecret) {
        await window.electronAPI.updateSecret(editingSecret.id!, formData);
      } else {
        await window.electronAPI.addSecret(formData);
      }
      onUpdate();
      resetForm();
    } catch (error) {
      console.error("Error saving secret:", error);
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        alert(
          "A secret with this name already exists. Please choose a different name."
        );
      }
    }
  };

  const handleEdit = (secret: Secret) => {
    setEditingSecret(secret);
    setFormData({
      name: secret.name,
      value: secret.value,
      description: secret.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this secret? This action cannot be undone."
      )
    ) {
      try {
        await window.electronAPI.deleteSecret(id);
        onUpdate();
      } catch (error) {
        console.error("Error deleting secret:", error);
      }
    }
  };

  const toggleVisibility = (id: number) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleSecrets(newVisible);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Simple feedback - in a real app you might want a toast notification
      console.log("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Secrets</h1>
          <p className="text-gray-600 mt-2">
            Securely store your sensitive information
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-dashboard-600 text-white px-4 py-2 rounded-lg hover:bg-dashboard-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Secret</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingSecret ? "Edit Secret" : "New Secret"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dashboard-500"
                placeholder="e.g., API Key, Database Password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <textarea
                required
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dashboard-500"
                placeholder="Enter the secret value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dashboard-500"
                placeholder="What is this secret used for?"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-dashboard-600 text-white rounded-md hover:bg-dashboard-700"
              >
                {editingSecret ? "Update" : "Create"} Secret
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {secrets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No secrets stored</p>
            <p className="text-gray-400">
              Add your first secret to get started!
            </p>
          </div>
        ) : (
          secrets.map((secret) => (
            <div key={secret.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {secret.name}
                  </h3>
                  {secret.description && (
                    <p className="mt-1 text-gray-600">{secret.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        {visibleSecrets.has(secret.id!) ? (
                          <code className="block p-2 bg-gray-100 rounded text-sm font-mono break-all">
                            {secret.value}
                          </code>
                        ) : (
                          <div className="p-2 bg-gray-100 rounded text-sm">
                            {"•".repeat(20)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleVisibility(secret.id!)}
                          className="p-2 text-gray-500 hover:text-dashboard-600 hover:bg-dashboard-50 rounded"
                          title={
                            visibleSecrets.has(secret.id!) ? "Hide" : "Show"
                          }
                        >
                          {visibleSecrets.has(secret.id!) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(secret.value)}
                          className="p-2 text-gray-500 hover:text-dashboard-600 hover:bg-dashboard-50 rounded"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    {secret.updated_at
                      ? `Updated ${new Date(
                          secret.updated_at
                        ).toLocaleDateString()}`
                      : `Created ${new Date(
                          secret.created_at!
                        ).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(secret)}
                    className="p-2 text-gray-500 hover:text-dashboard-600 hover:bg-dashboard-50 rounded"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(secret.id!)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SecretManager;
