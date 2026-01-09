import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawingCanvas, DrawingCanvasRef } from './components/DrawingCanvas';
import { WebcamCapture, WebcamCaptureRef } from './components/WebcamCapture';
import { Button } from './components/Button';
import { LoadingSpinner } from './components/LoadingSpinner';
import { recognizeDigit } from './services/geminiService';
import { MAX_HINTS } from './constants';

type GameStatus = 'playing' | 'win' | 'lose';
type InputMode = 'draw' | 'webcam';

const App: React.FC = () => {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [recognizedDigit, setRecognizedDigit] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'win' | 'lose'>('playing');
  const [inputMode, setInputMode] = useState<InputMode>('draw');
  const [wrongGuesses, setWrongGuesses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<DrawingCanvasRef>(null);
  const webcamRef = useRef<WebcamCaptureRef>(null);

  const generateTargetNumber = useCallback(() => {
    return Math.floor(Math.random() * 10);
  }, []);

  const startNewGame = useCallback(() => {
    setTargetNumber(generateTargetNumber());
    setRecognizedDigit(null);
    setGameStatus('playing');
    setWrongGuesses(0);
    setError(null);
    canvasRef.current?.clearCanvas();
  }, [generateTargetNumber]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const getHints = () => {
    const hints = [];
    if (targetNumber === null) return [];
    
    if (wrongGuesses >= 1) {
      hints.push(`Clue 1: The number is ${targetNumber % 2 === 0 ? 'even' : 'odd'}.`);
    }
    if (wrongGuesses >= 2) {
      hints.push(`Clue 2: The number is ${targetNumber > 4 ? 'greater than 4' : 'less than or equal to 4'}.`);
    }
    if (wrongGuesses >= 3) {
      let status;
      if (targetNumber === 0 || targetNumber === 1) status = 'neither prime nor composite';
      else if ([2, 3, 5, 7].includes(targetNumber)) status = 'a prime number';
      else status = 'a composite number';
      hints.push(`Clue 3: The number is ${status}.`);
    }
    return hints;
  };

  const handleGuess = async () => {
    if (targetNumber === null) return;

    setIsLoading(true);
    setError(null);
    setRecognizedDigit(null);

    try {
      let imageData = '';
      if (inputMode === 'draw' && canvasRef.current) {
        imageData = canvasRef.current.getImageData();
      } else if (inputMode === 'webcam' && webcamRef.current) {
        imageData = webcamRef.current.takeSnapshot();
      }

      if (!imageData || imageData === 'data:,') {
        throw new Error(inputMode === 'draw' ? 'Please draw a digit first.' : 'Camera not ready.');
      }

      const recognized = await recognizeDigit(imageData, inputMode);
      const parsedDigit = parseInt(recognized, 10);

      if (isNaN(parsedDigit)) throw new Error("AI couldn't identify a digit.");

      setRecognizedDigit(parsedDigit);

      if (parsedDigit === targetNumber) {
        setGameStatus('win');
      } else {
        setWrongGuesses(prev => prev + 1);
        if (wrongGuesses + 1 >= 5) { // Game over after 5 wrong guesses
           setGameStatus('lose');
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to recognize input.");
    } finally {
      setIsLoading(false);
    }
  };

  const showResult = gameStatus === 'win' || gameStatus === 'lose';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl mx-auto flex flex-col space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            DIGIT SENSE AI
          </h1>
          <p className="text-slate-400 font-medium italic">Guess the mystery digit (0-9)</p>
        </header>

        {/* Mode Toggle */}
        <div className="flex bg-slate-700/50 p-1 rounded-xl self-center">
          <button 
            onClick={() => setInputMode('draw')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${inputMode === 'draw' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            DRAW MODE
          </button>
          <button 
            onClick={() => setInputMode('webcam')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${inputMode === 'webcam' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            GESTURE MODE
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Interaction Area */}
          <div className="flex flex-col space-y-4">
            <div className="relative aspect-square bg-black rounded-xl border-2 border-slate-600 overflow-hidden group shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              {inputMode === 'draw' ? (
                <DrawingCanvas ref={canvasRef} />
              ) : (
                <WebcamCapture ref={webcamRef} />
              )}
              
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                  <LoadingSpinner />
                  <p className="mt-4 text-cyan-400 font-bold animate-pulse">AI IS THINKING...</p>
                </div>
              )}

              {showResult && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-md ${gameStatus === 'win' ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
                  <h2 className="text-4xl font-black text-white drop-shadow-lg">{gameStatus === 'win' ? 'VICTORY!' : 'DEFEAT!'}</h2>
                  <p className="text-white font-bold mt-2">The digit was {targetNumber}</p>
                  <Button onClick={startNewGame} className="mt-4 bg-white text-slate-900 hover:bg-slate-100">Play Again</Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGuess} disabled={isLoading || showResult} className="flex-1">
                {inputMode === 'draw' ? 'Submit Drawing' : 'Capture Gesture'}
              </Button>
              {inputMode === 'draw' && (
                <Button onClick={() => canvasRef.current?.clearCanvas()} variant="secondary">Clear</Button>
              )}
            </div>
          </div>

          {/* Info & Hints Area */}
          <div className="flex flex-col space-y-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 h-full">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Clues & History</h3>
              
              <div className="space-y-3">
                {wrongGuesses === 0 && !showResult && (
                  <p className="text-slate-500 italic text-sm">Submit your first guess to reveal clues...</p>
                )}
                
                {getHints().map((hint, i) => (
                  <div key={i} className="flex items-start space-x-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-cyan-400 mt-1">✦</span>
                    <p className="text-slate-200 text-sm font-medium">{hint}</p>
                  </div>
                ))}

                {recognizedDigit !== null && !showResult && (
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Last AI Guess</p>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-black text-red-400">{recognizedDigit}</span>
                      <span className="text-slate-400 text-xs">Incorrect! Try again.</span>
                    </div>
                  </div>
                )}
                
                {!showResult && wrongGuesses > 0 && (
                  <p className="text-[10px] text-slate-600 uppercase font-bold mt-4">Tries remaining: {5 - wrongGuesses}</p>
                )}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-xs font-bold">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;