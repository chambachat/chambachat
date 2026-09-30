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
    if (!currentUser) {
      if (toast?.error) toast.error('Inicia sesión o regístrate para cazar chambas con fotos');
      setIsAuthModalOpen(true);
      return;
    }

    setIsAnalyzingPhoto(true);
    if (toast?.loading) {
      toast.loading('Analizando lona con Inteligencia Artificial...', { id: 'photo-analyzing' });
    }

    if (appendToActiveSession) {
      appendToActiveSession([{ role: 'user', text: '📷 Analizando foto de oferta laboral...' }]);
    }

    try {
      const extraction = await analyzeJobPhoto(imageBase64, {
        latitud,
        longitud,
        municipio: candidateLocation?.municipio,
      });

      if (toast?.dismiss) toast.dismiss('photo-analyzing');
      if (toast?.success) toast.success('¡Oferta detectada! Revisa los datos para publicarla.');

      setPhotoExtraction(extraction);

      if (appendToActiveSession) {
        appendToActiveSession([{
          role: 'bot',
          text: '✨ Encontré una oferta laboral en la foto. Revisa los datos y confirma para publicarla.',
        }]);
      }
    } catch (err) {
      if (toast?.dismiss) toast.dismiss('photo-analyzing');
      const errorMsg = err.message || 'No se pudo analizar la foto. Intenta con otra imagen más clara.';
      if (toast?.error) {
        toast.error(errorMsg);
      } else {
        alert(errorMsg);
      }

      if (appendToActiveSession) {
        appendToActiveSession([{
          role: 'bot',
          text: `❌ ${errorMsg}`,
        }]);
      }
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleConfirmPhotoJob = async (editedData) => {
    setIsConfirmingPhoto(true);
    try {
      const job = await confirmPhotoJob(editedData);
      setPhotoExtraction(null);
      if (appendToActiveSession) {
        appendToActiveSession([{
          role: 'bot',
          text: `✅ ¡Vacante publicada! "${job.titulo}" ya aparece en la bolsa de trabajo. +10 Aura 🌟`,
        }]);
      }
      if (toast?.success) toast.success('¡Vacante publicada! +10 Aura 🌟');

      try {
        const fresh = await getCurrentUser();
        if (fresh && onUserUpdated) onUserUpdated(fresh);
      } catch (_) { /* noop */ }
    } catch (err) {
      const errorMsg = err.message || 'No se pudo publicar la vacante';
      if (toast?.error) toast.error(errorMsg);
      else alert(errorMsg);
    } finally {
      setIsConfirmingPhoto(false);
    }
  };

  const handleDiscardPhoto = () => {
    setPhotoExtraction(null);
    if (appendToActiveSession) {
      appendToActiveSession([{ role: 'bot', text: 'Foto descartada. Puedes tomar otra cuando quieras 📷' }]);
    }
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
