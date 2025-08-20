import {
    SecretMeta,
    SecretValue,
} from '../types';

  // @ts-ignore
const API_URL = !import.meta.env.PROD ? 'http://localhost:3001/api' : '/api';

// Secrets API
export const secretsApi = {
    getAll: async (): Promise<SecretMeta[]> => {
        const res = await fetch(`${API_URL}/secrets`);
        if (!res.ok) throw new Error('Failed to list secrets');
        return res.json();
    },
    get: async (name: string): Promise<SecretValue> => {
        const res = await fetch(`${API_URL}/secrets/${encodeURIComponent(name)}`);
        if (res.status === 404) throw new Error('Secret not found');
        if (!res.ok) throw new Error('Failed to get secret');
        return res.json();
    },
    set: async (name: string, value: string, due_date?: string | null): Promise<void> => {
        const body: any = { value };
        if (due_date !== undefined) body.due_date = due_date;
        const res = await fetch(`${API_URL}/secrets/${encodeURIComponent(name)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to set secret');
    },
    delete: async (name: string): Promise<void> => {
        const res = await fetch(`${API_URL}/secrets/${encodeURIComponent(name)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete secret');
    },
};