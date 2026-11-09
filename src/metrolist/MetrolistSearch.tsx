/**
 * Metrolist 13.7.0 - Motor de Búsqueda y Sugerencias
 * Recrea SearchPage, SearchSummaryPage y SearchSuggestionPage con filtros Material You.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  ArrowUpLeft,
  Play,
  Music,
  Disc,
  Users,
  ListMusic,
  Video,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Trash2
} from 'lucide-react';
import {
  SearchCategoryFilter,
  MetrolistSong,
  MetrolistArtist,
  MetrolistAlbum,
  MetrolistPlaylist,
  MetrolistNavView
} from './types';
import { useOnlineSearchViewModel } from './metrolistSearchService';

interface MetrolistSearchProps {
  initialQuery?: string;
  initialFilter?: SearchCategoryFilter;
  onPlaySong: (song: MetrolistSong, queue?: MetrolistSong[]) => void;
  onNavigate: (view: MetrolistNavView) => void;
}

export const MetrolistSearch: React.FC<MetrolistSearchProps> = ({
  initialQuery = '',
  initialFilter = 'all',
  onPlaySong,
  onNavigate
}) => {
  const {
    query,
    setQuery,
    activeFilter,
    changeFilter,
    isSearching,
    results,
    error,
    suggestions,
    recentSearches,
    showSuggestions,
    setShowSuggestions,
    executeSearch,
    handleSelectSuggestion,
    handleRemoveRecent,
    handleClearAllRecent
  } = useOnlineSearchViewModel({ initialQuery, initialFilter });

  const inputRef = useRef<HTMLInputElement>(null);

  // Ejecutar búsqueda inicial si viene con parámetro
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery, initialFilter);
    }
  }, [initialQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(query);
      inputRef.current?.blur();
    }
  };

  const filterChips: Array<{ id: SearchCategoryFilter; label: string; icon: any }> = [
    { id: 'all', label: 'Todo', icon: Sparkles },
    { id: 'songs', label: 'Canciones', icon: Music },
    { id: 'artists', label: 'Artistas', icon: Users },
    { id: 'albums', label: 'Álbumes', icon: Disc },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'videos', label: 'Videos', icon: Video }
  ];

  return (
    <div className="space-y-5 pb-12 select-none">
      {/* Barra de Búsqueda Metrolist */}
      <div className="relative pt-1">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-neutral-900 border border-white/10 focus-within:border-[#1ED760] transition shadow-md">
          <Search className="w-5 h-5 text-neutral-400 shrink-0 ml-0.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Canciones, artistas, álbumes o playlists..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-neutral-400 hover:text-white transition rounded-full hover:bg-neutral-800"
              title="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Desplegable de Sugerencias en Vivo (SearchSuggestionPage) */}
        {showSuggestions && query.trim() && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-slide-up">
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(sug)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 cursor-pointer transition text-neutral-200 hover:text-white"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Search className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{sug}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery(sug);
                  }}
                  className="p-1 text-neutral-500 hover:text-[#1ED760] transition"
                  title="Completar en buscador"
                >
                  <ArrowUpLeft className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chips de Categorías (Material You Style) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterChips.map(({ id, label, icon: Icon }) => {
          const isActive = activeFilter === id;
          return (
            <button
              key={id}
              onClick={() => changeFilter(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition active:scale-95 shadow-sm ${
                isActive
                  ? 'bg-[#1ED760] text-black shadow-[#1ED760]/20'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ESTADO: Cargando Búsqueda */}
      {isSearching && (
        <div className="space-y-4 pt-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-32"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-white/5 shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-white/5 rounded w-1/2"></div>
                  <div className="h-3 bg-white/5 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ESTADO: Búsquedas Recientes si no hay consulta activa */}
      {!query && !results && !isSearching && recentSearches.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-400">
              <Clock className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Búsquedas recientes</h2>
            </div>
            <button
              onClick={handleClearAllRecent}
              className="text-xs font-semibold text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Borrar historial</span>
            </button>
          </div>

          <div className="space-y-1">
            {recentSearches.map((rec, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(rec)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-neutral-900 cursor-pointer group transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Clock className="w-4 h-4 text-neutral-500 group-hover:text-[#1ED760] transition shrink-0" />
                  <span className="text-sm font-medium text-neutral-300 group-hover:text-white truncate">
                    {rec}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemoveRecent(rec, e)}
                  className="p-1 text-neutral-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition rounded-full"
                  title="Eliminar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ESTADO: Resultados de Búsqueda (SearchSummaryPage) */}
      {!isSearching && results && (
        <div className="space-y-6 pt-2">
          {/* Tarjeta de Resultado Principal (Top Result) */}
          {results.topResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 shadow-lg">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1ED760] text-black">
                Mejor resultado
              </span>
              <div className="flex items-center gap-4 mt-3">
                <div
                  className={`shrink-0 overflow-hidden shadow-md bg-neutral-800 ${
                    results.topResult.type === 'artist' ? 'w-20 h-20 rounded-full' : 'w-20 h-20 rounded-xl'
                  }`}
                >
                  <img
                    src={results.topResult.data.thumbnail}
                    alt={results.topResult.data.title || results.topResult.data.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-white truncate">
                    {results.topResult.data.title || results.topResult.data.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-medium mt-0.5">
                    {results.topResult.data.artist || results.topResult.data.subscribers || 'Música en YouTube'}
                  </p>
                  <div className="mt-2.5">
                    {results.topResult.type === 'artist' ? (
                      <button
                        onClick={() =>
                          onNavigate({
                            type: 'artist',
                            browseId: results.topResult?.data.id,
                            name: results.topResult?.data.name
                          })
                        }
                        className="px-4 py-1.5 rounded-full bg-[#1ED760] text-black font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                      >
                        <Users className="w-3.5 h-3.5 fill-black" />
                        <span>Ver artista</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onPlaySong(results.topResult?.data, results.songs)}
                        className="px-4 py-1.5 rounded-full bg-[#1ED760] text-black font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                        <span>Reproducir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE CANCIONES */}
          {(activeFilter === 'all' || activeFilter === 'songs') && results.songs.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#1ED760]" />
                  <h3 className="text-base font-black text-white tracking-tight">Canciones</h3>
                </div>
                <span className="text-xs text-neutral-400 font-semibold">{results.songs.length} pistas</span>
              </div>

              <div className="space-y-1.5">
                {results.songs.map((song, index) => (
                  <div
                    key={song.id}
                    onClick={() => onPlaySong(song, results.songs)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-900/90 group transition cursor-pointer active:scale-[0.99] border border-transparent hover:border-white/5"
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
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {song.durationFormatted && (
                        <span className="text-xs font-mono text-neutral-400">{song.durationFormatted}</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(song, results.songs);
                        }}
                        className="p-1.5 rounded-full bg-[#1ED760] text-black shadow hover:scale-105 active:scale-95 transition"
                        title="Reproducir"
                      >
                        <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LISTA DE ARTISTAS */}
          {(activeFilter === 'all' || activeFilter === 'artists') && results.artists.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-black text-white tracking-tight">Artistas</h3>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {results.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => onNavigate({ type: 'artist', browseId: artist.id, name: artist.name })}
                    className="w-28 sm:w-32 shrink-0 group cursor-pointer text-center space-y-2 select-none"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden bg-neutral-800 shadow-lg border-2 border-transparent group-hover:border-[#1ED760] transition">
                      <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#1ED760] transition">
                      {artist.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LISTA DE ÁLBUMES */}
          {(activeFilter === 'all' || activeFilter === 'albums') && results.albums.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black text-white tracking-tight">Álbumes</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {results.albums.map((album) => (
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
                      <p className="text-[11px] text-neutral-400 truncate">{album.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LISTA DE PLAYLISTS */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && results.playlists.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-black text-white tracking-tight">Playlists</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {results.playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => onNavigate({ type: 'playlist', browseId: playlist.id, title: playlist.title })}
                    className="group cursor-pointer space-y-2 select-none"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 shadow-md relative">
                      <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1ED760] transition">
                        {playlist.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{playlist.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VIDEOS */}
          {(activeFilter === 'all' || activeFilter === 'videos') && results.videos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-500" />
                <h3 className="text-base font-black text-white tracking-tight">Videos musicales</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {results.videos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => onPlaySong(vid, results.videos)}
                    className="group cursor-pointer space-y-2 select-none bg-neutral-900/60 p-2 rounded-2xl border border-white/5"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden bg-neutral-800 shadow-md relative">
                      <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1ED760] transition">
                        {vid.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{vid.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sin resultados */}
          {results.songs.length === 0 &&
            results.artists.length === 0 &&
            results.albums.length === 0 &&
            results.playlists.length === 0 &&
            results.videos.length === 0 && (
              <div className="py-16 text-center space-y-2 bg-neutral-900/40 rounded-2xl border border-white/5">
                <Search className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-sm font-bold text-white">No se encontraron resultados para &quot;{query}&quot;</p>
                <p className="text-xs text-neutral-400">Intenta buscar con otros términos o palabras clave</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default MetrolistSearch;
