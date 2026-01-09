import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

export async function recognizeDigit(base64Image: string, mode: 'draw' | 'webcam'): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!base64Image || base64Image === 'data:,') {
    throw new Error('No input data provided.');
  }

  const parts = base64Image.split(';base64,');
  if (parts.length !== 2) throw new Error('Invalid image format.');
  const mimeType = parts[0].replace('data:', '');
  const data = parts[1];

  const prompt = mode === 'draw' 
    ? "Look at this handwritten digit on a black background. Identify the single digit (0-9). Only respond with the digit itself. If unclear, say 'X'."
    : "Look at this person holding up fingers or showing a digit on paper. Identify the number (0-9) they are representing with their hand or gesture. Only respond with the digit. If unclear, say 'X'.";

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ],
      },
      config: { maxOutputTokens: 5 }
    });

    const recognizedText = response.text?.trim() || 'X';
    if (recognizedText === 'X') throw new Error('AI could not recognize the input.');
    
    const cleanMatch = recognizedText.match(/\d/);
    if (!cleanMatch) throw new Error('No digit found.');

    return cleanMatch[0];
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error(`Recognition failed: ${error.message}`);
  }
}