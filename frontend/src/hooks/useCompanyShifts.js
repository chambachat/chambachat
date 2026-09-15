import { useState, useEffect } from 'react';
import { getCompanyShifts, createCompanyShift, updateCompanyShift, deleteCompanyShift } from '../services/api';

export function useCompanyShifts(companyId) {
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [shiftError, setShiftError] = useState('');

  const loadShifts = async (id = companyId) => {
    if (!id) return;
    try {
      setLoadingShifts(true);
      const data = await getCompanyShifts(id);
      setShifts(data || []);
    } catch (err) {
      console.error('Error cargando turnos de la empresa:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    loadShifts(companyId);
  }, [companyId]);

  const saveShift = async (shiftId, payload) => {
    if (!companyId) return;
    setSavingShift(true);
    setShiftError('');
    try {
      if (shiftId) {
        await updateCompanyShift(companyId, shiftId, payload);
      } else {
        await createCompanyShift(companyId, payload);
      }
      await loadShifts(companyId);
    } catch (err) {
      setShiftError(err.message || 'Error al guardar turno laboral');
      throw err;
    } finally {
      setSavingShift(false);
    }
  };

  const deleteShift = async (shiftId) => {
    if (!companyId) return;
    try {
      await deleteCompanyShift(companyId, shiftId);
      await loadShifts(companyId);
    } catch (err) {
      throw err;
    }
  };

  return {
    shifts,
    loadingShifts,
    savingShift,
    shiftError,
    loadShifts,
    saveShift,
    deleteShift,
    setShiftError
  };
}
