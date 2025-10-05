import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { supabase } from '@/integrations/supabase/client';

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startScanning();
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const startScanning = () => {
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setScanning(true);

    reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result, error) => {
        if (result) {
          const qrData = result.getText();
          await handleScan(qrData);
        }
        if (error && !(error.name === 'NotFoundException')) {
          console.error('Scan error:', error);
        }
      }
    );
  };

  const handleScan = async (data: string) => {
    try {
      setScanning(false);
      
      // Get location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Parse QR data (assuming format: sessionId)
      const sessionId = data;

      // Record attendance
      const { error: dbError } = await supabase
        .from('attendance')
        .insert({
          session_id: sessionId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          scanned_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setSuccess('Attendance marked successfully!');
      setTimeout(() => {
        setSuccess('');
        setScanning(true);
        startScanning();
      }, 2000);
    } catch (err) {
      setError('Failed to mark attendance. Please try again.');
      console.error('Attendance error:', err);
      setTimeout(() => {
        setError('');
        setScanning(true);
        startScanning();
      }, 2000);
    }
  };

  const stopCamera = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">QR Scanner</h1>
        
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {scanning && (
            <div className="absolute inset-0 border-4 border-accent/50 animate-pulse" />
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="text-center text-sm text-foreground/60">
          {scanning ? 'Scanning for QR code...' : 'Processing...'}
        </div>
      </div>
    </div>
  );
}
