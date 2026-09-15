import { useState, useEffect } from 'react';
import { getUserCompanies, createCompany, updateCompany } from '../services/api';

export function useCompanies(currentUser, onCompanyChanged) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const userEmail = currentUser?.email;
      const empresaHint = currentUser?.empresa_nombre || currentUser?.company_name;
      const data = await getUserCompanies(userEmail, empresaHint);
      setCompanies(data || []);
      if (data && data.length > 0) {
        const current = selectedCompany ? (data.find(c => c.id === selectedCompany.id) || data[0]) : data[0];
        setSelectedCompany(current);
        if (onCompanyChanged) onCompanyChanged(current);
      } else {
        setSelectedCompany(null);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentUser?.email]);

  const selectCompany = async (comp) => {
    setSelectedCompany(comp);
    if (onCompanyChanged) onCompanyChanged(comp);
  };

  const handleCreateCompany = async (payload) => {
    setSavingCompany(true);
    try {
      const res = await createCompany(payload);
      await loadCompanies();
      if (res.company) {
        setSelectedCompany(res.company);
        if (onCompanyChanged) onCompanyChanged(res.company);
      }
      return res;
    } finally {
      setSavingCompany(false);
    }
  };

  const handleEditCompany = async (companyId, payload) => {
    setSavingCompany(true);
    try {
      const res = await updateCompany(companyId, payload);
      await loadCompanies();
      return res;
    } finally {
      setSavingCompany(false);
    }
  };

  const updateCompanyLocally = (updatedComp) => {
    setSelectedCompany(prev => ({ ...prev, ...updatedComp }));
    setCompanies(prev => prev.map(c => c.id === updatedComp.id ? { ...c, ...updatedComp } : c));
    if (onCompanyChanged) onCompanyChanged(updatedComp);
  };

  return {
    companies,
    selectedCompany,
    loading,
    savingCompany,
    loadCompanies,
    selectCompany,
    handleCreateCompany,
    handleEditCompany,
    updateCompanyLocally
  };
}
