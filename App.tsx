import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawingCanvas, DrawingCanvasRef } from './components/DrawingCanvas';
import { Button } from './components/Button';
import { LoadingSpinner } from './components/LoadingSpinner';
import { recognizeDigit } from './services/geminiService';
import { MAX_HINTS } from './constants';

type GameStatus = 'playing' | 'win' | 'lose';

const App: React.FC = () => {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [recognizedDigit, setRecognizedDigit] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [hintsGiven, setHintsGiven] = useState<number>(0);
  const [hintMessage, setHintMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<DrawingCanvasRef>(null);

  const generateTargetNumber = useCallback(() => {
    return Math.floor(Math.random() * 10); // Generates a number between 0 and 9
  }, []);

  const startNewGame = useCallback(() => {
    setTargetNumber(generateTargetNumber());
    setRecognizedDigit(null);
    setGameStatus('playing');
    setHintsGiven(0);
    setHintMessage('');
    setError(null);
    canvasRef.current?.clearCanvas();
  }, [generateTargetNumber]);

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to start the first game

  const handleGuess = async () => {
    if (!canvasRef.current || !targetNumber) return;

    setIsLoading(true);
    setError(null);
    setRecognizedDigit(null);

    try {
      const imageData = canvasRef.current.getImageData();
      if (!imageData || imageData === 'data:,') {
        throw new Error('Please draw a digit before guessing.');
      }

      const selectedApiKey = await window.aistudio.hasSelectedApiKey();
      if (!selectedApiKey) {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful, proceed.
        // The GoogleGenAI instance will be recreated with the new key in geminiService.
      }

      const recognized = await recognizeDigit(imageData);
      const parsedDigit = parseInt(recognized, 10);

      if (isNaN(parsedDigit) || parsedDigit < 0 || parsedDigit > 9) {
        throw new Error(`AI recognized: "${recognized}". Please draw a clear single digit (0-9).`);
      }

      setRecognizedDigit(parsedDigit);

      if (parsedDigit === targetNumber) {
        setGameStatus('win');
      } else {
        setGameStatus('lose');
      }
    } catch (err: any) {
      console.error("Guess error:", err);
      setError(err.message || "Failed to recognize digit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiveHint = () => {
    if (hintsGiven < MAX_HINTS && targetNumber !== null) {
      let newHint = '';
      if (hintsGiven === 0) {
        newHint = `Hint 1: The number is ${targetNumber % 2 === 0 ? 'even' : 'odd'}.`;
      } else if (hintsGiven === 1) {
        newHint = `Hint 2: The number is ${targetNumber > 4 ? 'greater than 4' : 'less than or equal to 4'}.`;
      } else if (hintsGiven === 2) {
        // Third hint: Prime or Composite
        let primeCompositeStatus;
        if (targetNumber === 0 || targetNumber === 1) {
          primeCompositeStatus = 'neither prime nor composite';
        } else if (targetNumber === 2 || targetNumber === 3 || targetNumber === 5 || targetNumber === 7) {
          primeCompositeStatus = 'a prime number';
        } else {
          primeCompositeStatus = 'a composite number';
        }
        newHint = `Hint 3: The number is ${primeCompositeStatus}.`;
      }
      setHintMessage(newHint);
      setHintsGiven(prev => prev + 1);
    }
  };

  const gameResultText = gameStatus === 'win'
    ? `You won! The number was ${targetNumber}.`
    : `You lost! The number was ${targetNumber}. You drew ${recognizedDigit !== null ? recognizedDigit : 'nothing'}.`;

  const showResult = gameStatus === 'win' || gameStatus === 'lose';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-lg shadow-xl p-6 md:p-10 w-full max-w-lg mx-auto flex flex-col items-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
          Gemini Digit Guesser
        </h1>

        <p className="text-lg md:text-xl text-gray-300 text-center">
          Draw a digit (0-9) on the canvas below. Gemini AI will try to recognize it!
        </p>
        <p className="text-sm text-gray-400 text-center">
          (Target number is hidden. You have {MAX_HINTS - hintsGiven} hints left.)
        </p>

        {error && (
          <div className="bg-red-600 bg-opacity-80 text-white p-3 rounded-md w-full text-center">
            Error: {error}
          </div>
        )}

        <div className="relative w-full aspect-square bg-gray-700 rounded-lg border-2 border-purple-500 overflow-hidden">
          <DrawingCanvas ref={canvasRef} />
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-10">
              <LoadingSpinner />
              <p className="ml-3 text-lg">Recognizing your digit...</p>
            </div>
          )}
        </div>

        {hintMessage && (
          <p className="text-yellow-300 text-md md:text-lg italic text-center animate-pulse">
            {hintMessage}
          </p>
        )}

        {showResult && (
          <div className={`p-4 rounded-lg w-full text-center text-lg md:text-xl font-semibold ${gameStatus === 'win' ? 'bg-green-600' : 'bg-red-600'}`}>
            {gameResultText}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button onClick={startNewGame} disabled={isLoading}>
            New Game
          </Button>
          <Button
            onClick={() => canvasRef.current?.clearCanvas()}
            disabled={isLoading || gameStatus !== 'playing'}
            variant="secondary"
          >
            Clear Drawing
          </Button>
          <Button
            onClick={handleGuess}
            disabled={isLoading || gameStatus !== 'playing'}
            variant="primary"
          >
            {isLoading ? 'Guessing...' : 'Guess Digit'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button
            onClick={handleGiveHint}
            disabled={isLoading || hintsGiven >= MAX_HINTS || gameStatus !== 'playing'}
            variant="tertiary"
          >
            Give Hint ({MAX_HINTS - hintsGiven} left)
          </Button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 rounded-full text-center text-sm font-semibold transition-all duration-300
                       bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75
                       flex items-center justify-center whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063 0l.041.02m-.128-6.107V4.026M13.25 11.25L12 1.5M11.25 11.25L12 1.5M12 1.5l-1.25-9.75m1.25 9.75V15M12 15h.007M12 15h-.007m-.242 2.625l-.041.02a.75.75 0 01-1.063 0l-.041-.02m.082-1.026l-.041.02a.75.75 0 01-1.063 0l-.041.02M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Billing Info
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;