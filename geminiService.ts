
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "./types";

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash-exp', label: 'Nano Banana (Gemini 2.0)' },
] as const;

/**
 * Gemini 2.5 Flash Image only supports specific aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9.
 * This function maps our internal target ratios to the closest supported one.
 */
const mapToSupportedRatio = (ratio: AspectRatio): string => {
  const mapping: Record<string, string> = {
    '1:1': '1:1',
    '4:5': '3:4',
    '9:16': '9:16',
    '300x250': '1:1',
    '728x90': '16:9',
    '320x100': '16:9',
    '320x50': '16:9',
    '300x600': '9:16',
    '160x600': '9:16',
    '3:4': '3:4',
    '4:3': '4:3',
    '16:9': '16:9',
    '1.91:1': '16:9',
    '2:3': '3:4',
    '1:2': '9:16',
    '21:9': '16:9',
    '3:2': '4:3',
    '5:4': '4:3',
    '2:1': '16:9',
  };
  return mapping[ratio] || '1:1';
};

export const generateAdBackground = async (
  prompt: string,
  ratio: AspectRatio,
  referenceImage?: { data: string; mimeType: string },
  model: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const parts: any[] = [
      {
        text: `Generate a high-quality advertising background. 
        STRICT RULES: 
        1. NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS.
        2. NO LOGOS, NO WATERMARKS, NO BRAND NAMES.
        3. Provide ample clear space/copy space for text to be placed later.
        4. Focus purely on the visual theme: ${prompt}.
        The image should be vibrant and professional, intended for a clean UI overlay.`,
      },
    ];

    if (referenceImage) {
      const base64Data = referenceImage.data.includes(',') 
        ? referenceImage.data.split(',')[1] 
        : referenceImage.data;
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    const apiRatio = mapToSupportedRatio(ratio);

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: apiRatio as any,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data received");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};
