import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../ui/Toast';
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
  ChevronDown,
  FileText,
  UploadCloud,
  FileCheck,
  AlertCircle,
  FileBadge2,
  Lock,
  ArrowRight,
  Loader2,
  QrCode,
  Sparkles,
  Info,
  Calendar,
  Briefcase
} from 'lucide-react';
import { 
  getUserCompanies, 
  createCompany, 
  updateCompany, 
  getCompanyTeam, 
  inviteTeamMember, 
  removeTeamMember,
  uploadConstanciaFiscal,
  getCompanyShifts,
  createCompanyShift,
  updateCompanyShift,
  deleteCompanyShift
} from '../../services/api';
import CompanyLocationModal from './CompanyLocationModal';

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
  'Salinas Victoria',
  'Santiago',
  'San Pedro Garza García',
  'Cadereyta Jiménez',
  'Juárez',
  'El Carmen',
  'Montemorelos',
  'Linares',
  'Marín',
  'Doctor Arroyo',
  'Sabinas Hidalgo',
  'Allende',
  'Zuazua',
  'Hidalgo',
  'Abasolo'
];


const REGIMENES_SAT = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '626 - Régimen Simplificado de Confianza (RESICO)',
  '612 - Personas Físicas con Actividades Empresariales',
  '620 - Sociedades Cooperativas de Producción',
  'Otro Régimen Fiscal'
];

export default function TeamManager({ currentUser, onCompanyChanged }) {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [teamData, setTeamData] = useState({ active_members: [], pending_invitations: [] });
  const [loading, setLoading] = useState(true);

  // Modales
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Formulario Invitar
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Formulario Nueva Empresa / Onboarding
  const [newCompName, setNewCompName] = useState('');
  const [newCompMunicipio, setNewCompMunicipio] = useState('Apodaca');
  const [newCompIndustria, setNewCompIndustria] = useState('Manufactura y Logística');
  const [newCompRfc, setNewCompRfc] = useState('');
  const [newCompRegimen, setNewCompRegimen] = useState(REGIMENES_SAT[0]);
  const [newCompDireccion, setNewCompDireccion] = useState('');
  const [newCompTel, setNewCompTel] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Estado para la Constancia de Situación Fiscal (CSF)
  const [csfFile, setCsfFile] = useState(null);
  const [csfUploading, setCsfUploading] = useState(false);
  const [csfUploadedUrl, setCsfUploadedUrl] = useState('');
  const [csfFileName, setCsfFileName] = useState('');
  const [csfError, setCsfError] = useState('');
  const [satData, setSatData] = useState(null);
  const [satValidated, setSatValidated] = useState(false);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  // Turnos Laborales de Planta
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftNombre, setShiftNombre] = useState('');
  const [shiftHoraEntrada, setShiftHoraEntrada] = useState('06:00');
  const [shiftHoraSalida, setShiftHoraSalida] = useState('14:00');
  const [shiftDias, setShiftDias] = useState('Lunes a Sábado');
  const [shiftTipo, setShiftTipo] = useState('Fijo');
  const [shiftDescripcion, setShiftDescripcion] = useState('');
  const [savingShift, setSavingShift] = useState(false);
  const [shiftError, setShiftError] = useState('');

  // Cargar empresas
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
        await loadTeam(current.id);
        await loadShifts(current.id);
        if (onCompanyChanged) onCompanyChanged(current);
      } else {
        setSelectedCompany(null);
        setTeamData({ active_members: [], pending_invitations: [] });
        setShifts([]);
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
      setTeamData(data || { active_members: [], pending_invitations: [] });
    } catch (err) {
      console.error('Error cargando miembros del equipo:', err);
    }
  };

  const loadShifts = async (companyId) => {
    if (!companyId) return;
    try {
      setLoadingShifts(true);
      const data = await getCompanyShifts(companyId);
      setShifts(data || []);
    } catch (err) {
      console.error('Error cargando turnos de la empresa:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setShiftNombre('');
    setShiftHoraEntrada('06:00');
    setShiftHoraSalida('14:00');
    setShiftDias('Lunes a Sábado');
    setShiftTipo('Fijo');
    setShiftDescripcion('');
    setShiftError('');
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (s) => {
    setEditingShift(s);
    setShiftNombre(s.nombre || '');
    setShiftHoraEntrada(s.hora_entrada || '06:00');
    setShiftHoraSalida(s.hora_salida || '14:00');
    setShiftDias(s.dias || 'Lunes a Sábado');
    setShiftTipo(s.tipo || 'Fijo');
    setShiftDescripcion(s.descripcion || '');
    setShiftError('');
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!shiftNombre.trim()) {
      setShiftError('El nombre del turno es obligatorio.');
      return;
    }
    if (!shiftHoraEntrada.trim() || !shiftHoraSalida.trim()) {
      setShiftError('Los horarios de entrada y salida son obligatorios.');
      return;
    }

    setSavingShift(true);
    setShiftError('');
    try {
      const payload = {
        nombre: shiftNombre.trim(),
        hora_entrada: shiftHoraEntrada.trim(),
        hora_salida: shiftHoraSalida.trim(),
        dias: shiftDias.trim(),
        tipo: shiftTipo.trim(),
        descripcion: shiftDescripcion.trim() || undefined
      };

      if (editingShift?.id) {
        await updateCompanyShift(selectedCompany.id, editingShift.id, payload);
      } else {
        await createCompanyShift(selectedCompany.id, payload);
      }
      setIsShiftModalOpen(false);
      await loadShifts(selectedCompany.id);
    } catch (err) {
      setShiftError(err.message || 'Error al guardar turno laboral');
    } finally {
      setSavingShift(false);
    }
  };

  const handleDeleteShift = async (shiftId, shiftName) => {
    if (!selectedCompany) return;
    const confirmed = await toast.confirm(`¿Seguro que deseas eliminar el turno "${shiftName}"?`);
    if (!confirmed) return;
    try {
      await deleteCompanyShift(selectedCompany.id, shiftId);
      await loadShifts(selectedCompany.id);
    } catch (err) {
      toast.error(err.message || 'Error al eliminar turno');
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentUser?.email]);

  const handleSelectCompany = async (comp) => {
    setSelectedCompany(comp);
    await loadTeam(comp.id);
    await loadShifts(comp.id);
    if (onCompanyChanged) onCompanyChanged(comp);
  };

  // Manejo de subida de archivo CSF
  const handleCsfUpload = async (file) => {
    if (!file) return;

    // Validar tipo: PDF o imagen
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    if (!validTypes.includes(file.type) && !isPdf) {
      setCsfError('El archivo debe estar en formato PDF o Imagen (JPG, PNG).');
      return;
    }

    // Validar tamaño máximo: 15MB
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

        // Auto-llenar Nombre de Empresa / Razón Social
        const razon = res.sat_data.razon_social_completa || res.sat_data.razon_social || res.sat_data.nombre_contribuyente;
        if (razon) {
          setNewCompName(razon);
        }

        // Auto-llenar RFC
        if (res.sat_data.rfc) {
          setNewCompRfc(res.sat_data.rfc);
        }

        // Auto-llenar Municipio en Nuevo León
        if (res.sat_data.municipio) {
          const cleanMun = res.sat_data.municipio.trim().toLowerCase();
          const matchMun = MUNICIPIOS_NL.find(m => {
            const mLower = m.toLowerCase();
            return mLower === cleanMun || cleanMun.includes(mLower) || mLower.includes(cleanMun);
          });
          if (matchMun) {
            setNewCompMunicipio(matchMun);
          }
        }

        // Auto-llenar Dirección Fiscal
        if (res.sat_data.direccion) {
          setNewCompDireccion(res.sat_data.direccion);
        }

        // Auto-llenar Régimen Fiscal
        if (res.sat_data.regimen_fiscal) {
          const regClean = res.sat_data.regimen_fiscal.toLowerCase();
          const matchReg = REGIMENES_SAT.find(r => 
            regClean.includes(r.toLowerCase().slice(0, 15)) ||
            r.toLowerCase().includes(regClean.slice(0, 15))
          );
          if (matchReg) setNewCompRegimen(matchReg);
        }
      }
    } catch (err) {
      console.error('Error al subir CSF:', err);
      setCsfError(err.message || 'Error al subir y procesar el documento');
    } finally {
      setCsfUploading(false);
    }
  };

  // Enviar invitación a reclutador
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedCompany || !inviteEmail.trim()) return;

    setInviting(true);
    setInviteResult(null);
    try {
      if (!currentUser?.email) throw new Error('El usuario no tiene un correo válido');
      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
      const res = await inviteTeamMember(selectedCompany.id, {
        email: inviteEmail.trim(),
        nombre: inviteName.trim() || undefined,
        role: inviteRole,
        inviter_name: currentUser?.name || 'Reclutador Líder',
        inviter_email: currentUser.email,
        origin_url: originUrl
      });
      setInviteResult(res);
      await loadTeam(selectedCompany.id);
    } catch (err) {
      toast.error(err.message || 'Error al enviar invitación');
    } finally {
      setInviting(false);
    }
  };

  // Crear nueva empresa (ya sea en Onboarding o Modal)
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompName.trim()) {
      toast.warning('Por favor ingresa el nombre de la empresa o razón social.');
      return;
    }

    if (!csfUploadedUrl) {
      setCsfError('Es obligatorio subir la Constancia de Situación Fiscal (CSF) emitida por el SAT.');
      return;
    }

    setSavingCompany(true);
    try {
      const res = await createCompany({
        nombre: newCompName.trim(),
        municipio: newCompMunicipio,
        industria: newCompIndustria,
        rfc: newCompRfc.trim().toUpperCase() || undefined,
        regimen_fiscal: newCompRegimen,
        constancia_fiscal_url: csfUploadedUrl,
        direccion: newCompDireccion.trim() || undefined,
        telefono_contacto: newCompTel.trim() || undefined,
        creator_email: currentUser?.email,
        creator_name: currentUser?.name,
        // Campos oficiales del SAT extraídos del QR / CSF
        idcif: satData?.idcif,
        curp: satData?.curp,
        razon_social: satData?.razon_social,
        regimen_capital: satData?.regimen_capital,
        fecha_inicio_operaciones: satData?.fecha_inicio_operaciones,
        estatus_padron: satData?.estatus_padron || 'ACTIVO',
        fecha_ultimo_cambio_estado: satData?.fecha_ultimo_cambio_estado,
        codigo_postal: satData?.codigo_postal,
        entidad_federativa: satData?.entidad_federativa,
        colonia: satData?.colonia,
        tipo_vialidad: satData?.tipo_vialidad,
        calle: satData?.calle,
        numero_exterior: satData?.numero_exterior,
        numero_interior: satData?.numero_interior,
        sat_url_validacion: satData?.sat_url,
        sat_validado: satValidated || Boolean(satData?.rfc),
        sat_raw_data: satData ? JSON.stringify(satData) : undefined
      });

      // Limpiar estados
      setIsNewCompanyModalOpen(false);
      setNewCompName('');
      setNewCompRfc('');
      setNewCompDireccion('');
      setNewCompTel('');
      setCsfFile(null);
      setCsfFileName('');
      setCsfUploadedUrl('');
      setCsfError('');
      setSatData(null);
      setSatValidated(false);

      await loadCompanies();
      if (res.company) {
        setSelectedCompany(res.company);
        if (onCompanyChanged) onCompanyChanged(res.company);
      }
    } catch (err) {
      toast.error(err.message || 'Error al registrar empresa');
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
      const payload = {
        nombre: selectedCompany.nombre,
        municipio: selectedCompany.municipio,
        industria: selectedCompany.industria,
        rfc: selectedCompany.rfc,
        direccion: selectedCompany.direccion,
        telefono_contacto: selectedCompany.telefono_contacto,
        regimen_fiscal: selectedCompany.regimen_fiscal
      };
      if (csfUploadedUrl) {
        payload.constancia_fiscal_url = csfUploadedUrl;
      }

      await updateCompany(selectedCompany.id, payload);
      setIsEditCompanyModalOpen(false);
      setCsfUploadedUrl('');
      setCsfFileName('');
      await loadCompanies();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  // Eliminar miembro
  const handleRemoveMember = async (memberId, name) => {
    if (!selectedCompany) return;
    const confirmed = await toast.confirm(`¿Seguro que deseas remover a "${name}" del equipo?`);
    if (!confirmed) return;

    try {
      await removeTeamMember(selectedCompany.id, memberId);
      await loadTeam(selectedCompany.id);
    } catch (err) {
      toast.error(err.message || 'Error al remover miembro');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch (e) {}
  };

  // Renderizador de tarjeta de datos oficiales verificados del SAT
  const renderSatCard = () => {
    if (!satData) return null;
    const is32D = satData.tipo_documento === 'opinion_32d';

    return (
      <div className="p-4 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border border-emerald-300 rounded-2xl space-y-2.5 shadow-xs animate-fadeIn mt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">
                  {is32D ? 'Opinión 32-D Validada ante el SAT' : 'Validado Oficialmente ante el SAT'}
                </span>
                {satData.qr_detectado && (
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <QrCode className="w-2.5 h-2.5" /> QR Detectado
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium block">
                {is32D 
                  ? 'siat.sat.gob.mx • Cumplimiento de Obligaciones Fiscales' 
                  : 'siat.sat.gob.mx • Cédula de Identificación Fiscal'}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
            {is32D 
              ? (satData.sentido_opinion ? `OPINIÓN ${satData.sentido_opinion}` : 'POSITIVO') 
              : (satData.estatus_padron || 'ACTIVO')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-100">
          <div>
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">RFC Oficial</span>
            <span className="font-mono font-bold text-slate-900">{satData.rfc || 'No detectado'}</span>
          </div>
          {satData.folio && (
            <div>
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Folio Oficial SAT</span>
              <span className="font-mono font-bold text-slate-900">{satData.folio}</span>
            </div>
          )}
          {satData.idcif && (
            <div>
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">idCIF (Folio SAT)</span>
              <span className="font-mono font-bold text-slate-900">{satData.idcif}</span>
            </div>
          )}
          {satData.razon_social && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Razón Social / Denominación</span>
              <span className="font-bold text-slate-900 block">{satData.razon_social}</span>
              {satData.regimen_capital && (
                <span className="text-slate-500 text-[10px]">{satData.regimen_capital}</span>
              )}
            </div>
          )}
          {satData.direccion && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Domicilio Fiscal Registrado</span>
              <span className="font-medium text-slate-700 text-[11px] leading-snug">{satData.direccion}</span>
            </div>
          )}
          {is32D && !satData.direccion && (
            <div className="sm:col-span-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Opinión 32-D: Domicilio requerido</span>
              </div>
              <p className="text-[10px] leading-relaxed text-amber-700">
                El SAT no imprime domicilio en la Opinión 32-D. RFC y Razón Social fueron extraídos exitosamente. Por favor ingresa la dirección de tu planta o empresa abajo (o sube tu Constancia de Situación Fiscal para autocompletarla).
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] border-t border-emerald-100/70">
          {satData.sat_url ? (
            <a
              href={satData.sat_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Verificar en Validador Oficial del SAT</span>
            </a>
          ) : (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{is32D ? 'Opinión 32-D SAT Certificada' : 'Constancia Fiscal Certificada'}</span>
            </span>
          )}
          <span className="text-emerald-800 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Datos fiscales autorrellenados automáticamente</span>
          </span>
        </div>
      </div>
    );
  };

  // Render mientras carga inicialmente
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500">Cargando datos de empresa y equipo...</span>
      </div>
    );
  }

  // =========================================================================
  // VISTA ONBOARDING: SI EL RECLUTADOR NO TIENE NINGUNA EMPRESA REGISTRADA
  // =========================================================================
  if (companies.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 w-full space-y-6 animate-fadeIn">
        {/* Banner de bienvenida y explicación */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verificación Fiscal Obligatoria SAT</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Da de alta tu Empresa o Planta Industrial
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              En <strong>ChambaChat</strong> garantizamos que todas las vacantes sean 100% formales y seguras para los trabajadores de Nuevo León. Para comenzar a publicar ofertas y gestionar a tu equipo, sube la <strong>Constancia de Situación Fiscal (CSF)</strong> emitida por el SAT.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulario de Alta y Carga de CSF */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Registro de la Empresa</h2>
                <p className="text-xs text-slate-500">Datos fiscales y ubicación en Nuevo León</p>
              </div>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              {/* ÁREA DE CARGA DE CONSTANCIA FISCAL (CSF) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    1. Constancia de Situación Fiscal (SAT) *
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    PDF o Imagen
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsfUpload(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                />

                {!csfUploadedUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                      csfError 
                        ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50' 
                        : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70'
                    }`}
                  >
                    {csfUploading ? (
                      <div className="flex flex-col items-center gap-2 py-3">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        <div className="text-center">
                          <span className="text-xs font-black text-slate-800 block">
                            Escaneando QR y Validando con el SAT en vivo...
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Consultando siat.sat.gob.mx y extrayendo datos fiscales oficiales
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white text-emerald-600 rounded-2xl border border-emerald-200 group-hover:scale-110 transition-transform shadow-xs mb-2">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-black text-slate-800 block">
                          Haz clic para subir tu Constancia de Situación Fiscal (CSF)
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                          Sube el documento PDF o imagen emitido recientemente por el SAT (máximo 15 MB)
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {csfFileName || 'Constancia_Situacion_Fiscal.pdf'}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{satValidated ? 'Validado con el SAT exitosamente' : 'Archivo fiscal cargado correctamente'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={csfUploadedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1"
                        title="Ver documento cargado"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setCsfUploadedUrl('');
                          setCsfFileName('');
                          setCsfFile(null);
                          setSatData(null);
                          setSatValidated(false);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                        title="Eliminar y subir otro"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {renderSatCard()}

                {csfError && (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{csfError}</span>
                  </p>
                )}
              </div>

              {/* DATOS GENERALES */}
              <div className="pt-2 space-y-3.5">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  2. Información de la Empresa
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Comercial o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Kia México Planta Pesquería o Carrier Planta Apodaca"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RFC de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. KME990101XYZ"
                      value={newCompRfc}
                      onChange={(e) => setNewCompRfc(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs uppercase font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Municipio en Nuevo León *
                    </label>
                    <select
                      value={newCompMunicipio}
                      onChange={(e) => setNewCompMunicipio(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                    >
                      {MUNICIPIOS_NL.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Régimen Fiscal (SAT)
                    </label>
                    <select
                      value={newCompRegimen}
                      onChange={(e) => setNewCompRegimen(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                    >
                      {REGIMENES_SAT.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giro o Industria *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Automotriz, Logística, Ensamble"
                      value={newCompIndustria}
                      onChange={(e) => setNewCompIndustria(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección o Parque Industrial (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Av. Kia 100, Parque Industrial Pesquería"
                    value={newCompDireccion}
                    onChange={(e) => setNewCompDireccion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono de Contacto de RH (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="ej. 81-8000-0000"
                    value={newCompTel}
                    onChange={(e) => setNewCompTel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingCompany || !newCompName.trim() || !csfUploadedUrl}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>{savingCompany ? 'Dando de alta empresa...' : 'Validar Constancia y Dar de Alta Empresa'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          </div>

          {/* Tarjeta lateral de beneficios y seguridad */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>¿Por qué requerimos la Constancia Fiscal?</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">🛡️ Certeza a los Candidatos</span>
                  <p className="text-[11px] text-slate-500">
                    Los trabajadores operativos confían plenamente en ChambaChat porque certificamos que las vacantes pertenecen a empresas formales con prestaciones de ley.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">👥 Gestión Multiusuario</span>
                  <p className="text-[11px] text-slate-500">
                    Una vez que des de alta la empresa, podrás invitar por correo a tus colegas reclutadores para coordinarse en un mismo tablero.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">🤖 Chat Grupal con Chambot</span>
                  <p className="text-[11px] text-slate-500">
                    El bot de IA atenderá a los postulantes las 24 horas y te notificará cuando un perfil cumpla con tus requisitos.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
              <FileBadge2 className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="text-[11px] text-emerald-950">
                <span className="font-bold block">Insignia de Empresa Verificada SAT</span>
                <span className="text-emerald-800">Tus vacantes mostrarán el distintivo de confianza en las búsquedas del bot.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA NORMAL CUANDO YA EXISTE AL MENOS UNA EMPRESA REGISTRADA
  // =========================================================================
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
              onClick={() => {
                setCsfUploadedUrl('');
                setCsfFileName('');
                setCsfError('');
                setIsNewCompanyModalOpen(true);
              }}
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
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Distintivo de Verificación Fiscal SAT */}
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verificada SAT</span>
            </span>

            {/* Enlace para consultar CSF */}
            {selectedCompany?.constancia_fiscal_url && (
              <a
                href={selectedCompany.constancia_fiscal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition"
                title="Ver Constancia de Situación Fiscal de esta planta"
              >
                <FileText className="w-3 h-3 text-emerald-600" />
                <span>Ver Constancia Fiscal</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>{companies.length} empresa{companies.length === 1 ? '' : 's'} vinculada{companies.length === 1 ? '' : 's'}</span>
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

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Ubicación de Planta</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm font-black text-slate-900 block truncate">{selectedCompany?.municipio || 'Apodaca'}</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-slate-400">Nuevo León, México</span>
                {selectedCompany?.latitud && selectedCompany?.longitud ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>GPS Listo</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <span>Sin GPS</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="mt-3 w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <MapPin className="w-3 h-3 text-blue-600" />
            <span>{selectedCompany?.latitud ? 'Ajustar en Mapa' : 'Ubicar en Mapa'}</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verificación Fiscal</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs font-black text-slate-900 block truncate font-mono">
              RFC: {selectedCompany?.rfc || 'Validado SAT'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{selectedCompany?.sat_validado ? 'SAT Validado (Activo)' : 'CSF Registrada'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* TARJETA DE DATOS FISCALES OFICIALES SAT DE LA PLANTA ACTIVA */}
      {selectedCompany && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden border border-emerald-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 rounded-2xl shadow-xs shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-black text-white">
                      {selectedCompany.razon_social || selectedCompany.nombre}
                    </span>
                    {selectedCompany.regimen_capital && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({selectedCompany.regimen_capital})
                      </span>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                      {selectedCompany.estatus_padron || 'ACTIVO'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-400/90 font-mono mt-0.5">
                    <span>RFC: {selectedCompany.rfc || 'No registrado'}</span>
                    {selectedCompany.idcif && (
                      <>
                        <span className="text-slate-500">&bull;</span>
                        <span>idCIF: {selectedCompany.idcif}</span>
                      </>
                    )}
                    {selectedCompany.codigo_postal && (
                      <>
                        <span className="text-slate-500">&bull;</span>
                        <span>C.P. {selectedCompany.codigo_postal}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 px-3.5 py-1.5 rounded-xl shadow-xs transition"
                  title="Ubicar la planta en el mapa y ajustar coordenadas GPS"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedCompany.latitud ? '📍 Ajustar Mapa' : '📍 Ubicar en Mapa'}</span>
                </button>
                {selectedCompany.sat_url_validacion && (
                  <a
                    href={selectedCompany.sat_url_validacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition"
                    title="Consultar folio en el validador oficial del SAT"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Verificar QR en SAT</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                  </a>
                )}
                {selectedCompany.constancia_fiscal_url && (
                  <a
                    href={selectedCompany.constancia_fiscal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-xl transition"
                    title="Ver Constancia de Situación Fiscal descargada"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Constancia PDF</span>
                  </a>
                )}
              </div>
            </div>

            {(selectedCompany.direccion || selectedCompany.regimen_fiscal || selectedCompany.latitud) && (
              <div className="pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                {selectedCompany.direccion && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Domicilio de la Planta</span>
                      <span className="text-slate-200 text-[11px] leading-snug">{selectedCompany.direccion}</span>
                      {selectedCompany.latitud && selectedCompany.longitud && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                          <span>GPS: {Number(selectedCompany.latitud).toFixed(4)}, {Number(selectedCompany.longitud).toFixed(4)}</span>
                          <span className="text-emerald-500">&bull;</span>
                          <span className="text-emerald-400 font-sans font-semibold">Ubicación registrada</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedCompany.regimen_fiscal && (
                  <div className="flex items-start gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Régimen Fiscal Oficial</span>
                      <span className="text-slate-200 text-[11px] leading-snug">{selectedCompany.regimen_fiscal}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* SECCIÓN DE GESTIÓN DE TURNOS LABORALES DE PLANTA */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Turnos Laborales de la Planta</h2>
            </div>
            <p className="text-xs text-slate-500">
              Configura los horarios de producción y cuadrillas para esta planta. Se sincronizan automáticamente con las Rutas de Transporte.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateShift}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Turno</span>
          </button>
        </div>

        {loadingShifts ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Cargando turnos de la planta...</span>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl inline-flex">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-slate-800">No hay turnos registrados</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Registra los turnos de trabajo de tu planta (ej. Matutino 06:00 a 14:00, Vespertino, etc.) para vincularlos a las rutas de transporte de personal.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateShift}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
            >
              Crear Primer Turno
            </button>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition shadow-2xs space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-black text-slate-900 block truncate">
                      {shift.nombre}
                    </span>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                      {shift.tipo || 'Fijo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditShift(shift)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Editar turno"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(shift.id, shift.nombre)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar turno"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800">
                      {shift.hora_entrada} &mdash; {shift.hora_salida}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{shift.dias || 'Lunes a Sábado'}</span>
                  </div>

                  {shift.descripcion && (
                    <p className="text-[11px] text-slate-500 italic pt-1 leading-snug">
                      "{shift.descripcion}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* MODAL 2: NUEVA EMPRESA / PLANTA CON CARGA DE CSF */}
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
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Nueva Empresa o Planta</h3>
                <p className="text-xs text-slate-500">Agrega otra nave industrial con su Constancia Fiscal (SAT)</p>
              </div>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-3.5 pt-1">
              {/* SUBIDA DE CSF EN MODAL */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Constancia de Situación Fiscal (SAT) *
                </label>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsfUpload(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                />

                {!csfUploadedUrl ? (
                  <div
                    onClick={() => modalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50/60 transition"
                  >
                    {csfUploading ? (
                      <div className="flex items-center justify-center gap-2 py-2 text-center">
                        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                        <span className="text-xs font-bold text-slate-700">Validando QR con el SAT en vivo...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          Selecciona la Constancia Fiscal (PDF o Imagen)
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {csfFileName || 'Constancia_Fiscal.pdf'}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{satValidated ? 'Validado con el SAT exitosamente' : 'Archivo cargado correctamente'}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCsfUploadedUrl('');
                        setCsfFileName('');
                        setSatData(null);
                        setSatValidated(false);
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {renderSatCard()}
                {csfError && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">⚠️ {csfError}</p>
                )}
              </div>

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
                    RFC de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. WPL990101XYZ"
                    value={newCompRfc}
                    onChange={(e) => setNewCompRfc(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs uppercase font-mono text-slate-800"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Régimen Fiscal (SAT)
                  </label>
                  <select
                    value={newCompRegimen}
                    onChange={(e) => setNewCompRegimen(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    {REGIMENES_SAT.map(r => (
                      <option key={r} value={r}>{r}</option>
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
                  disabled={savingCompany || !newCompName.trim() || !csfUploadedUrl}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
                >
                  {savingCompany ? 'Guardando...' : 'Guardar y Validar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR EMPRESA ACTUAL */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
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
              {/* ESTADO DE CONSTANCIA FISCAL */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Constancia Fiscal (CSF)</span>
                  {selectedCompany.constancia_fiscal_url ? (
                    <a
                      href={selectedCompany.constancia_fiscal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Ver archivo actual</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-bold">Sin constancia</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="edit-csf-file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsfUpload(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                    className="hidden"
                  />
                  <label
                    htmlFor="edit-csf-file"
                    className="cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{csfUploading ? 'Subiendo...' : 'Actualizar / Reemplazar archivo fiscal'}</span>
                  </label>
                  {csfUploadedUrl && (
                    <span className="text-[11px] text-emerald-600 font-bold">
                      ✅ Nuevo archivo cargado
                    </span>
                  )}
                </div>
              </div>

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
                  <label className="block text-xs font-bold text-slate-700 mb-1">RFC del SAT</label>
                  <input
                    type="text"
                    value={selectedCompany.rfc || ''}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, rfc: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs uppercase font-mono text-slate-800"
                  />
                </div>

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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industria o Giro</label>
                <input
                  type="text"
                  value={selectedCompany.industria || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, industria: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                />
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

              {/* UBICACIÓN EN MAPA GPS */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block">Ubicación en Mapa & GPS</span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {selectedCompany.latitud ? `Lat: ${Number(selectedCompany.latitud).toFixed(4)}, Lon: ${Number(selectedCompany.longitud).toFixed(4)}` : 'Sin coordenadas GPS fijadas'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{selectedCompany.latitud ? 'Ajustar Pin' : 'Fijar en Mapa'}</span>
                </button>
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

      {/* MODAL: AGREGAR O EDITAR TURNO LABORAL */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
            <button
              onClick={() => setIsShiftModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingShift ? 'Editar Turno Laboral' : 'Nuevo Turno de Planta'}
                </h3>
                <p className="text-xs text-slate-500">
                  Planta: <strong>{selectedCompany?.nombre}</strong>
                </p>
              </div>
            </div>

            {shiftError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{shiftError}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Turno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Turno 1 (Matutino) o Turno 12h Cuadrilla A"
                  value={shiftNombre}
                  onChange={(e) => setShiftNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Entrada *
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftHoraEntrada}
                    onChange={(e) => setShiftHoraEntrada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs font-bold font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Salida *
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftHoraSalida}
                    onChange={(e) => setShiftHoraSalida(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs font-bold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Días Laborales
                  </label>
                  <select
                    value={shiftDias}
                    onChange={(e) => setShiftDias(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    <option value="Lunes a Sábado">Lunes a Sábado</option>
                    <option value="Lunes a Viernes">Lunes a Viernes</option>
                    <option value="4x3 (Jornada 12 Horas)">4x3 (Jornada 12 Horas)</option>
                    <option value="3x4 (Jornada 12 Horas)">3x4 (Jornada 12 Horas)</option>
                    <option value="Fines de Semana">Fines de Semana</option>
                    <option value="Rotativo según rol">Rotativo según rol</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Turno
                  </label>
                  <select
                    value={shiftTipo}
                    onChange={(e) => setShiftTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    <option value="Fijo">Fijo</option>
                    <option value="Rolado">Rolado</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Nocturno">Nocturno</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción o Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Incluye bono de puntualidad y transporte a puerta de planta"
                  value={shiftDescripcion}
                  onChange={(e) => setShiftDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingShift || !shiftNombre.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {savingShift ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingShift ? 'Actualizar Turno' : 'Guardar Turno'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UBICACIÓN EXACTA DE PLANTA EN MAPA (LEAFLET) */}
      <CompanyLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        company={selectedCompany}
        onSaved={(updatedComp) => {
          setSelectedCompany(prev => ({ ...prev, ...updatedComp }));
          setCompanies(prev => prev.map(c => c.id === updatedComp.id ? { ...c, ...updatedComp } : c));
          if (onCompanyChanged) onCompanyChanged(updatedComp);
        }}
      />
    </div>
  );
}
