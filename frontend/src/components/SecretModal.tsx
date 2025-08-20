import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { secretsApi } from '../api/secretsApi';

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const MM = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}
interface SecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretName: string | null; // null = create
  onSaved: (name: string) => void;
}

const SecretModal: React.FC<SecretModalProps> = ({
  isOpen,
  onClose,
  secretName,
  onSaved,
}) => {
  const isEdit = !!secretName;
  const [name, setName] = useState<string>(secretName || '');
  const [value, setValue] = useState<string>('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [due, setDue] = useState<string>(''); // 'yyyy-MM-ddTHH:mm'

  useEffect(() => {
    // Reset state on open/change
    setName(secretName || '');
    setValue('');
    setShow(false);
    setDue('');
    setCopied(false);

    // Load current value when editing
    if (isOpen && secretName) {
      setLoading(true);
      secretsApi
        .get(secretName)
        .then((s) => {
          setValue(s.value);
          if (s.due_date) setDue(toLocalDatetimeInput(s.due_date));
        })
        .catch(() => setValue(''))
        .finally(() => setLoading(false));
    }
  }, [isOpen, secretName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !value) return;
    try {
      // Convert local datetime-local to ISO if present
      const dueIso = due ? new Date(due).toISOString() : null;
      await secretsApi.set(trimmed, value, dueIso);
      onSaved(trimmed);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Secret bearbeiten' : 'Neues Secret'}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-secondary mb-1">Name</label>
          <input
            type="text"
            value={name}
            disabled={isEdit}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
            placeholder="z.B. API_TOKEN"
          />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">Wert</label>
          <div className="flex space-x-2">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input-field flex-1"
              placeholder="geheimer Wert"
            />
            <button
              className="btn-secondary"
              onClick={() => setShow((s) => !s)}
              type="button"
            >
              {show ? 'Hide' : 'Show'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleCopy}
              type="button"
            >
              {copied ? 'Kopiert!' : 'Copy'}
            </button>
          </div>
          {isEdit && loading && (
            <p className="text-xs text-muted mt-1">Lade aktuellen Wert…</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">
            Fälligkeitsdatum (optional)
          </label>
          <input
            type="datetime-local"
            className="input-field w-full"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">
            Wird für Benachrichtigungen verwendet, wenn das Secret abläuft.
          </p>
        </div>
        <div className="flex justify-end space-x-2 pt-2 border-t border-accent">
          <button className="btn-secondary" onClick={onClose} type="button">
            Abbrechen
          </button>
          <button
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            type="button"
            disabled={!name.trim() || !value || loading}
          >
            {isEdit ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SecretModal;
