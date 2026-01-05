import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants'; // CRITICAL: Explicitly import

export async function recognizeDigit(base64Image: string): Promise<string> {
  // CRITICAL: Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key from the dialog.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!base64Image || base64Image === 'data:,') {
    throw new Error('No image data provided for recognition.');
  }

  // Extract mimeType and data from the base64 string
  const parts = base64Image.split(';base64,');
  if (parts.length !== 2) {
    throw new Error('Invalid base64 image format. Expected format like "data:image/png;base64,..."');
  }
  const mimeType = parts[0].replace('data:', '');
  const data = parts[1];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
          {
            text: 'What digit is drawn in this image? Respond with only the digit, e.g., \'3\'. If it\'s not a digit or unclear, respond with \'X\'.',
          },
        ],
      },
      config: {
        maxOutputTokens: 5, // Expecting a single digit or 'X'
        // Removed thinkingConfig: { thinkingBudget: 0 }, as it is not enabled for gemini-2.5-flash-image
      }
    });

    const recognizedText = response.text?.trim();

    if (!recognizedText || recognizedText === 'X') {
      throw new Error('AI could not clearly recognize a digit. Please draw more clearly.');
    }
    return recognizedText;

  } catch (error: any) {
    console.error("Gemini API error:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      // Prompt user to select API key again if it's invalid/expired
      await window.aistudio.openSelectKey();
      throw new Error("API key invalid or not found. Please select your API key again.");
    }
    throw new Error(`Error during digit recognition: ${error.message || "Unknown error"}`);
  }
}