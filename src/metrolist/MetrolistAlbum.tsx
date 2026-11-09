/**
 * Metrolist 13.7.0 - Página de Álbum (MetrolistAlbum)
 * Portada ampliada, metadatos, tracklist oficial con duraciones y reproducción interactiva.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Share2,
  Disc,
  Clock,
  Check,
  Music,
  Plus
} from 'lucide-react';
import { MetrolistAlbum as MetrolistAlbumType, MetrolistSong, MetrolistNavView } from './types';
import { fetchAlbumDetails } from './metrolistService';

interface MetrolistAlbumProps {
  browseId: string;
  albumTitle?: string;
  onPlaySong: (song: MetrolistSong, queue?: MetrolistSong[]) => void;
  onNavigate: (view: MetrolistNavView) => void;
  onBack: () => void;
  onAddToQueue?: (song: MetrolistSong) => void;
}

export const MetrolistAlbum: React.FC<MetrolistAlbumProps> = ({
  browseId,
  albumTitle,
  onPlaySong,
  onNavigate,
  onBack,
  onAddToQueue
}) => {
  const [album, setAlbum] = useState<MetrolistAlbumType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchAlbumDetails(browseId)
      .then((data) => {
        if (isMounted) {
          setAlbum(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Error cargando álbum');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [browseId]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://music.youtube.com/browse/${browseId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayAll = () => {
    if (album && album.tracks.length > 0) {
      onPlaySong(album.tracks[0], album.tracks);
    }
  };

  const handleShuffle = () => {
    if (album && album.tracks.length > 0) {
      const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
      onPlaySong(shuffled[0], shuffled);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pt-2 select-none">
        <button onClick={onBack} className="p-2 rounded-full bg-neutral-800 text-neutral-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-48 h-48 bg-white/5 rounded-3xl"></div>
          <div className="space-y-3 flex-1">
            <div className="h-6 bg-white/5 rounded w-3/4"></div>
            <div className="h-4 bg-white/5 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2 pt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="py-16 text-center space-y-4 select-none">
        <button onClick={onBack} className="p-2 rounded-full bg-neutral-800 text-neutral-300 mx-auto block">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold text-rose-400">{error || 'No se pudo cargar el álbum'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-full bg-neutral-800 text-xs font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Botón Volver */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition active:scale-95"
          title="Regresar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleShare}
          className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-[#1ED760]" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Enlace copiado' : 'Compartir'}</span>
        </button>
      </div>

      {/* Cabecera del Álbum */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-neutral-900/80 border border-white/10 shadow-2xl relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl scale-125"
          style={{ backgroundImage: `url(${album.thumbnail})` }}
        />
        <div className="absolute inset-0 bg-neutral-950/70" />

        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/15">
          <img src={album.thumbnail} alt={album.title} className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 text-center sm:text-left min-w-0 flex-1 space-y-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block">
            Álbum
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {album.title}
          </h1>
          <p className="text-sm font-semibold text-neutral-300">
            {album.artist} {album.year ? `• ${album.year}` : ''} • {album.trackCount || album.tracks.length} canciones
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
            <button
              onClick={handlePlayAll}
              className="px-5 py-2.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-black ml-0.5" />
              <span>Reproducir todo</span>
            </button>
            <button
              onClick={handleShuffle}
              className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 border border-white/10 active:scale-95 transition"
            >
              <Shuffle className="w-4 h-4 text-[#1ED760]" />
              <span>Aleatorio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracklist del Álbum */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 pb-2">
          <div className="flex items-center gap-4">
            <span className="w-6 text-center">#</span>
            <span>Título</span>
          </div>
          <Clock className="w-4 h-4" />
        </div>

        <div className="space-y-1">
          {album.tracks.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => onPlaySong(track, album.tracks)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-900 group transition cursor-pointer active:scale-[0.99] border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500 group-hover:hidden">
                  {idx + 1}
                </span>
                <div className="w-6 hidden group-hover:flex items-center justify-center">
                  <Play className="w-4 h-4 text-[#1ED760] fill-[#1ED760]" />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                    {track.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                    {track.artist || album.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {onAddToQueue && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToQueue(track);
                    }}
                    className="p-1.5 text-neutral-500 hover:text-white transition rounded-full hover:bg-neutral-800 opacity-0 group-hover:opacity-100"
                    title="Agregar a la cola"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-mono text-neutral-400">
                  {track.durationFormatted || '--:--'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MetrolistAlbum;
