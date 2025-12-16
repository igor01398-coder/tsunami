
import React, { useState, useEffect } from 'react';
import WaveSimulation from './components/WaveSimulation';
import AnalysisPanel from './components/AnalysisPanel';
import LocationPicker from './components/LocationPicker';
import SimulationHistory from './components/SimulationHistory';
import { analyzeSimulation, findRealWorldLocations } from './services/geminiService';
import { AnalysisResult, MapLocation, LocationData, SimulationRecord } from './types';

const App: React.FC = () => {
  // State
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [slope, setSlope] = useState<number>(5);
  const [intensity, setIntensity] = useState<number>(5);
  const [depth, setDepth] = useState<number>(40); // Default 40 meters
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  
  // Location State
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // History State
  const [history, setHistory] = useState<SimulationRecord[]>([]);

  useEffect(() => {
    const checkKey = async () => {
      // Check if user has already selected a key
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setApiKeyReady(true);
      }
    };
    checkKey();
  }, []);

  // Sync depth when location changes
  useEffect(() => {
    if (selectedLocation) {
      // Location data depth is in meters
      // Limit to reasonable simulation range (e.g. 10m to 80m visually)
      const depthM = Math.min(Math.max(selectedLocation.depthMeters, 10), 80);
      setDepth(depthM);
    }
  }, [selectedLocation]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      // Open selection dialog
      await (window as any).aistudio.openSelectKey();
      // Assume success and proceed to app immediately as per instructions
      setApiKeyReady(true);
    }
  };

  const handleLocationSelect = (data: LocationData) => {
    setSelectedLocation(data);
    setSlope(data.slopeScore); // Auto-set slope based on location
    setShowMap(false);
  };

  const handleRunSimulation = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLocations([]);
    
    const locationName = selectedLocation?.name || '自訂區域';

    // Parallel fetch for text/maps
    try {
      const [analysisData, mapsData] = await Promise.all([
        analyzeSimulation(slope, intensity, depth, selectedLocation?.name),
        findRealWorldLocations(slope)
      ]);
      setAnalysisResult(analysisData);
      setLocations(mapsData);

      // Add to history if successful
      if (analysisData) {
        const newRecord: SimulationRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          locationName: locationName,
          params: {
            slope,
            intensity,
            depth
          },
          result: {
            recommendedHeight: analysisData.recommendedSeawallHeight,
            waveHeight: analysisData.estimatedWaveHeight
          }
        };
        setHistory(prev => [newRecord, ...prev]);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleRestoreRecord = (record: SimulationRecord) => {
    setSlope(record.params.slope);
    setIntensity(record.params.intensity);
    setDepth(record.params.depth);
    
    // Note: We don't restore the exact location object because we only stored the name
    // So we clear the map selection but keep the params, treating it as a custom setup with those values
    // unless the name matches exactly, but simpler to treat as manual restore.
    setSelectedLocation(null); 
    
    // Optionally auto-run or just set params? Just set params is safer UX.
  };

  // Render API Key Selection Screen if not ready
  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-lg w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8 space-y-6">
          <div className="w-16 h-16 bg-ocean-500 rounded-xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-ocean-500/30">
            🌊
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">TsunamiSim</h1>
            <h2 className="text-lg text-ocean-400">Professional Research Environment</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            此應用程式使用 <strong>Gemini 2.5 Flash</strong> 進行進階物理模擬。
            為了存取這些進階模型功能，請連接您的 Google Cloud API Key。
          </p>
          
          <button
            onClick={handleSelectKey}
            className="w-full py-3.5 px-6 bg-ocean-600 hover:bg-ocean-500 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-ocean-500/25 flex items-center justify-center gap-2"
          >
            <span>🔑</span> 連接 API Key (Connect API Key)
          </button>
          
          <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
             需要協助嗎？查看 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-ocean-400 hover:underline">Billing Documentation</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-ocean-500 selection:text-white pb-12">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ocean-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-xl">
              🌊
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              TsunamiSim <span className="text-ocean-500 text-sm font-normal">Coastal Defense Analyzer</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={handleSelectKey}
               className="text-xs text-slate-400 hover:text-white transition-colors"
               title="Change API Key"
             >
               🔑 Key Config
             </button>
             <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
               Research Mode: Active
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Simulation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls */}
          <section className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🎛️</span> 模擬參數設定 (Parameters)
                </h2>
                <button 
                    onClick={() => setShowMap(true)}
                    className="text-xs flex items-center gap-1.5 bg-ocean-900/50 hover:bg-ocean-900 text-ocean-300 border border-ocean-800 px-3 py-1.5 rounded-full transition-colors"
                >
                    <span>📍</span> 從地圖選擇地點
                </button>
            </div>
            
            {/* Selected Location Info Banner */}
            {selectedLocation && (
                <div className="mb-6 bg-slate-800/50 border border-ocean-500/30 rounded-lg p-3 flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ocean-900/80 flex items-center justify-center text-lg">🗺️</div>
                        <div>
                            <div className="text-sm font-bold text-white">{selectedLocation.name}</div>
                            <div className="text-xs text-ocean-300">
                                深度: {selectedLocation.depthMeters.toFixed(1)}m | 地形斜率: {selectedLocation.slopeScore}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setSelectedLocation(null); setSlope(5); setDepth(40); }}
                        className="text-xs text-slate-500 hover:text-white px-2"
                    >
                        清除
                    </button>
                </div>
            )}
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Slope Control */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-300">海底地形斜率 (Seabed Slope)</label>
                    <span className={`text-sm font-mono ${selectedLocation ? 'text-ocean-400 font-bold' : 'text-ocean-400'}`}>
                      {slope}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={slope}
                    onChange={(e) => {
                        setSlope(parseInt(e.target.value));
                        if (selectedLocation) setSelectedLocation(null); // Clear map selection if manually adjusted
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-ocean-500 hover:accent-ocean-400 transition-all"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>平緩 (Gentle)</span>
                    <span>陡峭 (Steep)</span>
                  </div>
                </div>

                {/* Intensity Control */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-300">海嘯強度 (Intensity)</label>
                    <span className="text-sm text-danger font-mono">{intensity}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-danger hover:accent-red-400 transition-all"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>微弱 (Weak)</span>
                    <span>毀滅性 (Devastating)</span>
                  </div>
                </div>
              </div>

              {/* Depth Control - Only show slider if not map selected */}
              {!selectedLocation && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                   <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-300">海底深度 (Seabed Depth)</label>
                    <span className="text-sm text-cyan-400 font-mono">{depth} m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
                  />
                   <div className="flex justify-between text-xs text-slate-500">
                    <span>10m (淺海)</span>
                    <span>80m (深海)</span>
                  </div>
                </div>
              )}
               {/* Read-only Depth for Map Selection */}
               {selectedLocation && (
                 <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center opacity-75">
                        <label className="text-sm font-medium text-slate-300">海底深度 (Seabed Depth)</label>
                        <span className="text-sm text-cyan-400 font-mono font-bold">{depth.toFixed(1)} m</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div 
                            className="h-full bg-cyan-600/50" 
                            style={{ width: `${(depth / 80) * 100}%` }}
                        ></div>
                    </div>
                 </div>
               )}
            </div>

            <div className="mt-8">
              <button
                onClick={handleRunSimulation}
                disabled={isAnalyzing}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2
                  ${isAnalyzing 
                    ? 'bg-slate-700 cursor-not-allowed opacity-75' 
                    : 'bg-ocean-600 hover:bg-ocean-500 hover:shadow-lg hover:shadow-ocean-500/20 active:transform active:scale-[0.98]'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在運算{selectedLocation ? ` ${selectedLocation.name} ` : ''}淺化效應...
                  </>
                ) : (
                  <>▶ 執行模擬與分析 (Run Simulation)</>
                )}
              </button>
            </div>
          </section>

          {/* Visualizer */}
          <section className="bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-xl h-[400px]">
             <WaveSimulation 
               slope={slope} 
               intensity={intensity} 
               depth={depth}
               recommendedHeight={analysisResult?.recommendedSeawallHeight} 
             />
          </section>

        </div>

        {/* Right Column: Analysis & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Text Analysis */}
          <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🤖</span> Gemini 智能分析
              </h2>
            </div>
            <div className="flex-1 overflow-hidden p-4 relative">
              <AnalysisPanel isLoading={isAnalyzing} result={analysisResult} locations={locations} />
            </div>
          </section>

          {/* History Section */}
          <SimulationHistory 
            history={history} 
            onClear={() => setHistory([])}
            onRestore={handleRestoreRecord}
          />

        </div>
      </main>

      {/* Map Modal */}
      {showMap && (
        <LocationPicker 
            onSelect={handleLocationSelect} 
            onClose={() => setShowMap(false)} 
        />
      )}
    </div>
  );
};

export default App;
