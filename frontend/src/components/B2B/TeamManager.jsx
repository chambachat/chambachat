import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { useCompanies } from '../../hooks/useCompanies';
import { useCompanyTeam } from '../../hooks/useCompanyTeam';
import { useCompanyShifts } from '../../hooks/useCompanyShifts';

import CompanyLocationModal from './CompanyLocationModal';
import CompanyOnboarding from './Team/CompanyOnboarding';
import CompanySelector from './Team/CompanySelector';
import CompanyMetrics from './Team/CompanyMetrics';
import MembersList from './Team/MembersList';
import InviteMemberModal from './Team/InviteMemberModal';
import CompanyFormModal from './Team/CompanyFormModal';
import ShiftsPanel from './Team/ShiftsPanel';
import ShiftFormModal from './Team/ShiftFormModal';

export default function TeamManager({ currentUser, onCompanyChanged }) {
  const toast = useToast();
  
  const { 
    companies, 
    selectedCompany, 
    loading, 
    savingCompany, 
    selectCompany, 
    handleCreateCompany, 
    handleEditCompany,
    updateCompanyLocally
  } = useCompanies(currentUser, onCompanyChanged);

  const { 
    teamData, 
    inviting, 
    inviteResult, 
    sendInvite, 
    removeMember,
    setInviteResult
  } = useCompanyTeam(selectedCompany?.id);

  const { 
    shifts, 
    loadingShifts, 
    savingShift, 
    shiftError, 
    saveShift, 
    deleteShift,
    setShiftError
  } = useCompanyShifts(selectedCompany?.id);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500">Cargando datos de empresa y equipo...</span>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <CompanyOnboarding 
        currentUser={currentUser} 
        onCompanyCreated={async (payload) => {
          await handleCreateCompany(payload);
        }} 
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 animate-fadeIn">
      <CompanySelector
        companies={companies}
        selectedCompany={selectedCompany}
        onSelectCompany={selectCompany}
        onNewCompany={() => setIsNewCompanyModalOpen(true)}
        onInvite={() => {
          setInviteResult(null);
          setIsInviteModalOpen(true);
        }}
        onEditCompany={() => setIsEditCompanyModalOpen(true)}
      />

      <CompanyMetrics
        teamData={teamData}
        selectedCompany={selectedCompany}
        onOpenLocation={() => setIsLocationModalOpen(true)}
      />

      <MembersList
        teamData={teamData}
        currentUser={currentUser}
        onRemoveMember={async (id) => {
          try {
            await removeMember(id);
          } catch (err) {
            toast.error(err.message || 'Error al remover miembro');
          }
        }}
      />

      <ShiftsPanel
        shifts={shifts}
        loadingShifts={loadingShifts}
        onOpenCreateShift={() => {
          setEditingShift(null);
          setShiftError('');
          setIsShiftModalOpen(true);
        }}
        onOpenEditShift={(shift) => {
          setEditingShift(shift);
          setShiftError('');
          setIsShiftModalOpen(true);
        }}
        onDeleteShift={async (id) => {
          try {
            await deleteShift(id);
          } catch (err) {
            toast.error(err.message || 'Error al eliminar turno');
          }
        }}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        selectedCompany={selectedCompany}
        inviting={inviting}
        inviteResult={inviteResult}
        onInvite={async (payload) => {
          try {
            const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
            await sendInvite({
              ...payload,
              inviter_name: currentUser?.name || 'Reclutador Líder',
              inviter_email: currentUser?.email,
              origin_url: originUrl
            });
          } catch (err) {
            toast.error(err.message || 'Error al enviar invitación');
          }
        }}
      />

      <CompanyFormModal
        isOpen={isNewCompanyModalOpen}
        onClose={() => setIsNewCompanyModalOpen(false)}
        mode="create"
        currentUser={currentUser}
        savingCompany={savingCompany}
        onSave={async (payload) => {
          await handleCreateCompany(payload);
          setIsNewCompanyModalOpen(false);
        }}
      />

      <CompanyFormModal
        isOpen={isEditCompanyModalOpen}
        onClose={() => setIsEditCompanyModalOpen(false)}
        mode="edit"
        companyData={selectedCompany}
        savingCompany={savingCompany}
        onOpenLocation={() => {
          setIsEditCompanyModalOpen(false);
          setIsLocationModalOpen(true);
        }}
        onSave={async (payload) => {
          await handleEditCompany(selectedCompany.id, payload);
          setIsEditCompanyModalOpen(false);
        }}
      />

      <ShiftFormModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        savingShift={savingShift}
        shiftError={shiftError}
        editingShift={editingShift}
        selectedCompany={selectedCompany}
        onSave={async (payload) => {
          try {
            await saveShift(editingShift?.id, payload);
            setIsShiftModalOpen(false);
          } catch (err) {
            // Error is handled in hook/modal
          }
        }}
      />

      <CompanyLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        company={selectedCompany}
        onSaved={(updatedComp) => updateCompanyLocally(updatedComp)}
      />
    </div>
  );
}
