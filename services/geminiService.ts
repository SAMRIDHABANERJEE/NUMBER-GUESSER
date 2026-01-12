import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME, MAX_RETRIES, INITIAL_RETRY_DELAY_MS } from '../constants';

export async function recognizeDigit(base64Image: string, mode: 'draw' | 'webcam'): Promise<string> {
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

  let retries = 0;
  let delay = INITIAL_RETRY_DELAY_MS;

  while (retries <= MAX_RETRIES) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Create new instance for potentially updated API key
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
      const errorMessage = error.message || String(error);

      // Check for 429 status or explicit quota exceeded messages
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("API quota exceeded") ||
                           errorMessage.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError && retries < MAX_RETRIES) {
        retries++;
        console.warn(`API Quota Exceeded. Retrying in ${delay / 1000} seconds... (Attempt ${retries}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        if (isQuotaError) {
          throw new Error("API Quota Exceeded. Please try again later. If this persists, check your billing settings on Google Cloud.");
        }
        throw new Error(errorMessage || "Recognition failed.");
      }
    }
  }
  // Should ideally not reach here if MAX_RETRIES is handled correctly within the loop,
  // but as a fallback.
  throw new Error("Failed to recognize digit after multiple retries. API may be unavailable.");
}