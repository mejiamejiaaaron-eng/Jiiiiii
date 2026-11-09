/**
 * Metrolist 13.7.0 - Pantalla de Inicio Musical
 * Recrea fielmente la vista Home de Metrolist (Material You, Quick Picks, Tendencias, Novedades, Géneros).
 * Adaptado a la estética verde (#1ED760) y modo oscuro de Aarn-Music.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React from 'react';
import {
  Sparkles,
  Play,
  Flame,
  Disc,
  Users,
  Compass,
  Search,
  Music2,
  ChevronRight,
  TrendingUp,
  Headphones
} from 'lucide-react';
import { MetrolistHomeData, MetrolistSong, MetrolistAlbum, MetrolistNavView } from './types';

interface MetrolistHomeProps {
  data: MetrolistHomeData | null;
  loading: boolean;
  onPlaySong: (song: MetrolistSong, queue?: MetrolistSong[]) => void;
  onNavigate: (view: MetrolistNavView) => void;
  onOpenSearchWithQuery: (query: string) => void;
}

export const MetrolistHome: React.FC<MetrolistHomeProps> = ({
  data,
  loading,
  onPlaySong,
  onNavigate,
  onOpenSearchWithQuery
}) => {
  // Saludo según la hora del día
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse pt-2">
        <div className="h-10 bg-white/5 rounded-2xl w-48"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-white/5 rounded-lg w-36"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const quickPicks = data?.quickPicks || [];
  const trending = data?.trending || [];
  const newReleases = data?.newReleases || [];
  const moods = data?.moodsAndGenres || [];
  const topArtists = data?.topArtists || [];

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Header Banner estilo Metrolist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/30">
              Metrolist 13.7.0
            </span>
            <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-[#1ED760]" />
              InnerTube Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            {getGreeting()}
          </h1>
        </div>

        {/* Botón Acceso Rápido a Búsqueda */}
        <button
          onClick={() => onNavigate({ type: 'search' })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-800/80 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition shadow-sm active:scale-95"
        >
          <Search className="w-4 h-4 text-[#1ED760]" />
          <span className="text-xs font-semibold">Buscar en YouTube Music...</span>
        </button>
      </div>

      {/* SECCIÓN 1: Quick Picks / Selecciones Rápidas (Estilo tarjetas Metrolist 4x2) */}
      {quickPicks.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1ED760]" />
              <h2 className="text-lg font-black text-white tracking-tight">Selecciones rápidas</h2>
            </div>
            <button
              onClick={() => onNavigate({ type: 'search', initialQuery: 'Top Hits 2025' })}
              className="text-xs font-bold text-neutral-400 hover:text-[#1ED760] flex items-center transition"
            >
              Ver más <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {quickPicks.slice(0, 9).map((song) => (
              <div
                key={song.id}
                onClick={() => onPlaySong(song, quickPicks)}
                className="group flex items-center justify-between p-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/90 border border-white/5 hover:border-[#1ED760]/30 transition shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 relative shadow">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                      {song.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySong(song, quickPicks);
                  }}
                  className="w-9 h-9 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shrink-0 shadow-md transition active:scale-90"
                  title="Reproducir ahora"
                >
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: Ánimo y Géneros (Chips de Metrolist con degradados dinámicos) */}
      {moods.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Ánimo y géneros</h2>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
            {moods.map((mood) => (
              <button
                key={mood.title}
                onClick={() => onOpenSearchWithQuery(mood.query)}
                className={`px-4 py-2.5 rounded-full bg-gradient-to-r ${mood.color || 'from-neutral-800 to-neutral-700'} text-white font-bold text-xs shrink-0 shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2 border border-white/10`}
              >
                <span>{mood.title}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 3: Tendencias en YouTube Music */}
      {trending.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-black text-white tracking-tight">Tendencias y Éxitos</h2>
            </div>
            <button
              onClick={() => onNavigate({ type: 'search', initialQuery: 'Tendencias musica' })}
              className="text-xs font-bold text-neutral-400 hover:text-[#1ED760] flex items-center transition"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none">
            {trending.slice(0, 10).map((song) => (
              <div
                key={song.id}
                onClick={() => onPlaySong(song, trending)}
                className="w-36 sm:w-44 shrink-0 group cursor-pointer space-y-2 select-none"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 relative shadow-lg border border-white/5">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition">
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                    {song.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate font-medium">
                    {song.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 4: Nuevos Álbumes y Sencillos */}
      {newReleases.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black text-white tracking-tight">Álbumes y singles nuevos</h2>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none">
            {newReleases.slice(0, 10).map((album) => (
              <div
                key={album.id}
                onClick={() => onNavigate({ type: 'album', browseId: album.id, title: album.title })}
                className="w-36 sm:w-44 shrink-0 group cursor-pointer space-y-2 select-none"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 relative shadow-lg border border-white/5">
                  <img
                    src={album.thumbnail}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                    Álbum
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                    {album.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate font-medium">
                    {album.artist} {album.year ? `• ${album.year}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 5: Artistas Populares */}
      {topArtists.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Artistas populares</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topArtists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => onNavigate({ type: 'artist', browseId: artist.id, name: artist.name })}
                className="group flex flex-col items-center p-3.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-white/5 hover:border-purple-500/30 transition text-center cursor-pointer active:scale-95 shadow-sm"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-800 shadow-md mb-2.5 border-2 border-transparent group-hover:border-[#1ED760] transition">
                  <img
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm font-bold text-white truncate max-w-full group-hover:text-[#1ED760] transition">
                  {artist.name}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-medium">
                  {artist.subscribers || 'Artista verificado'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MetrolistHome;
