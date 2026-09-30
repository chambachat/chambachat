import { useState } from 'react';
import { analyzeJobPhoto, confirmPhotoJob } from '../services/api';
import { getCurrentUser } from '../services/authService';

/**
 * Hook que maneja el flujo completo de foto -> vacante comunitaria.
 */
export function usePhotoJob({ currentUser, candidateLocation, appendToActiveSession, setIsAuthModalOpen, toast, onUserUpdated }) {
  const [photoExtraction, setPhotoExtraction] = useState(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isConfirmingPhoto, setIsConfirmingPhoto] = useState(false);

  const handlePhotoSelected = async ({ imageBase64, latitud, longitud }) => {
    if (!currentUser) { setIsAuthModalOpen(true); return; }
    setIsAnalyzingPhoto(true);
    appendToActiveSession([{ role: 'user', text: '📷 Analizando foto de oferta laboral...' }]);
    try {
      const extraction = await analyzeJobPhoto(imageBase64, {
        latitud,
        longitud,
        municipio: candidateLocation?.municipio,
      });
      setPhotoExtraction(extraction);
      appendToActiveSession([{
        role: 'bot',
        text: '✨ Encontré una oferta laboral en la foto. Revisa los datos en el modal y confirma para publicarla.',
      }]);
    } catch (err) {
      appendToActiveSession([{
        role: 'bot',
        text: `❌ ${err.message || 'No se pudo analizar la foto. Intenta con otra imagen.'}`,
      }]);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleConfirmPhotoJob = async (editedData) => {
    setIsConfirmingPhoto(true);
    try {
      const job = await confirmPhotoJob(editedData);
      setPhotoExtraction(null);
      appendToActiveSession([{
        role: 'bot',
        text: `✅ ¡Vacante publicada! "${job.titulo}" ya aparece en la bolsa de trabajo. +10 Aura 🌟`,
      }]);
      toast.success('¡Vacante publicada! +10 Aura 🌟');
      // Refrescar usuario para actualizar Aura en el navbar
      try {
        const fresh = await getCurrentUser();
        if (fresh && onUserUpdated) onUserUpdated(fresh);
      } catch (_) { /* no bloquear si falla el refresh */ }
    } catch (err) {
      toast.error(err.message || 'No se pudo publicar la vacante');
    } finally {
      setIsConfirmingPhoto(false);
    }
  };

  const handleDiscardPhoto = () => {
    setPhotoExtraction(null);
    appendToActiveSession([{ role: 'bot', text: 'Foto descartada. Puedes tomar otra cuando quieras 📷' }]);
  };

  return {
    photoExtraction,
    isAnalyzingPhoto,
    isConfirmingPhoto,
    handlePhotoSelected,
    handleConfirmPhotoJob,
    handleDiscardPhoto,
  };
}
