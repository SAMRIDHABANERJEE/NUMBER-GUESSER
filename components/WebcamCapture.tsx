import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';

export interface WebcamCaptureRef {
  takeSnapshot: () => string;
}

interface WebcamCaptureProps {
  setError: (error: string | null) => void;
}

const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>(({ setError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Renamed to currentStream to avoid potential naming conflicts and clarify its role as the active stream.
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let timeoutId: number;
    let isMounted = true; // Flag to track if the component is mounted

    const startCamera = async () => {
      if (!isMounted) return; // Prevent execution if component has unmounted

      setCameraStatus('loading');
      setError(null);

      // Stop any existing stream before attempting to start a new one
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
      }
      
      try {
        timeoutId = window.setTimeout(() => {
          if (isMounted) {
            setCameraStatus('error');
            setError("Camera startup timed out. Please check your camera connection or permissions.");
          }
        }, 10000); // 10 seconds timeout

        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });

        // If component unmounted during the async getUserMedia call
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        clearTimeout(timeoutId); // Clear timeout on successful stream acquisition
        activeStream = mediaStream; // Keep a local reference for cleanup
        setCurrentStream(mediaStream); // Update state

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = async () => {
            if (!isMounted) return; // Prevent state update if unmounted
            try {
              await videoRef.current?.play();
              if (isMounted) {
                setCameraStatus('ready');
              }
            } catch (playError: any) {
              // Handle potential play() errors (e.g., user gesture required by browser)
              console.warn("Video play() failed, likely due to browser autoplay policy:", playError);
              if (isMounted) {
                setCameraStatus('ready'); // Still mark as ready if srcObject is set, but with a warning.
              }
            }
          };
        }
      } catch (err: any) {
        if (!isMounted) return; // Prevent state update if unmounted
        clearTimeout(timeoutId); // Clear timeout on error
        setCameraStatus('error');
        if (err.name === 'NotAllowedError') {
          setError("Camera access denied. Please allow camera permissions in your browser settings.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera found. Please ensure a webcam is connected and enabled.");
        } else if (err.name === 'NotReadableError') {
          setError("Camera is in use by another application or not accessible.");
        } else if (err.name === 'OverconstrainedError') {
          setError("Camera capabilities do not match requested constraints. Try a different camera.");
        } else if (err.name === 'AbortError') {
          setError("Camera setup was aborted. This might happen if you quickly deny and re-grant permissions, or if the device is busy.");
        } else {
          setError(`Camera error: ${err.message || "Unknown error occurred."}`);
        }
        console.error("Camera access error:", err.name, err.message);
      }
    };

    startCamera();

    return () => {
      isMounted = false; // Mark component as unmounted
      clearTimeout(timeoutId); // Clear any pending timeout
      // Cleanup: stop stream tracks when component unmounts or effect re-runs
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setCurrentStream(null); // Clear the state reference to the stream
    };
  }, [retryCount, setError]); // Rerun effect when retryCount increments or setError changes

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && cameraStatus === 'ready' && currentStream) { // Also check if currentStream exists
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          // Flip horizontally for natural mirror effect
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      setError("Camera not ready or failed to capture. Please ensure camera is active and running.");
      return 'data:,';
    }
  }));

  if (cameraStatus === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-center p-4 bg-slate-900 space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75A2.25 2.25 0 0016.5 16.5V7.5A2.25 2.25 0 0014.25 5.25H4.5A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
        </svg>
        <p className="text-sm font-semibold">Camera unavailable</p>
        <Button onClick={() => setRetryCount(prev => prev + 1)} variant="primary" className="mt-4 px-8 py-2 text-sm">
          Retry Camera
        </Button>
      </div>
    );
  }

  if (cameraStatus === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-cyan-400 space-y-3">
        <LoadingSpinner />
        <p className="text-sm font-bold animate-pulse">Starting camera...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white uppercase font-bold border border-white/20">
        Live Feed
      </div>
    </div>
  );
});

WebcamCapture.displayName = 'WebcamCapture';

export { WebcamCapture };