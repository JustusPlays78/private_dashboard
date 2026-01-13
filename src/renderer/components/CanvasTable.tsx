import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface TableData {
  rows: number;
  cols: number;
  cells: { [key: string]: string };
  colWidths?: number[];
  headerRow?: boolean;
}

interface CanvasTableProps {
  id: string;
  tableData: TableData;
  isSelected: boolean;
  isEditing: boolean;
  onTableDataChange: (data: TableData) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  containerWidth?: number;
  containerHeight?: number;
}

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 36;

export default function CanvasTable({
  id,
  tableData,
  isSelected,
  isEditing,
  onTableDataChange,
  onStartEditing,
  onStopEditing,
  containerWidth,
  containerHeight,
}: CanvasTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { rows, cols, cells, colWidths = [], headerRow = true } = tableData;

  // Get column width
  const getColWidth = (colIndex: number) => colWidths[colIndex] || DEFAULT_COL_WIDTH;

  // Calculate base table dimensions
  const baseTableWidth = Array.from({ length: cols }, (_, i) => getColWidth(i)).reduce((a, b) => a + b, 0);
  const baseTableHeight = rows * DEFAULT_ROW_HEIGHT;

  // Calculate scale to fit container - table should always fill the container
  const padding = 8; // padding inside container
  const availableWidth = containerWidth ? containerWidth - padding : baseTableWidth;
  const availableHeight = containerHeight ? containerHeight - padding : baseTableHeight;

  // Scale to fit while maintaining aspect ratio
  const scaleX = availableWidth / baseTableWidth;
  const scaleY = availableHeight / baseTableHeight;
  // Use the smaller scale to fit within bounds, minimum 0.5x, no maximum (let it grow)
  const scale = Math.max(0.5, Math.min(scaleX, scaleY));

  // Cell key format: "row-col"
  const getCellKey = (row: number, col: number) => `${row}-${col}`;
  const getCellValue = (row: number, col: number) => cells[getCellKey(row, col)] || '';

  // Update cell value
  const setCellValue = (row: number, col: number, value: string) => {
    const newCells = { ...cells, [getCellKey(row, col)]: value };
    onTableDataChange({ ...tableData, cells: newCells });
  };

  // Add row
  const addRow = (atIndex?: number) => {
    const insertAt = atIndex ?? rows;
    const newCells: { [key: string]: string } = {};

    // Shift existing cells
    for (let r = rows - 1; r >= insertAt; r--) {
      for (let c = 0; c < cols; c++) {
        const oldKey = getCellKey(r, c);
        const newKey = getCellKey(r + 1, c);
        if (cells[oldKey]) {
          newCells[newKey] = cells[oldKey];
        }
      }
    }

    // Keep cells before insert point
    for (let r = 0; r < insertAt; r++) {
      for (let c = 0; c < cols; c++) {
        const key = getCellKey(r, c);
        if (cells[key]) {
          newCells[key] = cells[key];
        }
      }
    }

    onTableDataChange({ ...tableData, rows: rows + 1, cells: newCells });
  };

  // Remove row
  const removeRow = (atIndex: number) => {
    if (rows <= 1) return;

    const newCells: { [key: string]: string } = {};

    for (let r = 0; r < rows; r++) {
      if (r === atIndex) continue;
      const newR = r > atIndex ? r - 1 : r;
      for (let c = 0; c < cols; c++) {
        const oldKey = getCellKey(r, c);
        const newKey = getCellKey(newR, c);
        if (cells[oldKey]) {
          newCells[newKey] = cells[oldKey];
        }
      }
    }

    onTableDataChange({ ...tableData, rows: rows - 1, cells: newCells });
  };

  // Add column
  const addColumn = (atIndex?: number) => {
    const insertAt = atIndex ?? cols;
    const newCells: { [key: string]: string } = {};
    const newColWidths = [...colWidths];

    for (let r = 0; r < rows; r++) {
      for (let c = cols - 1; c >= insertAt; c--) {
        const oldKey = getCellKey(r, c);
        const newKey = getCellKey(r, c + 1);
        if (cells[oldKey]) {
          newCells[newKey] = cells[oldKey];
        }
      }
      for (let c = 0; c < insertAt; c++) {
        const key = getCellKey(r, c);
        if (cells[key]) {
          newCells[key] = cells[key];
        }
      }
    }

    newColWidths.splice(insertAt, 0, DEFAULT_COL_WIDTH);

    onTableDataChange({ ...tableData, cols: cols + 1, cells: newCells, colWidths: newColWidths });
  };

  // Remove column
  const removeColumn = (atIndex: number) => {
    if (cols <= 1) return;

    const newCells: { [key: string]: string } = {};
    const newColWidths = colWidths.filter((_, i) => i !== atIndex);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c === atIndex) continue;
        const newC = c > atIndex ? c - 1 : c;
        const oldKey = getCellKey(r, c);
        const newKey = getCellKey(r, newC);
        if (cells[oldKey]) {
          newCells[newKey] = cells[oldKey];
        }
      }
    }

    onTableDataChange({ ...tableData, cols: cols - 1, cells: newCells, colWidths: newColWidths });
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    const key = getCellKey(row, col);
    setSelectedCell(key);
  };

  // Handle cell double click - start editing
  const handleCellDoubleClick = (row: number, col: number) => {
    const key = getCellKey(row, col);
    setEditingCell(key);
    onStartEditing();
  };

  // Handle cell input change
  const handleCellChange = (row: number, col: number, value: string) => {
    setCellValue(row, col, value);
  };

  // Handle cell input blur
  const handleCellBlur = () => {
    setEditingCell(null);
    onStopEditing();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey ? col - 1 : col + 1;
      if (nextCol >= 0 && nextCol < cols) {
        setEditingCell(getCellKey(row, nextCol));
      } else if (!e.shiftKey && row < rows - 1) {
        setEditingCell(getCellKey(row + 1, 0));
      } else if (e.shiftKey && row > 0) {
        setEditingCell(getCellKey(row - 1, cols - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = e.shiftKey ? row - 1 : row + 1;
      if (nextRow >= 0 && nextRow < rows) {
        setEditingCell(getCellKey(nextRow, col));
      }
    } else if (e.key === 'Escape') {
      handleCellBlur();
    }
  };

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  return (
    <div
      ref={tableContainerRef}
      className="h-full w-full flex flex-col bg-slate-800 rounded-lg shadow-lg overflow-hidden"
      style={{
        border: isSelected ? '2px solid #64748b' : '1px solid #475569',
      }}
    >
      {/* Table controls - visible when selected */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex gap-1 z-20">
          <button
            onClick={() => addColumn()}
            className="p-1 bg-slate-700 rounded shadow border border-slate-600 hover:bg-slate-600 text-slate-300"
            title="Add Column"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => addRow()}
            className="p-1 bg-slate-700 rounded shadow border border-slate-600 hover:bg-slate-600 text-slate-300"
            title="Add Row"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      <div
        className="flex-1 overflow-hidden"
        style={{
          padding: padding / 2,
        }}
      >
        <div
          style={{
            // Scale the table to fit the container
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: baseTableWidth,
            height: baseTableHeight,
          }}
        >
        <table className="border-collapse" style={{ width: baseTableWidth }}>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const cellKey = getCellKey(rowIndex, colIndex);
                  const isHeader = headerRow && rowIndex === 0;
                  const isEditingThis = editingCell === cellKey;
                  const isSelectedThis = selectedCell === cellKey;

                  return (
                    <td
                      key={colIndex}
                      className={`border border-slate-600 p-0 relative ${
                        isHeader ? 'bg-slate-700 font-medium text-slate-200' : 'bg-slate-800 text-slate-200'
                      } ${isSelectedThis && !isEditingThis ? 'ring-2 ring-inset ring-slate-400' : ''}`}
                      style={{
                        width: getColWidth(colIndex),
                        minWidth: getColWidth(colIndex),
                        height: DEFAULT_ROW_HEIGHT,
                      }}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {isEditingThis ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={getCellValue(rowIndex, colIndex)}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          className="w-full h-full px-2 text-sm outline-none bg-slate-700 text-white"
                          style={{ minHeight: DEFAULT_ROW_HEIGHT - 2 }}
                        />
                      ) : (
                        <div className="w-full h-full px-2 py-1 text-sm truncate flex items-center text-slate-200">
                          {getCellValue(rowIndex, colIndex)}
                        </div>
                      )}

                      {/* Row/Col delete buttons - show on cell hover when selected */}
                      {isSelectedThis && isSelected && (
                        <>
                          {cols > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeColumn(colIndex);
                              }}
                              className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 z-30"
                              title="Remove Column"
                            >
                              <Minus className="w-2 h-2" />
                            </button>
                          )}
                          {rows > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRow(rowIndex);
                              }}
                              className="absolute top-1/2 -left-3 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 z-30"
                              title="Remove Row"
                            >
                              <Minus className="w-2 h-2" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// Helper to create default table data
export function createDefaultTableData(rows = 3, cols = 3): TableData {
  return {
    rows,
    cols,
    cells: {},
    colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
    headerRow: true,
  };
}

export type { TableData };
