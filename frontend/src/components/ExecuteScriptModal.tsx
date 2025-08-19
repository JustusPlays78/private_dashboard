import React, { useState, useEffect } from 'react';
import { Play, Upload, Download, Copy, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { Script, ScriptResult } from '../types';
import { scriptsApi } from '../api';

interface ExecuteScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: Script | null;
}

const ExecuteScriptModal: React.FC<ExecuteScriptModalProps> = ({
                                                                   isOpen,
                                                                   onClose,
                                                                   script
                                                               }) => {
    const [variables, setVariables] = useState<{ [key: string]: string }>({});
    const [result, setResult] = useState<ScriptResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (script && isOpen) {
            // Initialize variables with default values
            const initialVariables: { [key: string]: string } = {};
            script.variables.forEach(variable => {
                initialVariables[variable.name] = variable.default_value || '';
            });
            setVariables(initialVariables);
            setResult(null);
            setError(null);
            setStep('input');
            setCopied(false);
        }
    }, [script, isOpen]);

    const handleVariableChange = (name: string, value: string) => {
        setVariables(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                if (file.name.endsWith('.json')) {
                    // Parse JSON file
                    const jsonData = JSON.parse(content);
                    const newVariables = { ...variables };

                    // Map JSON keys to script variables
                    script?.variables.forEach(variable => {
                        if (jsonData[variable.name] !== undefined) {
                            newVariables[variable.name] = String(jsonData[variable.name]);
                        }
                    });

                    setVariables(newVariables);
                } else {
                    // Parse text file (key=value format)
                    const lines = content.split('\n');
                    const newVariables = { ...variables };

                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (trimmedLine && !trimmedLine.startsWith('#')) {
                            const [key, ...valueParts] = trimmedLine.split('=');
                            if (key && valueParts.length > 0) {
                                const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
                                const cleanKey = key.trim();

                                // Check if this key matches any script variable
                                if (script?.variables.some(v => v.name === cleanKey)) {
                                    newVariables[cleanKey] = value;
                                }
                            }
                        }
                    });

                    setVariables(newVariables);
                }
            } catch (error) {
                setError('Fehler beim Lesen der Datei. Überprüfe das Format.');
            }
        };

        reader.readAsText(file);
        // Reset file input
        event.target.value = '';
    };

    const handleExportVariables = () => {
        const exportData = script?.variables.reduce((acc, variable) => {
            acc[variable.name] = variables[variable.name] || '';
            return acc;
        }, {} as { [key: string]: string });

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${script?.name.replace(/\s+/g, '_').toLowerCase()}_variables.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const validateVariables = (): string[] => {
        const errors: string[] = [];

        script?.variables.forEach(variable => {
            if (variable.required && (!variables[variable.name] || variables[variable.name].trim() === '')) {
                errors.push(`${variable.name} ist erforderlich`);
            }
        });

        return errors;
    };

    const handleExecute = async () => {
        if (!script) return;

        const validationErrors = validateVariables();
        if (validationErrors.length > 0) {
            setError(validationErrors.join(', '));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await scriptsApi.execute(script.id, variables);
            setResult(result);
            setStep('result');
        } catch (error: any) {
            setError(error.message || 'Fehler beim Ausführen des Scripts');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyResult = async () => {
        if (result) {
            try {
                await navigator.clipboard.writeText(result.processed_content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (error) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = result.processed_content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    };

    const handleDownloadResult = () => {
        if (result && script) {
            const blob = new Blob([result.processed_content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${script.name.replace(/\s+/g, '_').toLowerCase()}_result.sh`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const handleBackToInput = () => {
        setStep('input');
        setResult(null);
        setError(null);
    };

    if (!script) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'input' ? `Script ausführen: ${script.name}` : 'Script Ergebnis'}
            size="xl"
        >
            <div className="space-y-6">
                {step === 'input' ? (
                    <>
                        {/* Script Info */}
                        <div className="card p-4 border border-accent">
                            <div className="flex items-center space-x-2 mb-2">
                                <FileText className="w-4 h-4 text-muted" />
                                <h3 className="font-medium text-primary">{script.name}</h3>
                            </div>
                            {script.description && (
                                <p className="text-sm text-secondary">{script.description}</p>
                            )}
                            <p className="text-xs text-muted mt-2">
                                {script.variables.length} Variable{script.variables.length !== 1 ? 'n' : ''} erforderlich
                            </p>
                        </div>

                        {/* File Upload */}
                        <div className="card p-4 border border-accent">
                            <h4 className="font-medium text-primary mb-3">Variablen aus Datei laden</h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept=".json,.txt,.env"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="btn-secondary w-full flex items-center justify-center cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Datei hochladen (.json, .txt, .env)
                                    </label>
                                </div>
                                <button
                                    onClick={handleExportVariables}
                                    className="btn-secondary flex items-center justify-center"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Exportieren
                                </button>
                            </div>
                            <p className="text-xs text-muted mt-2">
                                JSON: <code>{`{"VARIABLE_NAME": "value"}`}</code> |
                                Text: <code>VARIABLE_NAME=value</code> |
                                Script: <code>$J{`{VARIABLE_NAME}`}</code>
                            </p>
                        </div>

                        {/* Variables Input */}
                        <div>
                            <h4 className="font-medium text-primary mb-4">Variablen eingeben</h4>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {script.variables.map((variable) => (
                                    <div key={variable.id} className="card p-4 border border-accent">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <label className="block text-sm font-medium text-primary">
                                                    {variable.name}
                                                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                                                </label>
                                                {variable.description && (
                                                    <p className="text-xs text-muted mt-1">{variable.description}</p>
                                                )}
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded" style={{
                                                backgroundColor: 'var(--bg-tertiary)',
                                                color: 'var(--text-muted)'
                                            }}>
                        {variable.type}
                      </span>
                                        </div>
                                        <input
                                            type={variable.type === 'password' ? 'password' : variable.type === 'number' ? 'number' : 'text'}
                                            value={variables[variable.name] || ''}
                                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                                            placeholder={variable.placeholder}
                                            className={`input-field w-full ${
                                                variable.required && !variables[variable.name]?.trim()
                                                    ? 'border-red-500'
                                                    : ''
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="flex items-center space-x-2 p-3 rounded" style={{
                                backgroundColor: 'var(--accent-red)',
                                color: 'white'
                            }}>
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Execute Button */}
                        <div className="flex justify-end space-x-3 border-t border-accent pt-4">
                            <button
                                onClick={onClose}
                                className="btn-secondary"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleExecute}
                                disabled={loading}
                                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'var(--accent-green)' }}
                                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-green-hover)')}
                                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-green)')}
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                Script ausführen
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Result Display */}
                        <div className="space-y-4">
                            {/* Success Message */}
                            <div className="flex items-center space-x-2 p-3 rounded" style={{
                                backgroundColor: 'var(--accent-green)',
                                color: 'white'
                            }}>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">Script erfolgreich verarbeitet!</span>
                            </div>

                            {/* Variables Used */}
                            <div className="card p-4 border border-accent">
                                <h4 className="font-medium text-primary mb-3">Verwendete Variablen</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {Object.entries(result?.variables_used || {}).map(([key, value]) => (
                                        <div key={key} className="flex">
                                            <span className="font-mono text-muted w-32 truncate">{key}:</span>
                                            <span className="font-mono text-secondary truncate">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Result Content */}
                            <div className="card p-4 border border-accent">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-primary">Verarbeitetes Script</h4>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleCopyResult}
                                            className="btn-secondary text-xs flex items-center"
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Kopiert!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Kopieren
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleDownloadResult}
                                            className="btn-secondary text-xs flex items-center"
                                        >
                                            <Download className="w-3 h-3 mr-1" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                    {result?.processed_content}
                  </pre>
                                </div>
                            </div>
                        </div>

                        {/* Result Actions */}
                        <div className="flex justify-between border-t border-accent pt-4">
                            <button
                                onClick={handleBackToInput}
                                className="btn-secondary"
                            >
                                ← Zurück zur Eingabe
                            </button>
                            <div className="flex space-x-3">
                                <button
                                    onClick={onClose}
                                    className="btn-secondary"
                                >
                                    Schließen
                                </button>
                                <button
                                    onClick={handleBackToInput}
                                    className="btn-primary flex items-center"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Erneut ausführen
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ExecuteScriptModal;