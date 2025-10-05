import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StudentNav from '@/components/StudentNav';

export default function Scanner() {
  const navigate = useNavigate();
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
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data)) {
        throw new Error('Invalid QR code format');
      }

      const sessionId = data;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify session exists, is active, and user is enrolled
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, is_active, expires_at, location_required, location_latitude, location_longitude, location_radius')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      if (!session.is_active || new Date(session.expires_at) < new Date()) {
        throw new Error('Session has expired');
      }

      // Verify student is enrolled in the class
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('class_id', session.class_id)
        .maybeSingle();

      if (enrollmentError || !enrollment) {
        throw new Error('You are not enrolled in this class');
      }

      // Get location if required
      let locationVerified = false;
      let position: GeolocationPosition | null = null;

      if (session.location_required) {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        // Calculate distance using Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (session.location_latitude || 0) * Math.PI / 180;
        const φ2 = position.coords.latitude * Math.PI / 180;
        const Δφ = (position.coords.latitude - (session.location_latitude || 0)) * Math.PI / 180;
        const Δλ = (position.coords.longitude - (session.location_longitude || 0)) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance > (session.location_radius || 100)) {
          throw new Error('You are outside the allowed location');
        }

        locationVerified = true;
      }

      // Record attendance with validated data
      const { error: dbError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: user.id,
          location_verified: locationVerified,
          device_info: navigator.userAgent
        });

      if (dbError) throw dbError;

      setSuccess('Attendance marked successfully!');
      setTimeout(() => {
        setSuccess('');
        setScanning(true);
        startScanning();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance. Please try again.');
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
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-2 hover:bg-card rounded-lg"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Scan QR Code</h1>
        </div>
        
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
      
      <StudentNav />
    </div>
  );
}
