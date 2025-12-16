
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, MapLocation, ImageResolution, LocationData } from "../types";

// Note: GoogleGenAI instance is created inside functions to ensure 
// it uses the latest API key from process.env.API_KEY

export const analyzeCoordinates = async (lat: number, lng: number): Promise<LocationData | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the geographical coordinates: ${lat}, ${lng}.
    1. Identify the specific location name (Ocean, Bay, Strait, or nearest coastal city).
    2. Determine if this exact coordinate is on LAND or WATER.
    3. If it is water, estimate the average seabed depth in meters at this location.
    4. Estimate the continental shelf slope score from 1 (Very Shallow/Gentle, like a long beach shelf) to 10 (Very Steep, like a trench or cliff drop-off).
    
    Return pure JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationName: { type: Type.STRING },
            isLand: { type: Type.BOOLEAN },
            depthMeters: { type: Type.NUMBER },
            slopeScore: { type: Type.NUMBER, description: "Score 1-10" },
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        name: data.locationName,
        lat,
        lng,
        depthMeters: data.depthMeters || 0,
        slopeScore: data.slopeScore || 5,
        isLand: data.isLand
      };
    }
    return null;
  } catch (error) {
    console.error("Coord Analysis Error:", error);
    return null;
  }
};

export const analyzeSimulation = async (
  slope: number,
  intensity: number,
  depth: number,
  locationName?: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const slopeDesc = slope < 4 ? "緩坡 (Gentle Slope)" : slope < 7 ? "中等坡度 (Moderate Slope)" : "陡坡 (Steep Slope)";
  const locContext = locationName ? `地點: ${locationName}` : "地點: 通用海岸模型";

  // Updated logic to reflect user feedback:
  // 1. Gentle slope = Higher Wave Height (Shoaling)
  // 2. Steep slope = Lower Wave Height (Reflection)
  // 3. Intensity Impact = ~30% of the variance
  const prompt = `
    你是一位海岸防災專家。請針對以下海嘯模擬情境提供一份「極簡明扼要」的關鍵報告（總字數 100 字以內）：
    - ${locContext}
    - 海底地形坡度: ${slope}/10 (${slopeDesc})
    - 離岸海底深度: ${depth} 公尺 (m)
    - 海嘯強度: ${intensity}/10

    **物理模擬邏輯 (Correct Physics)**:
    1. **坡度 (Slope)**: 這是**主要影響因子 (佔約 70% 權重)**。
       - 緩坡 (1-4): 淺化效應強，波高極高。
       - 陡坡 (7-10): 反射效應強，波高較低。
    2. **強度 (Intensity)**: 這是**次要影響因子 (佔約 30% 權重)**。
       - 強度即使很高 (10)，若遇到陡坡，波高也不應過度誇張（因為能量被反射）。
       - 強度主要影響該地形基礎波高的增幅，而非決定性數值。
    3. **數值輸出原則**: 
       - 必須嚴格遵守「緩坡波高 > 陡坡波高」的物理原則。
       - 強度的改變只會讓波高在該地形的基礎範圍內變動約 30%。

    請以條列式重點回答（繁體中文）：
    1. 🌊 **波浪動力**：描述波高變化（強調坡度為主因，強度為加成）。
    2. ⚠️ **威脅評估**：評估災害等級。
    3. 📐 **數據結論**：
       - 預估最大波高/溯上：X 公尺 (緩坡 > 陡坡，受強度影響幅度約 30%)
       - 建議海堤高度：Y 公尺 (需考慮波高與安全係數)

    **重要：請在回應的最後一行，務必依照此格式輸出兩個關鍵數字以便程式抓取：**
    DATA|WaveHeight:12.5|SeawallHeight:15.0
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response on basic analysis
      }
    });

    const text = response.text || "無法產生分析結果。";
    
    // Parse the specific data line at the end
    let recommendedSeawallHeight = 0;
    let estimatedWaveHeight = 0;

    const dataMatch = text.match(/DATA\|WaveHeight:([\d.]+)\|SeawallHeight:([\d.]+)/);
    
    if (dataMatch) {
      estimatedWaveHeight = parseFloat(dataMatch[1]);
      recommendedSeawallHeight = parseFloat(dataMatch[2]);
    } else {
      // Fallback regex if the specific format is missed
      const heightMatch = text.match(/建議.*?(\d+(\.\d+)?)\s*(公尺|m)/i);
      const waveMatch = text.match(/波高.*?(\d+(\.\d+)?)\s*(公尺|m)/i);
      recommendedSeawallHeight = heightMatch ? parseFloat(heightMatch[1]) : 0;
      estimatedWaveHeight = waveMatch ? parseFloat(waveMatch[1]) : 0;
    }

    // Remove the data line from the display markdown to keep it clean
    const cleanMarkdown = text.replace(/DATA\|WaveHeight:[\d.]+\|SeawallHeight:[\d.]+/, '').trim();

    return {
      markdown: cleanMarkdown,
      recommendedSeawallHeight,
      estimatedWaveHeight
    };
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      markdown: "分析發生錯誤，請檢查 API Key 或稍後再試。",
      recommendedSeawallHeight: 0,
      estimatedWaveHeight: 0
    };
  }
};

export const findRealWorldLocations = async (slope: number): Promise<MapLocation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const slopeType = slope < 5 ? "shallow continental shelves" : "steep coastal slopes or rias coastlines";
  const prompt = `List 3 real-world coastal locations known for tsunami risks that have ${slopeType}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const locations: MapLocation[] = [];

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
             locations.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }
    
    return locations;
  } catch (error) {
    console.error("Maps Error:", error);
    return [];
  }
};

export const generateImpactImage = async (
  slope: number,
  intensity: number,
  waveHeight: number, // Use the calculated wave height from analysis
  resolution: ImageResolution,
  locationName?: string
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const locPrompt = locationName ? `Location: Coastal area of ${locationName}.` : "Location: Coastal town.";
  let prompt = "";

  // Logic: Use the calculated Wave Height (Threat Assessment) to determine visual scale
  
  if (waveHeight < 3) {
    // Scenario: Manageable / Safe
    prompt = `A photorealistic, reassuring wide shot of a safe coastal town. 
    ${locPrompt}
    The ocean is active with high tide, about ${waveHeight} meters rise, but completely manageable. 
    A sturdy, well-engineered concrete seawall is successfully holding back the water, protecting the city behind it.
    The scene conveys safety, resilience, and effective disaster prevention infrastructure.
    Lighting is bright and hopeful, golden hour or clear day. 
    High detail, 8k resolution, cinematic composition.`;
  } else {
    // Scenario: Threat / Disaster
    const isGentle = slope < 5;
    
    // Define water behavior based on slope physics
    const waterBehavior = isGentle 
        ? `Massive Shoaling Effect: The wave forms a solid, wide 'Wall of Water' approximately ${waveHeight} meters high, overwhelming the horizon.` 
        : `Violent Reflection & Splash-up: The wave is chaotic and turbulent, crashing violently against the shore with a vertical spray height of ${waveHeight} meters, but less horizontal thickness than a shoaling wave.`;
    
    // Define severity based on height
    const severity = waveHeight > 10 
        ? "CATASTROPHIC DESTRUCTION. The water is overtopping the defense barriers significantly." 
        : "SEVERE IMPACT. The waves are hammering the seawall, creating massive spray and localized flooding.";

    prompt = `A photorealistic, cinematic shot of a tsunami impact. 
    ${locPrompt}
    ${waterBehavior}
    ${severity}
    The seawall is struggling against the force of nature.
    The scene conveys danger, power, and the specific hydraulic characteristics of a ${isGentle ? 'gentle slope (stacking wave)' : 'steep slope (crashing/reflecting wave)'}.
    Gloomy, dramatic, stormy lighting, dark atmosphere. 
    High detail, 8k resolution style.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: resolution
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
};
