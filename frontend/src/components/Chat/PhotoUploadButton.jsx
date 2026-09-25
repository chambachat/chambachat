import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

export default function PhotoUploadButton({ onPhotoSelected, disabled }) {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 1. Get location
      let gpsCoords = {};
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        gpsCoords = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        };
      } catch (err) {
        console.warn("Ubicación no disponible:", err);
      }

      // 2. Compress and resize image
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

          // Get compressed base64 (jpeg, 0.8 quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          // Remove prefix like "data:image/jpeg;base64,"
          const base64 = dataUrl.split(',')[1];

          onPhotoSelected({ imageBase64: base64, ...gpsCoords });
          setIsProcessing(false);
          // reset input
          e.target.value = '';
        };
      };
    } catch (err) {
      console.error("Error al procesar la foto:", err);
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled || isProcessing}
        onClick={handleClick}
        className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
        title="Tomar foto de vacante"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
      </button>
    </>
  );
}
