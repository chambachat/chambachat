import { useState, useEffect } from 'react';
import { getCompanyTeam, inviteTeamMember, removeTeamMember } from '../services/api';

export function useCompanyTeam(companyId) {
  const [teamData, setTeamData] = useState({ active_members: [], pending_invitations: [] });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const loadTeam = async (id = companyId) => {
    if (!id) return;
    try {
      const data = await getCompanyTeam(id);
      setTeamData(data || { active_members: [], pending_invitations: [] });
    } catch (err) {
      console.error('Error cargando miembros del equipo:', err);
    }
  };

  useEffect(() => {
    loadTeam(companyId);
  }, [companyId]);

  const sendInvite = async (payload) => {
    if (!companyId) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await inviteTeamMember(companyId, payload);
      setInviteResult(res);
      await loadTeam(companyId);
      return res;
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId, type = 'member') => {
    if (!companyId) return;
    try {
      await removeTeamMember(companyId, memberId, type);
      await loadTeam(companyId);
    } catch (err) {
      throw err;
    }
  };

  return {
    teamData,
    inviting,
    inviteResult,
    loadTeam,
    sendInvite,
    removeMember,
    setInviteResult
  };
}
