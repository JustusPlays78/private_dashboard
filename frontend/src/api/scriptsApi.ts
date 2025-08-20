import {
    Script,
    ScriptResult,
    ScriptVariable,
  } from '../types';

// @ts-ignore
const API_URL = !import.meta.env.PROD ? 'http://localhost:3001/api' : '/api';

export const scriptsApi = {
    getAll: async (): Promise<Script[]> => {
      const response = await fetch(`${API_URL}/scripts`);
      if (!response.ok) throw new Error('Failed to fetch scripts');
      return response.json();
    },
  
    getById: async (id: string): Promise<Script> => {
      const response = await fetch(`${API_URL}/scripts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch script');
      return response.json();
    },
  
    create: async (script: {
      name: string;
      description?: string;
      content: string;
      variables: Omit<ScriptVariable, 'id'>[];
    }): Promise<Script> => {
      console.log('API - Creating script:', script); // Debug
  
      const response = await fetch(`${API_URL}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(script),
      });
  
      console.log('API - Response status:', response.status); // Debug
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API - Error response:', errorText); // Debug
  
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to create script');
        } catch {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }
  
      const result = await response.json();
      return result;
    },
  
    update: async (
      id: string,
      script: Omit<Script, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Script> => {
      const response = await fetch(`${API_URL}/scripts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(script),
      });
      if (!response.ok) throw new Error('Failed to update script');
      return response.json();
    },
  
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/scripts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete script');
    },
  
    execute: async (
      id: string,
      variables: { [key: string]: string }
    ): Promise<ScriptResult> => {
      const response = await fetch(`${API_URL}/scripts/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute script');
      }
      return response.json();
    },
  
    getExecutions: async (id: string): Promise<unknown[]> => {
      const response = await fetch(`${API_URL}/scripts/${id}/executions`);
      if (!response.ok) throw new Error('Failed to fetch executions');
      return response.json();
    },
  };
  