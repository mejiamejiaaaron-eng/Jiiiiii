/**
 * Metrolist 13.7.0 - Reproductor Musical Integrado (MetrolistPlayer)
 * Mini-player desacoplable y reproductor completo con letras sincronizadas, cola y controles de reproducción.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Heart,
  Share2,
  Mic,
  Clock,
  Sparkles,
  Check,
  Disc,
  Info
} from 'lucide-react';
import { MetrolistSong, LyricsResponse, MetrolistNavView } from './types';
import { fetchTrackLyrics } from './metrolistService';

interface MetrolistPlayerProps {
  currentSong: MetrolistSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenQueue: () => void;
  onNavigate: (view: MetrolistNavView) => void;
}

export const MetrolistPlayer: React.FC<MetrolistPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onOpenQueue,
  onNavigate
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const lyricsScrollRef = useRef<HTMLDivElement>(null);

  // Formato mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Cargar letras cuando cambia de canción
  useEffect(() => {
    if (!currentSong) {
      setLyricsData(null);
      return;
    }

    setLoadingLyrics(true);
    fetchTrackLyrics(currentSong.title, currentSong.artist)
      .then((data) => {
        setLyricsData(data);
        setLoadingLyrics(false);
      })
      .catch(() => {
        setLyricsData(null);
        setLoadingLyrics(false);
      });
  }, [currentSong?.id]);

  // Auto-scroll de letras sincronizadas
  useEffect(() => {
    if (!showLyrics || !lyricsData?.lines || lyricsData.lines.length === 0) return;
    const currentMs = currentTime * 1000;
    const activeIndex = lyricsData.lines.findIndex((line, i) => {
      const nextLine = lyricsData.lines![i + 1];
      if (nextLine) {
        return currentMs >= line.timeMs && currentMs < nextLine.timeMs;
      }
      return currentMs >= line.timeMs;
    });

    if (activeIndex >= 0 && lyricsScrollRef.current) {
      const activeEl = lyricsScrollRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, showLyrics, lyricsData]);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <>
      {/* ========================================================
          1. MINI PLAYER DOCK (Diseño Metrolist sobre la barra inferior)
          ======================================================== */}
      {!isExpanded && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-2 right-2 sm:left-4 sm:right-4 z-40 select-none">
          <div
            onClick={() => setIsExpanded(true)}
            className="p-2 sm:p-2.5 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800/95 border border-white/10 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99] relative overflow-hidden"
          >
            {/* Portada + Título + Artista */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 shadow relative">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : 'scale-100'} transition duration-500`}
                />
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {currentSong.title}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Controles del Mini Player */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={onOpenQueue}
                className="p-2 text-neutral-400 hover:text-white transition rounded-full"
                title="Cola de reproducción"
              >
                <ListMusic className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-md active:scale-90 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                className="p-2 text-neutral-400 hover:text-white transition active:scale-90"
                title="Siguiente pista"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>

            {/* Línea de progreso interactiva fijada al borde inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10">
              <div
                className="h-full bg-[#1ED760] transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. EXPANDED FULL-SCREEN PLAYER (Estilo Metrolist 13.7.0)
          ======================================================== */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between p-4 sm:p-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] overflow-y-auto animate-slide-up select-none">
          {/* Fondo difuminado dinámico con la portada */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${currentSong.thumbnail})` }}
          />
          <div className="absolute inset-0 bg-neutral-950/80 pointer-events-none" />

          {/* Barra superior de control */}
          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition active:scale-95"
              title="Minimizar reproductor"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center min-w-0 px-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1ED760] bg-[#1ED760]/10 px-2 py-0.5 rounded-full border border-[#1ED760]/20">
                Metrolist Player
              </span>
              <p className="text-xs text-neutral-400 font-semibold truncate mt-0.5">
                {currentSong.album || 'Reproducción en streaming'}
              </p>
            </div>

            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentSong.id}`);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }
              }}
              className="p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition active:scale-95"
              title="Compartir canción"
            >
              {copiedShare ? <Check className="w-5 h-5 text-[#1ED760]" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Área Central: Portada o Vista de Letras */}
          <div className="relative z-10 my-auto py-4 flex flex-col items-center justify-center max-w-md mx-auto w-full">
            {!showLyrics ? (
              /* Portada en Alta Resolución */
              <div className="w-full max-w-[320px] sm:max-w-[360px] aspect-square rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/10 relative group">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-neutral-300 border border-white/10 flex items-center gap-1">
                  <Disc className="w-3 h-3 text-[#1ED760] animate-spin" />
                  <span>Opus 160k Hi-Fi</span>
                </div>
              </div>
            ) : (
              /* Vista de Letras (Lyrics Drawer) */
              <div className="w-full h-[320px] sm:h-[360px] bg-neutral-900/90 rounded-3xl border border-white/10 p-5 overflow-y-auto shadow-2xl relative">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 sticky top-0 bg-neutral-900/90 backdrop-blur z-10">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#1ED760]" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Letras</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {lyricsData?.source === 'lrclib' ? 'Sincronizadas con LRCLIB' : 'Texto completo'}
                  </span>
                </div>

                {loadingLyrics ? (
                  <div className="py-16 text-center text-xs text-neutral-400 animate-pulse">
                    Cargando letras musicales...
                  </div>
                ) : lyricsData?.lines && lyricsData.lines.length > 0 ? (
                  <div ref={lyricsScrollRef} className="space-y-4 py-8 text-center">
                    {lyricsData.lines.map((line, idx) => {
                      const currentMs = currentTime * 1000;
                      const nextLine = lyricsData.lines![idx + 1];
                      const isActive = nextLine
                        ? currentMs >= line.timeMs && currentMs < nextLine.timeMs
                        : currentMs >= line.timeMs;

                      return (
                        <p
                          key={idx}
                          onClick={() => onSeek(line.timeMs / 1000)}
                          className={`text-sm sm:text-base font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'text-[#1ED760] scale-105 font-black drop-shadow-[0_0_12px_rgba(30,215,96,0.5)]'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {line.text || '♪'}
                        </p>
                      );
                    })}
                  </div>
                ) : lyricsData?.plainLyrics ? (
                  <div className="whitespace-pre-line text-sm text-neutral-300 font-medium leading-relaxed text-center py-4">
                    {lyricsData.plainLyrics}
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-neutral-500 space-y-2">
                    <Mic className="w-8 h-8 mx-auto opacity-40" />
                    <p>No se encontraron letras disponibles para este tema.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Inferior: Información + Barra de Progreso + Controles */}
          <div className="relative z-10 max-w-md mx-auto w-full space-y-4">
            {/* Título + Artista + Botón Favorito / Letras */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                  {currentSong.title}
                </h2>
                <button
                  onClick={() => {
                    if (currentSong.artistId) {
                      setIsExpanded(false);
                      onNavigate({ type: 'artist', browseId: currentSong.artistId, name: currentSong.artist });
                    }
                  }}
                  className="text-sm font-semibold text-neutral-300 hover:text-[#1ED760] transition truncate block mt-0.5"
                >
                  {currentSong.artist}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2.5 rounded-full transition ${
                    showLyrics ? 'bg-[#1ED760] text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                  title="Mostrar/ocultar letras"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-2.5 rounded-full bg-neutral-800 transition ${
                    isFavorite ? 'text-rose-500' : 'text-neutral-300 hover:text-white'
                  }`}
                  title="Me gusta"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Barra de Progreso Scrubbable */}
            <div className="space-y-1">
              <div
                className="relative h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * duration);
                }}
              >
                <div
                  className="h-full bg-[#1ED760] group-hover:bg-[#1fdf64] transition-all rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono font-medium text-neutral-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controles Principales (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center justify-between pt-1">
              {/* Aleatorio */}
              <button
                type="button"
                onClick={onToggleShuffle}
                className={`p-2 transition rounded-full ${
                  isShuffle ? 'text-[#1ED760]' : 'text-neutral-400 hover:text-white'
                }`}
                title={isShuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Anterior */}
              <button
                type="button"
                onClick={onPrev}
                className="p-3 text-neutral-200 hover:text-white transition active:scale-90"
                title="Pista anterior"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              {/* Play / Pause Principal */}
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-xl active:scale-95 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-black" />
                ) : (
                  <Play className="w-8 h-8 fill-black ml-1" />
                )}
              </button>

              {/* Siguiente */}
              <button
                type="button"
                onClick={onNext}
                className="p-3 text-neutral-200 hover:text-white transition active:scale-90"
                title="Siguiente pista"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              {/* Repetir */}
              <button
                type="button"
                onClick={onCycleRepeat}
                className={`p-2 transition rounded-full ${
                  repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-neutral-400 hover:text-white'
                }`}
                title={`Modo repetición: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Acciones Secundarias (Cola, Volumen) */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onOpenQueue}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/80 text-xs font-bold text-neutral-300 hover:text-white transition"
              >
                <ListMusic className="w-4 h-4 text-[#1ED760]" />
                <span>Ver cola</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-1.5 text-neutral-400 hover:text-white transition"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-[#1ED760] cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MetrolistPlayer;
