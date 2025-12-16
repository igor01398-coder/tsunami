
import React from 'react';
import { SimulationRecord } from '../types';

interface SimulationHistoryProps {
  history: SimulationRecord[];
  onClear: () => void;
  onRestore: (record: SimulationRecord) => void;
}

const SimulationHistory: React.FC<SimulationHistoryProps> = ({ history, onClear, onRestore }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[400px]">
      <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📜</span> 模擬紀錄 (History)
        </h2>
        <button 
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          清空紀錄
        </button>
      </div>
      
      <div className="overflow-y-auto custom-scrollbar p-2 space-y-2">
        {history.map((record) => (
          <div 
            key={record.id} 
            className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800 transition-colors group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{record.locationName}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(record.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">波高 / 海堤</div>
                    <div className="text-sm font-bold">
                        <span className="text-cyan-400">{record.result.waveHeight || '-'}m</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-emerald-400">{record.result.recommendedHeight}m</span>
                    </div>
                </div>
                <button 
                  onClick={() => onRestore(record)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 bg-ocean-600 hover:bg-ocean-500 text-white rounded text-xs transition-all"
                  title="套用此設定"
                >
                  ↺
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded">
              <div className="flex items-center gap-1">
                <span>📐 坡度:</span>
                <span className="text-slate-200">{record.params.slope}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌊 強度:</span>
                <span className="text-slate-200">{record.params.intensity}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⬇️ 深度:</span>
                <span className="text-slate-200">{record.params.depth}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimulationHistory;
