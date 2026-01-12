import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawingCanvas, DrawingCanvasRef } from './components/DrawingCanvas';
import { WebcamCapture, WebcamCaptureRef } from './components/WebcamCapture';
import { Button } from './components/Button';
import { LoadingSpinner } from './components/LoadingSpinner';
import { recognizeDigit } from './services/geminiService';

type GameStatus = 'playing' | 'win' | 'lose';
type InputMode = 'draw' | 'webcam';

const App: React.FC = () => {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [recognizedDigit, setRecognizedDigit] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [inputMode, setInputMode] = useState<InputMode>('draw');
  const [wrongGuesses, setWrongGuesses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<DrawingCanvasRef>(null);
  const webcamRef = useRef<WebcamCaptureRef>(null);

  const startNewGame = useCallback(() => {
    setTargetNumber(Math.floor(Math.random() * 10));
    setRecognizedDigit(null);
    setGameStatus('playing');
    setWrongGuesses(0);
    setError(null);
    canvasRef.current?.clearCanvas();
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const getHints = () => {
    if (targetNumber === null) return [];
    const hints = [];
    if (wrongGuesses >= 1) hints.push(`The number is ${targetNumber % 2 === 0 ? 'EVEN' : 'ODD'}.`);
    if (wrongGuesses >= 2) hints.push(`The number is ${targetNumber > 4 ? 'GREATER than 4' : '4 or LESS'}.`);
    if (wrongGuesses >= 3) {
      const isPrime = [2, 3, 5, 7].includes(targetNumber);
      hints.push(`The number is ${isPrime ? 'PRIME' : (targetNumber < 2 ? 'NEITHER prime nor composite' : 'COMPOSITE')}.`);
    }
    return hints;
  };

  const handleGuess = async () => {
    if (targetNumber === null) return;

    setIsLoading(true);
    setError(null);

    try {
      let imageData = '';
      if (inputMode === 'draw' && canvasRef.current) {
        imageData = canvasRef.current.getImageData();
      } else if (inputMode === 'webcam' && webcamRef.current) {
        imageData = webcamRef.current.takeSnapshot();
      }

      if (!imageData || imageData === 'data:,') {
        throw new Error('No input provided. Please draw a digit or capture an image.');
      }

      const recognized = await recognizeDigit(imageData, inputMode);
      const parsedDigit = parseInt(recognized, 10);

      setRecognizedDigit(parsedDigit);

      if (parsedDigit === targetNumber) {
        setGameStatus('win');
      } else {
        setWrongGuesses(prev => prev + 1);
        if (wrongGuesses + 1 >= 5) setGameStatus('lose');
      }
    } catch (err: any) {
      setError(err.message || "Failed to recognize input.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl mx-auto flex flex-col space-y-6">
        
        <header className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            DIGIT SENSE AI
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Guess the hidden number</p>
        </header>

        <div className="flex bg-slate-800 p-1 rounded-xl self-center border border-slate-700">
          <button 
            onClick={() => setInputMode('draw')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${inputMode === 'draw' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            disabled={isLoading}
          >
            DRAWING
          </button>
          <button 
            onClick={() => setInputMode('webcam')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${inputMode === 'webcam' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            disabled={isLoading}
          >
            WEBCAM
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            <div className="relative aspect-square bg-black rounded-2xl border-2 border-slate-700 overflow-hidden shadow-2xl group">
              {inputMode === 'draw' ? (
                <DrawingCanvas ref={canvasRef} />
              ) : (
                <WebcamCapture ref={webcamRef} setError={setError} />
              )}
              
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                  <LoadingSpinner />
                  <p className="mt-4 text-cyan-400 font-black text-sm animate-pulse">AI IS ANALYZING...</p>
                </div>
              )}

              {gameStatus !== 'playing' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 backdrop-blur-md animate-in fade-in zoom-in duration-300 ${gameStatus === 'win' ? 'bg-emerald-600/90' : 'bg-rose-600/90'}`}>
                  <h2 className="text-5xl font-black text-white">{gameStatus === 'win' ? 'WIN!' : 'LOSE!'}</h2>
                  <p className="text-white font-bold text-xl mt-2">The number was {targetNumber}</p>
                  <Button onClick={startNewGame} className="mt-8 bg-white text-slate-950 hover:bg-slate-100 border-none">PLAY AGAIN</Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGuess} disabled={isLoading || gameStatus !== 'playing' || !!error} className="flex-1">
                {inputMode === 'draw' ? 'SUBMIT GUESS' : 'CAPTURE GESTURE'}
              </Button>
              {inputMode === 'draw' && (
                <Button onClick={() => canvasRef.current?.clearCanvas()} variant="secondary" className="px-4" disabled={isLoading || gameStatus !== 'playing' || !!error}>
                  RESET
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl h-full flex flex-col">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Clue Tracker</h3>
              
              <div className="flex-1 space-y-4">
                {wrongGuesses === 0 && gameStatus === 'playing' ? (
                  <p className="text-slate-600 text-sm italic">Submit your first guess to reveal hidden clues about the digit.</p>
                ) : (
                  <div className="space-y-3">
                    {getHints().map((hint, i) => (
                      <div key={i} className="flex items-start space-x-2 animate-in slide-in-from-right duration-300">
                        <span className="text-cyan-500 text-xl">✦</span>
                        <p className="text-slate-300 text-sm font-bold uppercase tracking-tight leading-tight">{hint}</p>
                      </div>
                    ))}
                  </div>
                )}

                {recognizedDigit !== null && gameStatus === 'playing' && (
                  <div className="pt-6 mt-4 border-t border-slate-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] text-slate-600 font-black uppercase mb-1">AI Detected</p>
                        <span className="text-4xl font-black text-rose-400">{recognizedDigit}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Status</p>
                        <span className="text-xs font-bold text-rose-500">WRONG</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {gameStatus === 'playing' && wrongGuesses > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-[10px] text-slate-600 font-black uppercase">Tries Left</p>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < (5 - wrongGuesses) ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm font-bold flex items-center space-x-3">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;