import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Script, ScriptVariable, ScriptResult } from '../types';

const router = express.Router();

// Get all scripts
router.get('/', (req, res) => {
    db.all('SELECT * FROM scripts ORDER BY updated_at DESC', (err, scripts: any[]) => {
        if (err) {
            console.error('Error fetching scripts:', err);
            return res.status(500).json({ error: 'Failed to fetch scripts' });
        }

        // Get variables for each script
        let completed = 0;
        const scriptsWithVariables: Script[] = [];

        if (scripts.length === 0) {
            return res.json([]);
        }

        scripts.forEach((script, index) => {
            db.all(
                'SELECT * FROM script_variables WHERE script_id = ? ORDER BY name',
                [script.id],
                (err, variables: any[]) => {
                    if (err) {
                        console.error('Error fetching variables:', err);
                        return res.status(500).json({ error: 'Failed to fetch script variables' });
                    }

                    scriptsWithVariables[index] = { ...script, variables: variables || [] };
                    completed++;

                    if (completed === scripts.length) {
                        res.json(scriptsWithVariables);
                    }
                }
            );
        });
    });
});

// Create script
router.post('/', (req, res) => {
    const { name, description, content, variables } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Script name is required' });
    }

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Script content is required' });
    }

    const scriptId = uuidv4();
    const now = new Date().toISOString();

    db.run(
        'INSERT INTO scripts (id, name, description, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [scriptId, name.trim(), description?.trim() || null, content.trim(), now, now],
        function(err) {
            if (err) {
                console.error('Error creating script:', err);
                return res.status(500).json({ error: 'Failed to create script' });
            }

            // Insert variables
            if (variables && Array.isArray(variables) && variables.length > 0) {
                let variablesInserted = 0;
                const validVariables = variables.filter(v => v.name && v.name.trim() && v.placeholder && v.placeholder.trim());

                if (validVariables.length === 0) {
                    // No variables to insert, return script
                    return db.get('SELECT * FROM scripts WHERE id = ?', [scriptId], (err, script: any) => {
                        if (err) {
                            console.error('Error fetching created script:', err);
                            return res.status(500).json({ error: 'Failed to fetch created script' });
                        }
                        res.status(201).json({
                            id: script.id,
                            name: script.name,
                            description: script.description,
                            content: script.content,
                            created_at: script.created_at,
                            updated_at: script.updated_at,
                            variables: []
                        });
                    });
                }

                validVariables.forEach((variable) => {
                    db.run(
                        'INSERT INTO script_variables (id, script_id, name, placeholder, description, default_value, required, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            uuidv4(),
                            scriptId,
                            variable.name.trim(),
                            variable.placeholder.trim(),
                            variable.description?.trim() || null,
                            variable.default_value?.trim() || null,
                            variable.required ? 1 : 0,
                            variable.type || 'text'
                        ],
                        (err) => {
                            if (err) {
                                console.error('Error inserting variable:', err);
                                return res.status(500).json({ error: 'Failed to create script variables' });
                            }

                            variablesInserted++;
                            if (variablesInserted === validVariables.length) {
                                // All variables inserted, return script with variables
                                db.get('SELECT * FROM scripts WHERE id = ?', [scriptId], (err, script: any) => {
                                    if (err) {
                                        console.error('Error fetching created script:', err);
                                        return res.status(500).json({ error: 'Failed to fetch created script' });
                                    }

                                    db.all('SELECT * FROM script_variables WHERE script_id = ? ORDER BY name', [scriptId], (err, scriptVariables: any[]) => {
                                        if (err) {
                                            console.error('Error fetching script variables:', err);
                                            return res.status(500).json({ error: 'Failed to fetch script variables' });
                                        }

                                        res.status(201).json({
                                            id: script.id,
                                            name: script.name,
                                            description: script.description,
                                            content: script.content,
                                            created_at: script.created_at,
                                            updated_at: script.updated_at,
                                            variables: scriptVariables || []
                                        });
                                    });
                                });
                            }
                        }
                    );
                });
            } else {
                // No variables, return script
                db.get('SELECT * FROM scripts WHERE id = ?', [scriptId], (err, script: any) => {
                    if (err) {
                        console.error('Error fetching created script:', err);
                        return res.status(500).json({ error: 'Failed to fetch created script' });
                    }
                    res.status(201).json({
                        id: script.id,
                        name: script.name,
                        description: script.description,
                        content: script.content,
                        created_at: script.created_at,
                        updated_at: script.updated_at,
                        variables: []
                    });
                });
            }
        }
    );
});

// Get single script
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id], (err, script: any) => {
        if (err) {
            console.error('Error fetching script:', err);
            return res.status(500).json({ error: 'Failed to fetch script' });
        }

        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        db.all('SELECT * FROM script_variables WHERE script_id = ? ORDER BY name', [script.id], (err, variables: any[]) => {
            if (err) {
                console.error('Error fetching variables:', err);
                return res.status(500).json({ error: 'Failed to fetch script variables' });
            }

            res.json({
                id: script.id,
                name: script.name,
                description: script.description,
                content: script.content,
                created_at: script.created_at,
                updated_at: script.updated_at,
                variables: variables || []
            });
        });
    });
});

// Update script
router.put('/:id', (req, res) => {
    const { name, description, content, variables } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Script name is required' });
    }

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Script content is required' });
    }

    const now = new Date().toISOString();

    db.run(
        'UPDATE scripts SET name = ?, description = ?, content = ?, updated_at = ? WHERE id = ?',
        [name.trim(), description?.trim() || null, content.trim(), now, req.params.id],
        function(err) {
            if (err) {
                console.error('Error updating script:', err);
                return res.status(500).json({ error: 'Failed to update script' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Script not found' });
            }

            // Delete existing variables
            db.run('DELETE FROM script_variables WHERE script_id = ?', [req.params.id], (err) => {
                if (err) {
                    console.error('Error deleting variables:', err);
                    return res.status(500).json({ error: 'Failed to update script variables' });
                }

                // Insert new variables
                if (variables && Array.isArray(variables) && variables.length > 0) {
                    let variablesInserted = 0;
                    const validVariables = variables.filter(v => v.name && v.name.trim() && v.placeholder && v.placeholder.trim());

                    if (validVariables.length === 0) {
                        // No variables to insert, return script
                        return db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id], (err, script: any) => {
                            if (err) {
                                console.error('Error fetching updated script:', err);
                                return res.status(500).json({ error: 'Failed to fetch updated script' });
                            }
                            res.json({
                                id: script.id,
                                name: script.name,
                                description: script.description,
                                content: script.content,
                                created_at: script.created_at,
                                updated_at: script.updated_at,
                                variables: []
                            });
                        });
                    }

                    validVariables.forEach((variable) => {
                        db.run(
                            'INSERT INTO script_variables (id, script_id, name, placeholder, description, default_value, required, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                                uuidv4(),
                                req.params.id,
                                variable.name.trim(),
                                variable.placeholder.trim(),
                                variable.description?.trim() || null,
                                variable.default_value?.trim() || null,
                                variable.required ? 1 : 0,
                                variable.type || 'text'
                            ],
                            (err) => {
                                if (err) {
                                    console.error('Error inserting variable:', err);
                                    return res.status(500).json({ error: 'Failed to update script variables' });
                                }

                                variablesInserted++;
                                if (variablesInserted === validVariables.length) {
                                    // All variables inserted, return script with variables
                                    db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id], (err, script: any) => {
                                        if (err) {
                                            console.error('Error fetching updated script:', err);
                                            return res.status(500).json({ error: 'Failed to fetch updated script' });
                                        }

                                        db.all('SELECT * FROM script_variables WHERE script_id = ? ORDER BY name', [req.params.id], (err, scriptVariables: any[]) => {
                                            if (err) {
                                                console.error('Error fetching script variables:', err);
                                                return res.status(500).json({ error: 'Failed to fetch script variables' });
                                            }

                                            res.json({
                                                id: script.id,
                                                name: script.name,
                                                description: script.description,
                                                content: script.content,
                                                created_at: script.created_at,
                                                updated_at: script.updated_at,
                                                variables: scriptVariables || []
                                            });
                                        });
                                    });
                                }
                            }
                        );
                    });
                } else {
                    // No variables, return script
                    db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id], (err, script: any) => {
                        if (err) {
                            console.error('Error fetching updated script:', err);
                            return res.status(500).json({ error: 'Failed to fetch updated script' });
                        }
                        res.json({
                            id: script.id,
                            name: script.name,
                            description: script.description,
                            content: script.content,
                            created_at: script.created_at,
                            updated_at: script.updated_at,
                            variables: []
                        });
                    });
                }
            });
        }
    );
});

// Delete script
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM scripts WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Error deleting script:', err);
            return res.status(500).json({ error: 'Failed to delete script' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Script not found' });
        }

        res.status(204).send();
    });
});

// Execute script with variables
router.post('/:id/execute', (req, res) => {
    const { variables } = req.body;

    db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id], (err, script: any) => {
        if (err) {
            console.error('Error fetching script:', err);
            return res.status(500).json({ error: 'Failed to fetch script' });
        }

        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        db.all('SELECT * FROM script_variables WHERE script_id = ?', [req.params.id], (err, scriptVariables: any[]) => {
            if (err) {
                console.error('Error fetching script variables:', err);
                return res.status(500).json({ error: 'Failed to fetch script variables' });
            }

            // Validate required variables
            for (const scriptVar of scriptVariables) {
                if (scriptVar.required && (!variables[scriptVar.name] || variables[scriptVar.name].trim() === '')) {
                    return res.status(400).json({
                        error: `Required variable '${scriptVar.name}' is missing`
                    });
                }
            }

            // Process script content - replace variables with $J{VARIABLE_NAME} format
            let processedContent = script.content;

            for (const [varName, varValue] of Object.entries(variables)) {
                const regex = new RegExp(`\\$J\\{${varName}\\}`, 'g');
                processedContent = processedContent.replace(regex, varValue as string);
            }

            // Save execution history
            const executionId = uuidv4();
            const now = new Date().toISOString();

            db.run(
                'INSERT INTO script_executions (id, script_id, variables_used, processed_content, executed_at) VALUES (?, ?, ?, ?, ?)',
                [executionId, req.params.id, JSON.stringify(variables), processedContent, now],
                (err) => {
                    if (err) {
                        console.error('Error saving execution:', err);
                        // Continue anyway, don't fail the execution
                    }

                    const result: ScriptResult = {
                        script_id: req.params.id,
                        processed_content: processedContent,
                        variables_used: variables,
                        executed_at: now
                    };

                    res.json(result);
                }
            );
        });
    });
});

export default router;