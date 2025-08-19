export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

// ... existing types ...

export interface Script {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: ScriptVariable[];
  created_at: string;
  updated_at: string;
}

export interface ScriptVariable {
  id: string;
  name: string;
  placeholder: string;
  description?: string;
  default_value?: string;
  required: boolean;
  type: 'text' | 'password' | 'number' | 'url';
}

export type NewScriptVariable = Omit<ScriptVariable, 'id'>;

export interface ScriptExecution {
  script_id: string;
  variables: { [key: string]: string };
}

export interface ScriptResult {
  script_id: string;
  processed_content: string;
  variables_used: { [key: string]: string };
  executed_at: string;
}
