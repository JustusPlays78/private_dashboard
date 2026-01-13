import React from 'react';
import { COLORS } from './StickyNote';
import { FRAME_COLORS } from './Frame';
import { createDefaultTableData } from './CanvasTable';

// Template definitions
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  elements: TemplateElement[];
}

interface TemplateElement {
  type: 'sticky' | 'frame' | 'connector' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
  frameTitle?: string;
  frameColor?: string;
  tableData?: ReturnType<typeof createDefaultTableData>;
  // For connectors - reference by index
  fromIndex?: number;
  toIndex?: number;
  lineStyle?: 'straight' | 'curved' | 'orthogonal';
}

// Brainstorming Template
const brainstormingTemplate: CanvasTemplate = {
  id: 'brainstorming',
  name: 'Brainstorming',
  description: 'Central topic with surrounding ideas',
  icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  elements: [
    // Central topic
    { type: 'sticky', x: 300, y: 200, width: 220, height: 160, content: '<p><strong>Main Topic</strong></p><p>Your central idea here</p>', color: COLORS[4].value },
    // Surrounding ideas
    { type: 'sticky', x: 50, y: 80, width: 180, height: 140, content: '<p>Idea 1</p>', color: COLORS[0].value },
    { type: 'sticky', x: 550, y: 80, width: 180, height: 140, content: '<p>Idea 2</p>', color: COLORS[1].value },
    { type: 'sticky', x: 50, y: 320, width: 180, height: 140, content: '<p>Idea 3</p>', color: COLORS[2].value },
    { type: 'sticky', x: 550, y: 320, width: 180, height: 140, content: '<p>Idea 4</p>', color: COLORS[3].value },
    { type: 'sticky', x: 300, y: 450, width: 180, height: 140, content: '<p>Idea 5</p>', color: COLORS[5].value },
  ],
};

// Retrospective Template
const retrospectiveTemplate: CanvasTemplate = {
  id: 'retrospective',
  name: 'Retrospective',
  description: 'What went well, what can improve, action items',
  icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  elements: [
    // Frames for columns
    { type: 'frame', x: 20, y: 60, width: 240, height: 400, frameTitle: 'What went well', frameColor: FRAME_COLORS[2].value },
    { type: 'frame', x: 280, y: 60, width: 240, height: 400, frameTitle: 'What can improve', frameColor: FRAME_COLORS[4].value },
    { type: 'frame', x: 540, y: 60, width: 240, height: 400, frameTitle: 'Action Items', frameColor: FRAME_COLORS[1].value },
    // Sample stickies
    { type: 'sticky', x: 40, y: 100, width: 200, height: 100, content: '<p>Great teamwork!</p>', color: COLORS[2].value },
    { type: 'sticky', x: 300, y: 100, width: 200, height: 100, content: '<p>More testing needed</p>', color: COLORS[5].value },
    { type: 'sticky', x: 560, y: 100, width: 200, height: 100, content: '<p>Schedule weekly reviews</p>', color: COLORS[1].value },
  ],
};

// Flowchart Template
const flowchartTemplate: CanvasTemplate = {
  id: 'flowchart',
  name: 'Simple Flowchart',
  description: 'Start, process steps, and end with connectors',
  icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  elements: [
    // Start
    { type: 'sticky', x: 100, y: 100, width: 160, height: 80, content: '<p><strong>Start</strong></p>', color: COLORS[2].value },
    // Process steps
    { type: 'sticky', x: 100, y: 250, width: 160, height: 80, content: '<p>Step 1</p>', color: COLORS[1].value },
    { type: 'sticky', x: 100, y: 400, width: 160, height: 80, content: '<p>Step 2</p>', color: COLORS[1].value },
    // End
    { type: 'sticky', x: 100, y: 550, width: 160, height: 80, content: '<p><strong>End</strong></p>', color: COLORS[3].value },
    // Connectors
    { type: 'connector', x: 0, y: 0, width: 0, height: 0, fromIndex: 0, toIndex: 1, lineStyle: 'curved' },
    { type: 'connector', x: 0, y: 0, width: 0, height: 0, fromIndex: 1, toIndex: 2, lineStyle: 'curved' },
    { type: 'connector', x: 0, y: 0, width: 0, height: 0, fromIndex: 2, toIndex: 3, lineStyle: 'curved' },
  ],
};

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  brainstormingTemplate,
  retrospectiveTemplate,
  flowchartTemplate,
];

interface TemplatePickerProps {
  onSelect: (template: CanvasTemplate) => void;
  onClose: () => void;
}

export default function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Choose a Template</h2>
        <p className="text-slate-400 text-sm mb-6">
          Start with a pre-made layout or create from scratch.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {CANVAS_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors border border-slate-600 hover:border-slate-500"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-slate-400">{template.icon}</div>
                <h3 className="text-white font-medium">{template.name}</h3>
              </div>
              <p className="text-slate-400 text-sm">{template.description}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
          >
            Start Empty
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
