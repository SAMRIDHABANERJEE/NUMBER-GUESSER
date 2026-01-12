import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export interface WebcamCaptureRef {
  takeSnapshot: () => string;
}

interface WebcamCaptureProps {
  setError: (error: string | null) => void;
}

const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>(({ setError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let timeoutId: number;

    async function setupCamera() {
      setCameraStatus('loading');
      setError(null); // Clear any previous errors
      try {
        // Set a timeout for camera initialization
        timeoutId = setTimeout(() => {
          setCameraStatus('error');
          setError("Camera startup timed out. Please check your camera connection or permissions.");
        }, 10000); // 10 seconds timeout

        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        clearTimeout(timeoutId); // Clear timeout on success
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setCameraStatus('ready');
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId); // Clear timeout on error
        setCameraStatus('error');
        if (err.name === 'NotAllowedError') {
          setError("Camera access denied. Please allow camera permissions in your browser settings.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera found. Please ensure a webcam is connected and enabled.");
        } else {
          setError(`Camera error: ${err.message || "Unknown error occurred."}`);
        }
        console.error("Camera access error:", err);
      }
    }
    setupCamera();

    return () => {
      clearTimeout(timeoutId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [setError]);

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && cameraStatus === 'ready') {
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
      setError("Camera not ready or failed to capture.");
      return 'data:,';
    }
  }));

  if (cameraStatus === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-center p-4 bg-slate-900 space-y-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75A2.25 2.25 0 0016.5 16.5V7.5A2.25 2.25 0 0014.25 5.25H4.5A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
        </svg>
        <p className="text-sm font-semibold">Camera unavailable</p> {/* Generic message within component */}
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