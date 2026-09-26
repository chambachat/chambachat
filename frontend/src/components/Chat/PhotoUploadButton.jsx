import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

export default function PhotoUploadButton({ onPhotoSelected, disabled }) {
  const [isProcessing, setIsProcessing] = useState(false);

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

  const [showMenu, setShowMenu] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Cerrar menú al hacer clic fuera (opcional, pero con onBlur del botón suele bastar, o manejándolo simple)
  
  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {showMenu && (
        <div className="absolute bottom-12 left-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
          <button 
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-100"
            onClick={() => { setShowMenu(false); cameraInputRef.current?.click(); }}
          >
            📸 Tomar Foto
          </button>
          <button 
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2"
            onClick={() => { setShowMenu(false); galleryInputRef.current?.click(); }}
          >
            🖼️ Elegir del Carrete
          </button>
        </div>
      )}

      {showMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

      <button
        type="button"
        disabled={disabled || isProcessing}
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0 relative z-50"
        title="Subir foto de vacante"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
