import React, { useEffect, useRef, useState } from 'react';
import { analyzeCoordinates } from '../services/geminiService';
import { LocationData } from '../types';

interface LocationPickerProps {
  onSelect: (data: LocationData) => void;
  onClose: () => void;
}

declare const L: any;

const LocationPicker: React.FC<LocationPickerProps> = ({ onSelect, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analyzedLocation, setAnalyzedLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    // Prevent double initialization in React Strict Mode
    if (mapInstanceRef.current) return;

    // Initialize Map
    // Ensure zoom controls are enabled
    const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
    }).setView([23.5, 121], 6);

    // Add attribution to bottom right
    L.control.attribution({position: 'bottomright'}).addTo(map);

    mapInstanceRef.current = map;

    // Dark Mode Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Try to locate user
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos: any) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 8);
        });
    }

    // Click Handler
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;

      // Update marker position
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      // Reset state for new analysis
      setAnalyzing(true);
      setErrorMsg(null);
      setAnalyzedLocation(null);
      
      try {
        const data = await analyzeCoordinates(lat, lng);
        
        if (!data) {
          setErrorMsg("無法分析此地點，請重試。");
          setAnalyzing(false);
          return;
        }

        if (data.isLand) {
          setErrorMsg(`❌ 錯誤：${data.name || '此地點'} 位於陸地。請點擊海洋或沿岸區域。`);
          setAnalyzing(false);
          return;
        }

        // Set analyzed data to show in info box
        setAnalyzedLocation(data);

      } catch (err) {
        setErrorMsg("連線錯誤");
      } finally {
        setAnalyzing(false);
      }
    });

    return () => {
       // Cleanup if component unmounts
       if (mapInstanceRef.current) {
           mapInstanceRef.current.remove();
           mapInstanceRef.current = null;
       }
    };
  }, []);

  const handleConfirmSelection = () => {
      if (analyzedLocation) {
          onSelect(analyzedLocation);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-10">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="text-ocean-400">📍</span> 選擇海洋位置 (Select Ocean Location)
            </h2>
            <p className="text-xs text-slate-400">使用滾輪縮放地圖，點擊選擇海洋區域進行分析</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕ 關閉
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="flex-1 bg-slate-950 relative z-0" />

        {/* Info Overlay Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none flex justify-center z-20">
            
            {/* Loading Indicator */}
            {analyzing && (
              <div className="bg-slate-900/90 backdrop-blur border border-ocean-500/50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 pointer-events-auto">
                <div className="w-5 h-5 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <div className="text-white font-medium">分析海域數據中...</div>
                  <div className="text-xs text-ocean-300">正在計算海底深度與坡度模型</div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {!analyzing && errorMsg && (
              <div className="bg-slate-900/90 backdrop-blur border border-red-500/50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto">
                 <span className="text-red-500 text-xl">⚠</span>
                 <span className="text-slate-200">{errorMsg}</span>
              </div>
            )}

            {/* Success Info Box */}
            {!analyzing && analyzedLocation && (
              <div className="bg-slate-900/95 backdrop-blur border border-emerald-500/30 p-6 rounded-xl shadow-2xl pointer-events-auto w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              📍 {analyzedLocation.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">地理位置分析完成</p>
                      </div>
                      <div className="text-right">
                          <div className="text-xs text-slate-500 font-mono">座標</div>
                          <div className="text-xs text-emerald-400 font-mono">
                              {analyzedLocation.lat.toFixed(2)}, {analyzedLocation.lng.toFixed(2)}
                          </div>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                          <div className="text-xs text-slate-400 mb-1">預估平均深度</div>
                          <div className="text-2xl font-bold text-ocean-300">{analyzedLocation.depthMeters}m</div>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                          <div className="text-xs text-slate-400 mb-1">地形坡度指標</div>
                          <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-bold text-emerald-400">{analyzedLocation.slopeScore}</span>
                             <span className="text-sm text-slate-500">/10</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setAnalyzedLocation(null)}
                          className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
                      >
                          重新選擇
                      </button>
                      <button 
                          onClick={handleConfirmSelection}
                          className="flex-[2] py-3 px-4 bg-ocean-600 hover:bg-ocean-500 text-white font-bold rounded-lg shadow-lg shadow-ocean-500/20 transition-all transform hover:scale-[1.02]"
                      >
                          確認套用此地點
                      </button>
                  </div>
              </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default LocationPicker;