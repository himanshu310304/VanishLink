import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export const Table = ({ columns, data, isLoading, onRowClick }) => {
  if (isLoading) {
    return (
      <div className="w-full py-12 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full py-12 text-center border border-dashed border-slate-200/10 rounded-lg bg-white/5">
        <p className="text-slate-500 text-sm">No data found</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl shadow-xl">
      <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200">
        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider border-b border-slate-300 dark:border-slate-700/50">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={cn("px-6 py-4", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {data.map((row, rowIndex) => (
            <tr 
              key={row._id || rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                "group transition-all duration-200 hover:bg-slate-700/30 hover:shadow-lg",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 text-slate-800 dark:text-slate-200">
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};