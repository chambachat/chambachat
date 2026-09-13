import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  X, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Plus, 
  Settings, 
  MapPin, 
  Phone, 
  Send,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  getUserCompanies, 
  createCompany, 
  updateCompany, 
  getCompanyTeam, 
  inviteTeamMember, 
  removeTeamMember 
} from '../../services/api';

const MUNICIPIOS_NL = [
  'Apodaca',
  'Pesquería',
  'San Nicolás de los Garza',
  'Monterrey',
  'General Escobedo',
  'Guadalupe',
  'Santa Catarina',
  'García',
  'Ciénega de Flores',
  'Salinas Victoria'
];

export default function TeamManager({ currentUser, onCompanyChanged }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [teamData, setTeamData] = useState({ active_members: [], pending_invitations: [] });
  const [loading, setLoading] = useState(true);

  // Modales
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);

  // Formulario Invitar
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Formulario Nueva Empresa
  const [newCompName, setNewCompName] = useState('');
  const [newCompMunicipio, setNewCompMunicipio] = useState('Apodaca');
  const [newCompIndustria, setNewCompIndustria] = useState('Manufactura y Logística');
  const [newCompRfc, setNewCompRfc] = useState('');
  const [newCompDireccion, setNewCompDireccion] = useState('');
  const [newCompTel, setNewCompTel] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Cargar empresas
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const userEmail = currentUser?.email;
      const empresaHint = currentUser?.empresa_nombre || currentUser?.company_name;
      const data = await getUserCompanies(userEmail, empresaHint);
      setCompanies(data);
      if (data.length > 0) {
        // Mantener seleccionada o tomar la primera
        const current = selectedCompany ? (data.find(c => c.id === selectedCompany.id) || data[0]) : data[0];
        setSelectedCompany(current);
        await loadTeam(current.id);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async (companyId) => {
    if (!companyId) return;
    try {
      const data = await getCompanyTeam(companyId);
      setTeamData(data);
    } catch (err) {
      console.error('Error cargando miembros del equipo:', err);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentUser?.email]);

  const handleSelectCompany = async (comp) => {
    setSelectedCompany(comp);
    await loadTeam(comp.id);
    if (onCompanyChanged) onCompanyChanged(comp);
  };

  // Enviar invitación
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedCompany || !inviteEmail.trim()) return;

    setInviting(true);
    setInviteResult(null);
    try {
      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
      const res = await inviteTeamMember(selectedCompany.id, {
        email: inviteEmail.trim(),
        nombre: inviteName.trim() || undefined,
        role: inviteRole,
        inviter_name: currentUser?.name || 'Reclutador Líder',
        inviter_email: currentUser?.email || 'admin@empresa.com',
        origin_url: originUrl
      });
      setInviteResult(res);
      await loadTeam(selectedCompany.id);
    } catch (err) {
      alert(err.message || 'Error al enviar invitación');
    } finally {
      setInviting(false);
    }
  };

  // Crear nueva empresa
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    setSavingCompany(true);
    try {
      const res = await createCompany({
        nombre: newCompName.trim(),
        municipio: newCompMunicipio,
        industria: newCompIndustria,
        rfc: newCompRfc.trim() || undefined,
        direccion: newCompDireccion.trim() || undefined,
        telefono_contacto: newCompTel.trim() || undefined,
        creator_email: currentUser?.email || 'reclutador@empresa.com',
        creator_name: currentUser?.name
      });
      setIsNewCompanyModalOpen(false);
      setNewCompName('');
      setNewCompRfc('');
      setNewCompDireccion('');
      setNewCompTel('');
      await loadCompanies();
      if (res.company) {
        setSelectedCompany(res.company);
        if (onCompanyChanged) onCompanyChanged(res.company);
      }
    } catch (err) {
      alert(err.message || 'Error al registrar empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  // Editar empresa actual
  const handleEditCompany = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setSavingCompany(true);
    try {
      const res = await updateCompany(selectedCompany.id, {
        nombre: selectedCompany.nombre,
        municipio: selectedCompany.municipio,
        industria: selectedCompany.industria,
        rfc: selectedCompany.rfc,
        direccion: selectedCompany.direccion,
        telefono_contacto: selectedCompany.telefono_contacto
      });
      setIsEditCompanyModalOpen(false);
      await loadCompanies();
    } catch (err) {
      alert(err.message || 'Error al actualizar empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  // Eliminar miembro
  const handleRemoveMember = async (memberId, name) => {
    if (!selectedCompany) return;
    if (!window.confirm(`¿Seguro que deseas remover a "${name}" del equipo?`)) return;

    try {
      await removeTeamMember(selectedCompany.id, memberId);
      await loadTeam(selectedCompany.id);
    } catch (err) {
      alert(err.message || 'Error al remover miembro');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 animate-fadeIn">
      {/* HEADER & SELECTOR DE EMPRESA */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Configuración Multiusuario B2B</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Mi Equipo de Reclutamiento & Plantas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Configura las empresas o plantas industriales que administras y colabora con tu equipo de reclutadores en un mismo panel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsNewCompanyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Nueva Planta / Empresa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInviteResult(null);
                setInviteEmail('');
                setInviteName('');
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invitar Reclutador</span>
            </button>
          </div>
        </div>

        {/* SELECTOR DE PLANTA ACTIVA */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Planta Activa:</span>
            <div className="relative min-w-[240px]">
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const found = companies.find(c => c.id === parseInt(e.target.value));
                  if (found) handleSelectCompany(found);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer transition"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏭 {c.nombre} ({c.municipio})
                  </option>
                ))}
              </select>
            </div>
            {selectedCompany && (
              <button
                type="button"
                onClick={() => setIsEditCompanyModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Editar datos de esta empresa"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>{companies.length} empresa{companies.length === 1 ? '' : 's'} vinculada{companies.length === 1 ? '' : 's'} a tu cuenta</span>
            <span>&bull;</span>
            <span className="font-semibold text-emerald-700">{selectedCompany?.industria || 'Industrial'}</span>
          </div>
        </div>
      </div>

      {/* METRICAS DEL EQUIPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Miembros Activos</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{teamData.active_members?.length || 1}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">En línea</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Invitaciones Pendientes</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{teamData.pending_invitations?.length || 0}</span>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Por aceptar</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ubicación de Planta</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-slate-900 block truncate">{selectedCompany?.municipio || 'Apodaca'}</span>
            <span className="text-[10px] text-slate-400">Nuevo León, México</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Notificaciones de Equipo</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs font-black text-slate-900 block">Resend &bull; SMTP</span>
            <span className="text-[10px] text-emerald-600 font-medium">Correos transaccionales activos</span>
          </div>
        </div>
      </div>

      {/* TABLA DE MIEMBROS ACTIVOS */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Equipo de Reclutadores</h2>
            <p className="text-xs text-slate-500">Colegas con acceso a vacantes y atención de postulantes de esta empresa.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {teamData.active_members?.length || 0} integrante{(teamData.active_members?.length || 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {teamData.active_members?.map((member) => (
            <div key={member.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.nombre || member.email)}`}
                  alt={member.nombre}
                  className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {member.nombre || member.email.split('@')[0]}
                    </span>
                    {member.email === currentUser?.email && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                        Tú
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 block truncate">{member.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden md:block">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    member.role === 'admin'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {member.role === 'admin' ? 'Administrador RH' : 'Reclutador'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Activo desde {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'hoy'}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Activo</span>
                </span>

                {member.email !== currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id, member.nombre || member.email)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remover miembro del equipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INVITACIONES PENDIENTES */}
      {teamData.pending_invitations && teamData.pending_invitations.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Invitaciones Enviadas Pendientes de Aceptar ({teamData.pending_invitations.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {teamData.pending_invitations.map((inv) => (
              <div key={inv.id} className="bg-white border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{inv.nombre || inv.email}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Pendiente</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate">{inv.email}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    Código: <strong>{inv.token}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
                      copyToClipboard(`${originUrl}/?invitacion=${inv.token}`);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Copiar enlace de invitación"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(inv.id, inv.email)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Revocar invitación"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {copiedToken && (
            <p className="text-[11px] text-emerald-700 font-bold animate-fadeIn">
              ✅ ¡Enlace de invitación copiado al portapapeles!
            </p>
          )}
        </div>
      )}

      {/* MODAL 1: INVITAR RECLUTADOR */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Invitar Reclutador</h3>
                <p className="text-xs text-slate-500">Para colaborar en <strong>{selectedCompany?.nombre}</strong></p>
              </div>
            </div>

            {inviteResult ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¡Invitación despachada!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Se envió la notificación a <strong>{inviteEmail}</strong> con las instrucciones de acceso.
                  </p>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">Enlace directo de invitación:</span>
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-emerald-900 break-all">
                      <span className="truncate">{inviteResult.invite_url}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteResult.invite_url)}
                        className="text-emerald-700 hover:text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
                      >
                        {copiedToken ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico del Reclutador *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ej. reclutamiento2@planta.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre o Cargo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Lic. Alejandro Torres"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol en el Equipo
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    <option value="recruiter">Reclutador Industrial (Atender candidatos & vacantes)</option>
                    <option value="admin">Administrador de RH (Control total de equipo y empresa)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{inviting ? 'Enviando invitación por correo...' : 'Enviar Invitación por Correo'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVA EMPRESA / PLANTA */}
      {isNewCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewCompanyModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Nueva Empresa o Planta</h3>
                <p className="text-xs text-slate-500">Agrega otra nave industrial o corporativo para gestionar vacantes.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Empresa o Planta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Whirlpool Planta Horno o Ternium Churubusco"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Municipio en Nuevo León *
                  </label>
                  <select
                    value={newCompMunicipio}
                    onChange={(e) => setNewCompMunicipio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    {MUNICIPIOS_NL.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giro / Industria
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Automotriz, Logística, Ensamble"
                    value={newCompIndustria}
                    onChange={(e) => setNewCompIndustria(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección o Parque Industrial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Parque Industrial Prologis Apodaca, Nave 4"
                  value={newCompDireccion}
                  onChange={(e) => setNewCompDireccion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    RFC o Razón Social (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. WPL990101XYZ"
                    value={newCompRfc}
                    onChange={(e) => setNewCompRfc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono de Planta (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="ej. 81-8000-9000"
                    value={newCompTel}
                    onChange={(e) => setNewCompTel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCompanyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCompany || !newCompName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
                >
                  {savingCompany ? 'Guardando...' : 'Guardar y Activar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR EMPRESA ACTUAL */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
            <button
              onClick={() => setIsEditCompanyModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Configuración de Planta</h3>
                <p className="text-xs text-slate-500">{selectedCompany.nombre}</p>
              </div>
            </div>

            <form onSubmit={handleEditCompany} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={selectedCompany.nombre || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, nombre: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Municipio</label>
                  <select
                    value={selectedCompany.municipio || 'Apodaca'}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, municipio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                  >
                    {MUNICIPIOS_NL.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industria</label>
                  <input
                    type="text"
                    value={selectedCompany.industria || ''}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, industria: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={selectedCompany.direccion || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, direccion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {savingCompany ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
