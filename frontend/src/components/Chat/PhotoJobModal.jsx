import React from 'react';
import { X } from 'lucide-react';
import PhotoJobPreview from './PhotoJobPreview';

export default function PhotoJobModal({ isOpen, onClose, extraction, onConfirm, onDiscard, isSubmitting }) {
  if (!isOpen || !extraction) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center justify-between p-3 px-4">
          <h2 className="font-bold text-gray-800 text-lg">Confirmar Vacante</h2>
          <button 
            onClick={onDiscard} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 flex justify-center">
          <PhotoJobPreview 
            extraction={extraction}
            onConfirm={onConfirm}
            onDiscard={onDiscard}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
