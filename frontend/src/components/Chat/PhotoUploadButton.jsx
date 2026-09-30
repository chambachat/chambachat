import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import exifr from 'exifr';

export default function PhotoUploadButton({ onPhotoSelected, disabled, isAnalyzing = false, showPill = false }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 1. Obtener ubicación de EXIF o fallback a Geolocation API
      let gpsCoords = {};
      try {
        const exifGps = await exifr.gps(file);
        if (exifGps && exifGps.latitude && exifGps.longitude) {
          gpsCoords = {
            latitud: exifGps.latitude,
            longitud: exifGps.longitude,
          };
        } else {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          gpsCoords = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          };
        }
      } catch (err) {
        console.warn("Ubicación no disponible:", err);
      }

      // 2. Comprimir imagen en canvas
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_SIZE = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = dataUrl.split(',')[1];

          if (onPhotoSelected) {
            onPhotoSelected({ imageBase64: base64, ...gpsCoords });
          }
          setIsProcessing(false);
          e.target.value = '';
        };
        img.onerror = () => {
          setIsProcessing(false);
          e.target.value = '';
        };
      };
      reader.onerror = () => {
        setIsProcessing(false);
        e.target.value = '';
      };
    } catch (err) {
      console.error("Error al procesar foto:", err);
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const busy = disabled || isProcessing || isAnalyzing;

  if (showPill) {
    return (
      <label className={`cursor-pointer inline-flex items-center bg-white pl-4 pr-1.5 py-1.5 rounded-full shadow-2xl border border-slate-200/80 gap-3 hover:bg-slate-50 transition-all ${busy ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={busy}
          className="hidden"
        />
        <span className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          {busy ? '⏳ Analizando lona...' : '📸 Cazar chamba'}
        </span>
        <div className="p-2 rounded-full bg-emerald-500 text-white shadow-sm flex items-center justify-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </div>
      </label>
    );
  }

  return (
    <label className={`cursor-pointer inline-flex items-center justify-center p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all shrink-0 ${busy ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={busy}
        className="hidden"
      />
      {busy ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Camera className="w-5 h-5" />
      )}
    </label>
  );
}
