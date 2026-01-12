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
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let timeoutId: number;
    let isMounted = true; // Flag to track if the component is mounted

    const enumerateCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        if (isMounted) {
          setHasMultipleCameras(videoInputs.length > 1);
        }
      } catch (e) {
        console.error("Error enumerating devices:", e);
        if (isMounted) {
          setHasMultipleCameras(false); // Assume no multiple cameras if error
        }
      }
    };
    enumerateCameras(); // Run once on mount to detect cameras


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
          video: { facingMode: currentFacingMode, width: 640, height: 480 } 
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
          // This specific error might occur if 'environment' facingMode is requested but not available.
          // In this case, we might want to try 'user' if currently 'environment'.
          if (err.message.includes('facingMode') && currentFacingMode === 'environment') {
            console.warn("Requested 'environment' camera not found, attempting 'user' camera.");
            // We can't directly retry with a different mode here without re-triggering the effect
            // A simple retry will just re-attempt with 'environment'.
            // For now, let's just log and show a generic error, and the user can retry.
            setError("Requested camera mode not available. Try another camera or adjust permissions.");
          } else {
            setError("Camera capabilities do not match requested constraints. Try a different camera.");
          }
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
  }, [retryCount, setError, currentFacingMode]); // Rerun effect when retryCount increments, setError changes, or currentFacingMode changes

  const toggleCamera = () => {
    setCurrentFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
    setRetryCount(prev => prev + 1); // Force a camera restart
  };

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && cameraStatus === 'ready' && currentStream) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
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
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white uppercase font-bold border border-white/20">
        Live Feed
      </div>

      {hasMultipleCameras && cameraStatus === 'ready' && (
        <button
          onClick={toggleCamera}
          className="absolute bottom-4 right-4 p-3 bg-slate-800/70 hover:bg-slate-700/80 text-white rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={currentFacingMode === 'user' ? "Switch to back camera" : "Switch to front camera"}
        >
          {/* Camera rotation icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181-3.181m0-4.991l-3.181-3.181A1.125 1.125 0 015.153 2.92h5.842a1.125 1.125 0 011.066.75l1.519 4.674m-6.6 0H9.75M7.21 12.536L7.21 12.536M11.52 7.21h2.89a1.125 1.125 0 011.065.75l1.519 4.674m-6.6 0h4.606m-1.226 2.016l.123.085.022.016.035.019c.141.085.27.21.364.38.083.141.15.277.203.359.043.067.091.135.132.207l.035.019.022.016.123.085v0l.114.076.014.008.022.012h0v0l.114.076c.074.049.118.08.152.08H21a.75.75 0 00.75-.75V5.115a.75.75 0 00-.75-.75h-5.843a1.125 1.125 0 00-1.066.75l-.412 1.25m-14.88 0h9.75M3.21 19.644A.75.75 0 002.46 20.394h-.001c.224 0 .4-.18.4-.403l0-.088c0-.065-.004-.124-.01-.183-.016-.145-.045-.29-.082-.435a.897.897 0 00-.097-.24l-.071-.133c-.027-.052-.045-.106-.062-.16a1.132 1.132 0 00-.14-.294l-.066-.123c-.035-.064-.067-.13-.09-.204a.972.972 0 00-.098-.291l-.05-.152A.75.75 0 002.46 16.75h-.001c-.224 0-.4.18-.4.403l0 .088c0 .065.004.124.01.183.016.145.045.29.082.435.03.14.07.273.121.4.051.128.115.25.195.363l.081.117.062.091.047.073.04.06.012.018.02.029.02.029.01.009.021.018.021.019.02.016.014.013.013.011.01.006.008.005h0c.005.003.006.004.007.004L3.21 19.644z" />
          </svg>
        </button>
      )}
    </div>
  );
});

WebcamCapture.displayName = 'WebcamCapture';

export { WebcamCapture };