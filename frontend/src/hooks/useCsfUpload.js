import { useState } from 'react';
import { uploadConstanciaFiscal } from '../services/api';
import { MUNICIPIOS_NL, REGIMENES_SAT } from '../components/B2B/Team/constants';

export function useCsfUpload() {
  const [csfFile, setCsfFile] = useState(null);
  const [csfUploading, setCsfUploading] = useState(false);
  const [csfUploadedUrl, setCsfUploadedUrl] = useState('');
  const [csfFileName, setCsfFileName] = useState('');
  const [csfError, setCsfError] = useState('');
  const [satData, setSatData] = useState(null);
  const [satValidated, setSatValidated] = useState(false);

  const clearCsf = () => {
    setCsfFile(null);
    setCsfUploadedUrl('');
    setCsfFileName('');
    setCsfError('');
    setSatData(null);
    setSatValidated(false);
  };

  const uploadCsf = async (file, onAutoFill) => {
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    if (!validTypes.includes(file.type) && !isPdf) {
      setCsfError('El archivo debe estar en formato PDF o Imagen (JPG, PNG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setCsfError('El archivo de la constancia no debe superar los 15 MB.');
      return;
    }

    setCsfUploading(true);
    setCsfError('');
    try {
      const res = await uploadConstanciaFiscal(file);
      setCsfFile(file);
      setCsfFileName(file.name);
      setCsfUploadedUrl(res.file_url);

      if (res.sat_data) {
        setSatData(res.sat_data);
        setSatValidated(Boolean(res.sat_validado || res.sat_data.rfc));

        if (onAutoFill) {
          const updates = {};
          
          const razon = res.sat_data.razon_social_completa || res.sat_data.razon_social || res.sat_data.nombre_contribuyente;
          if (razon) updates.nombre = razon;

          if (res.sat_data.rfc) updates.rfc = res.sat_data.rfc;

          if (res.sat_data.municipio) {
            const cleanMun = res.sat_data.municipio.trim().toLowerCase();
            const matchMun = MUNICIPIOS_NL.find(m => {
              const mLower = m.toLowerCase();
              return mLower === cleanMun || cleanMun.includes(mLower) || mLower.includes(cleanMun);
            });
            if (matchMun) updates.municipio = matchMun;
          }

          if (res.sat_data.direccion) updates.direccion = res.sat_data.direccion;

          if (res.sat_data.regimen_fiscal) {
            const regClean = res.sat_data.regimen_fiscal.toLowerCase();
            const matchReg = REGIMENES_SAT.find(r => 
              regClean.includes(r.toLowerCase().slice(0, 15)) ||
              r.toLowerCase().includes(regClean.slice(0, 15))
            );
            if (matchReg) updates.regimen_fiscal = matchReg;
          }

          onAutoFill(updates);
        }
      }
    } catch (err) {
      console.error('Error al subir CSF:', err);
      setCsfError(err.message || 'Error al subir y procesar el documento');
    } finally {
      setCsfUploading(false);
    }
  };

  return {
    csfFile,
    csfUploading,
    csfUploadedUrl,
    csfFileName,
    csfError,
    satData,
    satValidated,
    uploadCsf,
    clearCsf,
    setCsfUploadedUrl,
    setCsfFileName,
    setCsfError
  };
}
