import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Send, MapPin, Clock, Bus, Camera, Building2, ChevronUp, Phone, Flag } from 'lucide-react';
import { trackWhatsappClick } from '../../services/api';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 60) return `hace ${diffInMins} min`;
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  return `hace ${diffInDays} d`;
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '';
  return amount.toLocaleString('es-MX');
};

const FeedCard = ({ job, onLike, onOpenComments, onApply, onReport, currentUser, isActive }) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLikeClick = (e) => {
    e.stopPropagation();
    setLikeAnimating(true);
    onLike(job.id);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  const isCommunity = job.origen === 'foto_comunitaria';
  const liked = job.user_liked;

  const photoUrl = job.has_photo ? `/api/v1/feed/${job.id}/photo` : null;

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden flex flex-col justify-end pb-20 px-4">
      {/* Foto de fondo (si existe) */}
      {photoUrl && (
        <>
          <img
            src={photoUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        </>
      )}
      {/* Top Left Indicator */}
      <div className="absolute top-6 left-4 z-10">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${isCommunity ? 'bg-lime-900/50 text-lime-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
          {isCommunity ? <Camera size={14} /> : <Building2 size={14} />}
          {isCommunity ? 'Comunitaria' : 'Empresa'}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-3 max-w-[80%] z-10 relative drop-shadow-lg">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">{job.empresa_nombre || 'Empresa Anónima'}</h3>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{job.titulo}</h1>
        </div>

        <div>
          {job.sueldo_semanal_libre ? (
            <p className="text-2xl font-bold text-lime-400">
              ${formatCurrency(job.sueldo_semanal_libre)} <span className="text-sm font-normal text-lime-400/80">/sem</span>
            </p>
          ) : (
            <p className="text-lg text-slate-400">Sueldo por confirmar</p>
          )}
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1.5 rounded text-slate-200">
            <MapPin size={14} /> {job.municipio || 'No especificado'}
          </div>
          {job.tipo_turno && (
            <div className="flex items-center gap-1 bg-white/10 px-2 py-1.5 rounded text-slate-200">
              <Clock size={14} /> {job.tipo_turno}
            </div>
          )}
          {job.transporte_incluido && (
            <div className="flex items-center gap-1 bg-white/10 px-2 py-1.5 rounded text-slate-200">
              <Bus size={14} /> Transporte
            </div>
          )}
        </div>

        {/* Description */}
        <div className="text-sm text-slate-300">
          <p className={showFullDesc ? '' : 'line-clamp-3'}>{job.descripcion}</p>
          <button 
            onClick={() => setShowFullDesc(!showFullDesc)}
            className="text-emerald-400 font-medium mt-1 text-xs hover:underline"
          >
            {showFullDesc ? 'ver menos' : 'ver más'}
          </button>
        </div>

        {/* Meta info */}
        <div className="text-xs text-slate-500 flex flex-col gap-1 mt-2">
          {job.reportada_por && <p>Reportada por {job.reportada_por}</p>}
          <p>{formatRelativeTime(job.created_at)}</p>
        </div>
      </div>

      {/* Right Sidebar Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        <button 
          onClick={handleLikeClick} 
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`p-3 rounded-full bg-slate-800/60 backdrop-blur-sm transition-transform ${likeAnimating ? 'scale-125' : ''}`}>
            <Heart 
              size={28} 
              className={`transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-400'}`} 
            />
          </div>
          <span className="text-xs font-semibold drop-shadow-md">{job.likes_count || 0}</span>
        </button>

        <button 
          onClick={() => onOpenComments(job)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 rounded-full bg-slate-800/60 backdrop-blur-sm">
            <MessageSquare size={28} className="text-white group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="text-xs font-semibold drop-shadow-md">{job.comments_count || 0}</span>
        </button>

        {isCommunity ? (
          (job.fuente_contacto_telefono || job.fuente_contacto_whatsapp) ? (
            <a 
              href={job.fuente_contacto_whatsapp 
                ? `https://wa.me/52${job.fuente_contacto_whatsapp.toString().replace(/\D/g,'')}?text=${encodeURIComponent(`¡Hola! Vi su vacante de ${job.titulo} anunciada en ChambaChat.com y me interesa postularme. Mi nombre es ${currentUser?.nombre || currentUser?.full_name || 'un candidato'}.`)}`
                : `tel:${job.fuente_contacto_telefono}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsappClick(job.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-emerald-600/80 backdrop-blur-sm">
                <Send size={28} className="text-white group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold drop-shadow-md">Postularme</span>
            </a>
          ) : (
            <button 
              onClick={() => alert('No se detectó un número de teléfono o WhatsApp en esta lona/vacante.')}
              className="flex flex-col items-center gap-1 group opacity-60"
            >
              <div className="p-3 rounded-full bg-slate-600/80 backdrop-blur-sm">
                <Send size={28} className="text-white group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold drop-shadow-md text-slate-300">Sin Contacto</span>
            </button>
          )
        ) : (
          <button 
            onClick={() => onApply(job)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-emerald-600/80 backdrop-blur-sm">
              <Send size={28} className="text-white group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-semibold drop-shadow-md">Postularme</span>
          </button>
        )}

        <button
          onClick={() => onReport && onReport(job.id)}
          className="flex flex-col items-center gap-1 group opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="p-2 rounded-full bg-slate-800/40 backdrop-blur-sm">
            <Flag size={20} className="text-white group-hover:text-red-400 transition-colors" />
          </div>
          <span className="text-[10px] font-semibold drop-shadow-md">Reportar</span>
        </button>
      </div>

      {/* Swipe up indicator */}
      {isActive && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center animate-pulse opacity-70 z-10 pointer-events-none">
          <div className="flex flex-col items-center text-slate-400 text-xs">
            <ChevronUp size={20} />
            Desliza hacia arriba
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedCard;
