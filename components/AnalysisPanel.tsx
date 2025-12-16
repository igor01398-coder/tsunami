
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult, MapLocation } from '../types';

interface AnalysisPanelProps {
  isLoading: boolean;
  result: AnalysisResult | null;
  locations: MapLocation[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ isLoading, result, locations }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-ocean-300">Gemini 正在分析地形物理數據...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>請調整參數並點擊「執行模擬」以獲取報告。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
      {/* Result Card */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
        <h3 className="text-xl font-bold text-ocean-300 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> 災害評估報告
        </h3>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{result.markdown}</ReactMarkdown>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
           {/* Estimated Wave Height */}
           <div className="p-4 bg-slate-900/50 rounded border border-cyan-500/30">
            <span className="block text-[10px] text-cyan-300 uppercase tracking-wider mb-1">預估最大波高/溯上</span>
            <span className="text-2xl font-bold text-cyan-400">{result.estimatedWaveHeight} 公尺</span>
          </div>

           {/* Recommended Seawall Height */}
          <div className="p-4 bg-slate-900/50 rounded border border-emerald-500/30">
            <span className="block text-[10px] text-emerald-300 uppercase tracking-wider mb-1">建議海堤高度</span>
            <span className="text-2xl font-bold text-white">{result.recommendedSeawallHeight} 公尺</span>
          </div>
        </div>
      </div>

      {/* Map Locations */}
      {locations.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <span className="text-xl">🌍</span> 真實案例 (Google Maps)
          </h3>
          <p className="text-xs text-slate-400 mb-3">具有類似地形特徵的沿海地區：</p>
          <ul className="space-y-2">
            {locations.map((loc, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-ocean-500 mt-1">📍</span>
                <a 
                  href={loc.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-ocean-300 hover:text-white hover:underline transition-colors"
                >
                  {loc.title || "未知地點"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
