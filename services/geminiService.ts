import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

export async function recognizeDigit(base64Image: string, mode: 'draw' | 'webcam'): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!base64Image || base64Image === 'data:,') {
    throw new Error('Please provide an input first.');
  }

  const parts = base64Image.split(';base64,');
  if (parts.length !== 2) throw new Error('Invalid image format.');
  const mimeType = parts[0].replace('data:', '');
  const data = parts[1];

  const prompt = mode === 'draw' 
    ? "This is a drawing of a single digit (0-9) on a black background. Identify the digit. Return ONLY the digit itself."
    : "The image shows a person making a hand gesture or holding a digit. Identify the single digit (0-9) represented. Return ONLY the digit itself.";

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ],
      },
      config: { 
        temperature: 0.1,
        maxOutputTokens: 5 
      }
    });

    const recognizedText = response.text?.trim() || 'X';
    const match = recognizedText.match(/\d/);
    
    if (!match) {
      throw new Error('AI could not identify a clear digit. Please try again.');
    }

    return match[0];
  } catch (error: any) {
    console.error("Gemini API error:", error);
    if (error.message?.includes("429")) {
      throw new Error("API Quota exceeded. Please try again in a few seconds.");
    }
    throw new Error(error.message || "Recognition failed.");
  }
}