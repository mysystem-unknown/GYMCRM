'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  currentImageUrl?: string;
  memberId: string;
  memberName: string;
  onUploaded?: (url: string) => void;
  onRemoved?: () => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUpload({
  currentImageUrl,
  memberId,
  memberName,
  onUploaded,
  onRemoved,
  size = 'md',
  readOnly = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the popup menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // ---------- Upload logic ----------
  const uploadFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File size exceeds 5 MB limit.');
        return;
      }

      setUploading(true);
      setShowMenu(false);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('memberId', memberId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        // Safe JSON parsing — only call .json() when content-type is application/json
        let data: Record<string, unknown>;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Server returned non-JSON response (HTTP ${res.status}). Please try again.`);
        }
        data = await res.json();

        if (!res.ok) {
          throw new Error((data.error as string) || `Upload failed (${res.status})`);
        }

        const imageUrl = (data.imageUrl as string) || '';
        if (!imageUrl) {
          throw new Error('Upload succeeded but server did not return an image URL.');
        }

        toast.success('Photo updated');
        onUploaded?.(imageUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [memberId, onUploaded],
  );

  // ---------- File picker ----------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- Drag & drop ----------
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // ---------- Camera ----------
  const startCamera = async () => {
    setShowMenu(false);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error('Camera access denied. Please allow camera permissions.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          uploadFile(file);
        }
        stopCamera();
      },
      'image/jpeg',
      0.85,
    );
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // ---------- Remove ----------
  const handleRemove = async () => {
    setShowMenu(false);
    try {
      const res = await fetch(`/api/upload?memberId=${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        let errorMsg = 'Failed to remove photo';
        try {
          const data = await res.json();
          errorMsg = (data.error as string) || errorMsg;
        } catch {
          // non-JSON response
        }
        throw new Error(errorMsg);
      }

      toast.success('Photo removed');
      onRemoved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove photo');
    }
  };

  // ---------- Render ----------
  const initials = memberName?.charAt(0)?.toUpperCase() || 'M';

  return (
    <>
      <div className="relative" onDrop={handleDrop} onDragOver={handleDragOver}>
        <Avatar className={`${sizeClasses[size]} ring-2 ring-emerald-500/20`}>
          {currentImageUrl ? (
            <AvatarImage src={currentImageUrl} alt={memberName} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-emerald-600 text-white font-semibold">{initials}</AvatarFallback>
        </Avatar>

        {/* Loading overlay */}
        {uploading && (
          <div
            className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center ${sizeClasses[size]}`}
          >
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}

        {/* Camera / upload button + popup menu */}
        {!readOnly && !uploading && (
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md"
              onClick={() => setShowMenu((v) => !v)}
            >
              <Camera className="w-3.5 h-3.5" />
            </Button>

            {showMenu && (
              <div className="absolute bottom-8 right-0 z-50 w-40 bg-popover border rounded-lg shadow-lg py-1">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 text-left"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Photo
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 text-left"
                  onClick={startCamera}
                >
                  <Camera className="w-3.5 h-3.5" /> Take Photo
                </button>
                {currentImageUrl && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 text-left text-red-600"
                    onClick={handleRemove}
                  >
                    <X className="w-3.5 h-3.5" /> Remove Photo
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Full-screen camera overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl overflow-hidden shadow-xl max-w-md w-full">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex items-center justify-between p-4 gap-3">
              <Button type="button" variant="outline" onClick={stopCamera} className="flex-1">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Camera className="w-4 h-4 mr-2" /> Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
