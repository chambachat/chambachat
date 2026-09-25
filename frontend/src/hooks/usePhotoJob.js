import { useState } from 'react';
import { analyzeJobPhoto, confirmPhotoJob } from '../services/api';

/**
 * Hook que maneja el flujo completo de foto → vacante comunitaria.
 * 
 * Flujo:
 * 1. handlePhotoSelected: comprime la foto, captura GPS, la envía al backend para análisis.
 * 2. handleConfirmPhotoJob: publica la vacante con los datos editados por el usuario.
 * 3. handleDiscardPhoto: descarta la extracción actual.
 */
export function usePhotoJob({ currentUser, candidateLocation, appendToActiveSession, setIsAuthModalOpen, toast }) {
  const [photoExtraction, setPhotoExtraction] = useState(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isConfirmingPhoto, setIsConfirmingPhoto] = useState(false);

  const handlePhotoSelected = async ({ imageBase64, latitud, longitud }) => {
    if (!currentUser) { setIsAuthModalOpen(true); return; }
    setIsAnalyzingPhoto(true);
    appendToActiveSession([{ role: 'user', text: '📸 Analizando foto de oferta laboral...' }]);
    try {
      const extraction = await analyzeJobPhoto(imageBase64, {
        latitud,
        longitud,
        municipio: candidateLocation?.municipio,
      });
      setPhotoExtraction(extraction);
      appendToActiveSession([{
        role: 'bot',
        text: '✅ Encontré una oferta laboral en la foto. Revisa los datos y confirma para publicarla.',
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
        text: `🎉 ¡Vacante publicada! "${job.titulo}" ya aparece en la bolsa de trabajo. +10 Aura ⭐`,
      }]);
      toast.success('¡Vacante publicada! +10 Aura ⭐');
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
