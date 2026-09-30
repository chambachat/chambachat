import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import FeedCard from './FeedCard';
import TikTokFeedCard from './TikTokFeedCard';
import JobComments from '../Jobs/JobComments';
import PhotoUploadButton from '../Chat/PhotoUploadButton';
import { getFeedJobs, toggleJobLike, reportJob, trackJobView } from '../../services/api';

const JobFeedView = ({ currentUser, onStartDirectChat, onOpenAuth, onPhotoSelected }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeJobComments, setActiveJobComments] = useState(null);

  // Búsqueda
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const searchInputRef = useRef(null);

  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const limit = 10;

  // Semilla de sesión: genera un orden único cada vez que entras al feed
  const sessionSeedRef = useRef(Math.floor(Math.random() * 999999));

  const loadJobs = async (currentOffset, query = activeQuery) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const newJobs = await getFeedJobs(currentOffset, limit, query, sessionSeedRef.current);
      if (newJobs.length < limit) {
        setHasMore(false);
      }
      setJobs(prev => currentOffset === 0 ? newJobs : [...prev, ...newJobs]);
      setOffset(currentOffset + limit);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al abrir la búsqueda, enfocar el input
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    setActiveQuery(q);
    setJobs([]);
    setOffset(0);
    setHasMore(true);
    setActiveIndex(0);
    sessionSeedRef.current = Math.floor(Math.random() * 999999); // nuevo shuffle
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setLoading(false);
    setTimeout(() => loadJobs(0, q), 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
    setSearchOpen(false);
    setJobs([]);
    setOffset(0);
    setHasMore(true);
    setActiveIndex(0);
    sessionSeedRef.current = Math.floor(Math.random() * 999999); // nuevo shuffle
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setLoading(false);
    setTimeout(() => loadJobs(0, ''), 0);
  };

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      loadJobs(offset);
    }
  }, [hasMore, loading, offset]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (observerRef.current) observer.observe(observerRef.current);
    
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [handleObserver]);

  // Track active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  // Track vistas de vacantes
  useEffect(() => {
    const job = jobs[activeIndex];
    if (job?.id) trackJobView(job.id);
  }, [activeIndex, jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = async (jobId) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const isLiked = !job.user_liked;
        return {
          ...job,
          user_liked: isLiked,
          likes_count: job.likes_count + (isLiked ? 1 : -1)
        };
      }
      return job;
    }));

    try {
      await toggleJobLike(jobId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleApply = async (job) => {
    if (!currentUser) {
      onOpenAuth();
    } else {
      try {
        await onStartDirectChat(job);
      } catch (err) {
        alert(err.message || 'Error al postularse a la vacante.');
      }
    }
  };

  const handleReport = async (jobId) => {
    if (!currentUser) { onOpenAuth(); return; }
    if (!window.confirm('¿Deseas reportar esta vacante como falsa, ofensiva o spam?')) return;
    try {
      const res = await reportJob(jobId);
      alert(res.message);
      if (res.paused) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const closeComments = () => setActiveJobComments(null);

  if (!loading && jobs.length === 0 && !activeQuery) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-xl mb-4">No hay vacantes disponibles</p>
        <button 
          onClick={() => { setOffset(0); setHasMore(true); loadJobs(0); }}
          className="bg-emerald-600 px-4 py-2 rounded-lg font-medium"
        >
          Refrescar
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      {/* ─── Barra de búsqueda (esquina superior derecha) ─── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {searchOpen ? (
          <div className="flex items-center bg-black/70 backdrop-blur-md rounded-full border border-white/20 overflow-hidden animate-in slide-in-from-right">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar vacante..."
              className="bg-transparent text-white text-xs placeholder-white/50 px-3 py-2 w-44 sm:w-56 outline-none"
            />
            {(searchQuery || activeQuery) && (
              <button
                onClick={handleClearSearch}
                className="p-1.5 text-white/60 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleSearch}
              className="p-2 text-emerald-400 hover:text-emerald-300 transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/70 transition border border-white/10"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Badge de búsqueda activa */}
      {activeQuery && (
        <div className="absolute top-14 right-3 z-30">
          <button
            onClick={handleClearSearch}
            className="flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30"
          >
            <span>🔍 "{activeQuery}"</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Sin resultados de búsqueda */}
      {!loading && jobs.length === 0 && activeQuery && (
        <div className="h-full flex flex-col items-center justify-center text-white p-4">
          <p className="text-lg font-bold mb-2">No hay resultados para "{activeQuery}"</p>
          <p className="text-sm text-white/60 mb-4">Intenta con otra palabra o categoría</p>
          <button 
            onClick={handleClearSearch}
            className="bg-emerald-600 px-4 py-2 rounded-lg font-medium text-sm"
          >
            Ver todas las vacantes
          </button>
        </div>
      )}

      {/* Feed Container */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {jobs.map((job, index) => (
          <div 
            key={`${job.id}-${index}`} 
            className="h-full w-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            {job.is_tiktok ? (
              <TikTokFeedCard 
                video={job} 
                isActive={index === activeIndex} 
              />
            ) : (
              <FeedCard 
                job={job}
                currentUser={currentUser}
                isActive={index === activeIndex}
                onLike={handleLike}
                onOpenComments={setActiveJobComments}
                onApply={handleApply}
                onReport={handleReport}
              />
            )}
          </div>
        ))}

        {/* Loading trigger element */}
        {hasMore && (
          <div ref={observerRef} className="h-20 flex justify-center items-center text-emerald-400 bg-slate-900" style={{ scrollSnapAlign: 'start' }}>
            <div className="animate-spin h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Floating Photo Upload Button */}
      {onPhotoSelected && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-30 pointer-events-none drop-shadow-xl">
          <div className="pointer-events-auto flex items-center bg-white pl-4 pr-1 py-1 rounded-full shadow-2xl border border-slate-200/50 gap-2">
            <span className="text-sm font-bold text-slate-700 tracking-tight">📸 Cazar chamba</span>
            <PhotoUploadButton onPhotoSelected={onPhotoSelected} disabled={false} menuCenter={true} />
          </div>
        </div>
      )}

      {/* Comments Bottom Sheet Modal */}
      {activeJobComments && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40 transition-opacity"
            onClick={closeComments}
          />
          <div className="fixed bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-2xl z-50 overflow-hidden flex flex-col shadow-xl transform transition-transform">
            <div className="flex justify-center p-3 cursor-pointer" onClick={closeComments}>
              <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <JobComments 
                jobId={activeJobComments.id} 
                currentUser={currentUser}
                onCommentAdded={() => {
                  setJobs(prev => prev.map(j =>
                    j.id === activeJobComments.id
                      ? { ...j, comments_count: (j.comments_count || 0) + 1 }
                      : j
                  ));
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default JobFeedView;
