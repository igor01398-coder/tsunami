
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface WaveSimulationProps {
  slope: number;
  intensity: number;
  depth: number; // in meters
  recommendedHeight?: number;
}

const WaveSimulation: React.FC<WaveSimulationProps> = ({ slope, intensity, depth, recommendedHeight }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [visualGain, setVisualGain] = useState(1.0);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const seaLevel = 200;

    // Scale slope 1-10 to angle/height coordinates
    const shoreX = width - 50;
    
    // Corrected Slope Logic:
    // Slope 1 (Gentle) -> Long horizontal run
    // Slope 10 (Steep) -> Short horizontal run
    // Adjusted range for more dramatic visual difference
    const maxRun = 500; // Very long run for gentle slope
    const minRun = 30;  // Very short run for steep slope
    
    // Calculate run based on slope (1 -> maxRun, 10 -> minRun)
    const run = maxRun - ((slope - 1) / 9) * (maxRun - minRun);
    
    // The X coordinate where the slope starts rising from the deep ocean
    const shelfKneeX = shoreX - run;
    
    // Visualize Depth
    // Map depth (10m to 80m+) to pixels
    // Visual constraints: seaLevel is 200. Max Y is 300.
    // Let's say min visual depth is 30px, max is 95px (leaving 5px buffer)
    const maxVisualDepthPx = 95;
    const minVisualDepthPx = 30;
    
    // Input depth 10m -> minVisual, 80m -> maxVisual
    const depthScale = d3.scaleLinear()
        .domain([10, 80])
        .range([minVisualDepthPx, maxVisualDepthPx])
        .clamp(true);

    const deepDepthY = seaLevel + depthScale(depth);
    const shoreDepthY = seaLevel; 
    
    // 1. Draw Sky/Background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#0f172a");

    // 2. Draw Water Body (Dynamic Surface)
    // Main deep water body
    const waterBody = svg.append("path")
      .attr("fill", "#0c4a6e"); // Ocean 900
    
    // Surface highlight/foam layer
    const waterHighlight = svg.append("path")
      .attr("fill", "rgba(56, 189, 248, 0.15)"); // Ocean 400 low opacity

    // Setup Surface Animation Timer
    const surfaceTimer = d3.timer((elapsed) => {
        const createSurfacePath = (offsetY: number, phaseShift: number) => {
            const p = d3.path();
            // Start from bottom left to fill the area
            p.moveTo(0, height);
            p.lineTo(0, seaLevel);
            
            const step = 8; // Pixel step for wave smoothness
            for (let x = 0; x <= width; x += step) {
                 // Frequencies
                 const baseFreq = 0.015;
                 const chopFreq = 0.04;
                 
                 // Dynamic Amplitude based on intensity
                 // Intensity 1 => ~1.5px (Calm)
                 // Intensity 10 => ~10px (Rough)
                 const amp = 1.5 + (intensity * 0.85);
                 
                 // Calculate Y displacement (Sine wave combination)
                 // Reduce surface chop near shore slightly for visual clarity
                 const y = seaLevel + 
                    Math.sin(x * baseFreq + elapsed * 0.0015 + phaseShift) * (amp * 0.6) + 
                    Math.cos(x * chopFreq - elapsed * 0.003) * (amp * 0.4) + 
                    offsetY;
                 
                 p.lineTo(x, y);
            }
            p.lineTo(width, height);
            p.closePath();
            return p.toString();
        };

        // Update paths
        waterBody.attr("d", createSurfacePath(0, 0));
        waterHighlight.attr("d", createSurfacePath(-3, 2)); // Slightly offset for depth
    });

    // 3. Draw Seabed
    const seabedPath = d3.path();
    seabedPath.moveTo(0, deepDepthY);
    seabedPath.lineTo(shelfKneeX, deepDepthY); // Deep ocean floor
    
    // Dynamic Curve Control
    // To create a more varied profile:
    // Gentle Slope (Low): Tension low (e.g. 0.2), control point closer to start. Rises gradually.
    // Steep Slope (High): Tension high (e.g. 0.9), control point closer to shore. Stays deep then rises sharply.
    const tension = 0.2 + ((slope - 1) / 9) * 0.7; // Maps 1->0.2, 10->0.9
    
    const cpX = shelfKneeX + (run * tension);
    const cpY = deepDepthY;
    
    seabedPath.quadraticCurveTo(cpX, cpY, shoreX, shoreDepthY);
    
    // Continue to land
    seabedPath.lineTo(shoreX + 50, shoreDepthY - 20); 
    seabedPath.lineTo(width, shoreDepthY - 20);
    seabedPath.lineTo(width, height);
    seabedPath.lineTo(0, height);
    seabedPath.closePath();

    svg.append("path")
      .attr("d", seabedPath.toString())
      .attr("class", "fill-slate-800 stroke-slate-600 stroke-[2px] transition-colors duration-300 hover:fill-slate-900 cursor-pointer");

    // Wave Animation Logic (Tsunami Packet)
    const waveGroup = svg.append("g");
    
    // Apply visual gain to the amplitude calculation
    const waveAmp = intensity * 3 * visualGain;

    // Shoaling Physics for Animation Timing
    // Calculate relative time spent in each section to simulate speed change
    const deepDist = Math.max(0, shelfKneeX);
    const slopeDist = shoreX - deepDist;
    
    // Velocity assumption: Deep = 1.0, Slope = slows down significantly
    // Simulates physics: v = sqrt(gd). As d decreases, v decreases.
    // Deep water speed reduced to 0.6 for better visualization pacing
    // Adjust speed based on depth param: deeper = faster (normalized to 40m)
    const baseSpeed = 0.6;
    const speedFactor = Math.sqrt(depth / 40); // 1.0 at 40m
    const speedDeep = baseSpeed * speedFactor; 
    const speedSlopeAvg = 0.2; // Wave moves at reduced speed on the slope (shoaling braking)
    
    // Time units required to cross each section
    const timeDeep = deepDist / speedDeep;
    const timeSlope = slopeDist / speedSlopeAvg;
    const totalTimeUnits = timeDeep + timeSlope;

    // Calculate Wave Position Helper
    const calculateWavePosition = (t: number) => {
        // Map linear time t (0-1) to physics-based position
        const currentVirtualTime = t * totalTimeUnits;
        let currentX = 0;

        if (currentVirtualTime < timeDeep) {
            // Phase 1: Deep Water (Fast Constant Speed)
            currentX = currentVirtualTime * speedDeep;
        } else {
            // Phase 2: Shoaling (Slower Speed)
            // Linear progression on slope (simulates lower avg velocity)
            const timeOnSlope = currentVirtualTime - timeDeep;
            currentX = deepDist + (timeOnSlope * speedSlopeAvg);
        }
        
        // Limit x to shore
        if (currentX > shoreX) currentX = shoreX;

        // Shoaling Effect Calculation (Height)
        let currentDepthRatio = 1;
        
        if (currentX > shelfKneeX) {
           const progressOnSlope = (currentX - shelfKneeX) / (shoreX - shelfKneeX);
           
           // Sync physics with visual curve
           const power = 1 + (tension * 1.5);
           const adjustedProgress = Math.pow(progressOnSlope, power);

           currentDepthRatio = 1 - adjustedProgress; 
           if (currentDepthRatio < 0.1) currentDepthRatio = 0.1;
        }

        // Green's law: Height ~ depth^(-1/4)
        let shoalingFactor = Math.pow(1/currentDepthRatio, 0.25);

        // PHYSICS CORRECTION: Steep slopes don't allow time for height to stack
        if (slope > 6) {
           // Reduce shoaling effect on steep slopes
           // Map slope 7-10 to a reduction factor
           const steepFactor = (slope - 6) * 0.15; // 0.15, 0.30, 0.45, 0.60 reduction
           shoalingFactor = shoalingFactor * (1 - steepFactor);
        }

        const currentHeight = waveAmp * shoalingFactor;

        return { currentX, currentHeight };
    };

    // Animate a wave packet
    const animateWave = () => {
      if (waveGroup.empty()) return;
      
      const wavePath = waveGroup.append("path")
        .attr("fill", "rgba(56, 189, 248, 0.6)")
        .attr("stroke", "#38bdf8")
        .attr("stroke-width", 2);

      // Shared transition for sync
      const t = d3.transition().duration(5000).ease(d3.easeLinear);

      wavePath.transition(t)
        .attrTween("d", () => {
          return (time: number) => {
            const { currentX, currentHeight } = calculateWavePosition(time);
            
            const w = 40 + (intensity * 2); // Wave width
            const path = d3.path();
            path.moveTo(currentX - w, seaLevel);
            path.quadraticCurveTo(currentX, seaLevel - currentHeight * 2, currentX + w, seaLevel);
            path.closePath();
            return path.toString();
          };
        })
        .on("end", () => {
          wavePath.remove();
          animateWave();
        });
    };

    // Start loop
    animateWave();
    
    // Draw Seawall
    // Scale: 1 meter = 4 pixels
    const seawallPixelHeight = recommendedHeight && recommendedHeight > 0 
      ? recommendedHeight * 5 
      : 30; // Default
    
    const seawallColor = recommendedHeight && recommendedHeight > 0 
      ? "#10b981" 
      : "#64748b";

    const seawallGroup = svg.append("g");

    seawallGroup.append("rect")
      .attr("x", shoreX)
      .attr("y", seaLevel - seawallPixelHeight)
      .attr("width", 10)
      .attr("height", seawallPixelHeight)
      .attr("fill", seawallColor)
      .attr("stroke", recommendedHeight ? "#064e3b" : "none")
      .attr("stroke-width", 1)
      .attr("rx", 2);
      
    if (recommendedHeight && recommendedHeight > 0) {
        // Height marker
        seawallGroup.append("line")
            .attr("x1", shoreX - 40)
            .attr("x2", shoreX + 20)
            .attr("y1", seaLevel - seawallPixelHeight)
            .attr("y2", seaLevel - seawallPixelHeight)
            .attr("stroke", "#10b981")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2");
            
        seawallGroup.append("text")
            .attr("x", shoreX - 45)
            .attr("y", seaLevel - seawallPixelHeight + 4)
            .text(`${recommendedHeight}m`)
            .attr("fill", "#10b981")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("text-anchor", "end")
            .attr("alignment-baseline", "middle");
    } else {
        seawallGroup.append("text")
        .attr("x", 15)
        .attr("y", 30)
        .attr("fill", "rgba(255,255,255,0.5)")
        .text(`Slope: ${slope} (${slope < 5 ? 'Gentle' : 'Steep'}) | Depth: ${depth}m`)
        .attr("font-size", "12px");
    }

    // CLEANUP
    return () => {
        surfaceTimer.stop();
        svg.selectAll("*").interrupt();
    };

  }, [slope, intensity, depth, recommendedHeight, visualGain]);

  return (
    <div className="w-full h-full overflow-hidden rounded-lg bg-slate-900 border border-slate-700 shadow-inner relative group">
      <svg ref={svgRef} viewBox="0 0 600 300" className="w-full h-full preserve-3d" />
      
      {/* Visual Gain Control Slider */}
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 flex flex-col items-end gap-1 z-10 transition-opacity opacity-50 hover:opacity-100">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Visual Height</label>
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">x0.5</span>
            <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={visualGain}
                onChange={(e) => setVisualGain(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-ocean-500 hover:accent-ocean-400"
            />
            <span className="text-xs text-ocean-400 font-mono w-8 text-right">x{visualGain.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export default WaveSimulation;
