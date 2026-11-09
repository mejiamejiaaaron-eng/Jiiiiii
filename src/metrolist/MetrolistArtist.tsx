/**
 * Metrolist 13.7.0 - Página de Artista (MetrolistArtist)
 * Cabecera inmersiva, canciones principales, discografía y artistas relacionados.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Share2,
  Users,
  Disc,
  Music,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MetrolistArtist as MetrolistArtistType, MetrolistSong, MetrolistNavView } from './types';
import { fetchArtistDetails } from './metrolistService';

interface MetrolistArtistProps {
  browseId: string;
  artistName?: string;
  onPlaySong: (song: MetrolistSong, queue?: MetrolistSong[]) => void;
  onNavigate: (view: MetrolistNavView) => void;
  onBack: () => void;
}

export const MetrolistArtist: React.FC<MetrolistArtistProps> = ({
  browseId,
  artistName,
  onPlaySong,
  onNavigate,
  onBack
}) => {
  const [artist, setArtist] = useState<MetrolistArtistType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedBio, setExpandedBio] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchArtistDetails(browseId)
      .then((data) => {
        if (isMounted) {
          setArtist(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Error cargando artista');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [browseId]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://music.youtube.com/channel/${browseId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayAll = () => {
    if (artist && artist.topSongs.length > 0) {
      onPlaySong(artist.topSongs[0], artist.topSongs);
    }
  };

  const handleShuffle = () => {
    if (artist && artist.topSongs.length > 0) {
      const shuffled = [...artist.topSongs].sort(() => Math.random() - 0.5);
      onPlaySong(shuffled[0], shuffled);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pt-2 select-none">
        <button onClick={onBack} className="p-2 rounded-full bg-neutral-800 text-neutral-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-48 bg-white/5 rounded-3xl"></div>
        <div className="h-6 bg-white/5 rounded w-40"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="py-16 text-center space-y-4 select-none">
        <button onClick={onBack} className="p-2 rounded-full bg-neutral-800 text-neutral-300 mx-auto block">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold text-rose-400">{error || 'No se pudo cargar la información del artista'}</p>
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

      {/* Cabecera Inmersiva de Artista */}
      <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl">
        {artist.banner && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-xl scale-110"
            style={{ backgroundImage: `url(${artist.banner})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />

        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl shrink-0 border-4 border-white/10">
          <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 text-center sm:text-left min-w-0 flex-1 space-y-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/30 inline-block">
            Artista Oficial
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
            {artist.name}
          </h1>
          {artist.subscribers && (
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              {artist.subscribers}
            </p>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={handlePlayAll}
              className="px-5 py-2.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-black ml-0.5" />
              <span>Reproducir</span>
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

      {/* Biografía / Descripción */}
      {artist.description && (
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/5 space-y-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Acerca del artista</h3>
          <p
            className={`text-xs text-neutral-300 leading-relaxed ${
              expandedBio ? '' : 'line-clamp-3'
            }`}
          >
            {artist.description}
          </p>
          <button
            onClick={() => setExpandedBio(!expandedBio)}
            className="text-xs font-bold text-[#1ED760] flex items-center gap-1 hover:underline"
          >
            <span>{expandedBio ? 'Mostrar menos' : 'Leer biografía completa'}</span>
            {expandedBio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* CANCIONES PRINCIPALES */}
      {artist.topSongs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#1ED760]" />
              <h2 className="text-lg font-black text-white tracking-tight">Canciones más escuchadas</h2>
            </div>
            <span className="text-xs text-neutral-400 font-semibold">{artist.topSongs.length} pistas</span>
          </div>

          <div className="space-y-1.5">
            {artist.topSongs.map((song, index) => (
              <div
                key={song.id}
                onClick={() => onPlaySong(song, artist.topSongs)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-900 group transition cursor-pointer active:scale-[0.99] border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500 group-hover:hidden">
                    {index + 1}
                  </span>
                  <div className="w-5 hidden group-hover:flex items-center justify-center">
                    <Play className="w-4 h-4 text-[#1ED760] fill-[#1ED760]" />
                  </div>
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-neutral-800 shadow relative">
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                      {song.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                      {song.views || artist.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySong(song, artist.topSongs);
                  }}
                  className="p-1.5 rounded-full bg-[#1ED760] text-black shadow hover:scale-105 active:scale-95 transition"
                  title="Reproducir"
                >
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ÁLBUMES */}
      {artist.albums.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-amber-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Álbumes</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {artist.albums.map((album) => (
              <div
                key={album.id}
                onClick={() => onNavigate({ type: 'album', browseId: album.id, title: album.title })}
                className="group cursor-pointer space-y-2 select-none"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 shadow-md relative">
                  <img src={album.thumbnail} alt={album.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1ED760] transition">
                    {album.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">{album.year || 'Álbum'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SENCILLOS Y EPS */}
      {artist.singles.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-cyan-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Sencillos y EPs</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {artist.singles.map((single) => (
              <div
                key={single.id}
                onClick={() => onNavigate({ type: 'album', browseId: single.id, title: single.title })}
                className="group cursor-pointer space-y-2 select-none"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 shadow-md relative">
                  <img src={single.thumbnail} alt={single.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1ED760] transition">
                    {single.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">{single.year || 'Single'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ARTISTAS SIMILARES */}
      {artist.similarArtists.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Fans también escuchan</h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {artist.similarArtists.map((sim) => (
              <div
                key={sim.id}
                onClick={() => onNavigate({ type: 'artist', browseId: sim.id, name: sim.name })}
                className="w-28 sm:w-32 shrink-0 group cursor-pointer text-center space-y-2 select-none"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden bg-neutral-800 shadow-lg border-2 border-transparent group-hover:border-[#1ED760] transition">
                  <img src={sim.thumbnail} alt={sim.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-white truncate group-hover:text-[#1ED760] transition">
                  {sim.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MetrolistArtist;
