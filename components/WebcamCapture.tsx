import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';

export interface WebcamCaptureRef {
  takeSnapshot: () => string;
}

const WebcamCapture = forwardRef<WebcamCaptureRef, {}>((_props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera access denied. Please enable permissions.");
      }
    }
    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
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
      return '';
    }
  }));

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-center p-4 bg-slate-900">
        <p>{error}</p>
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