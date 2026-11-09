/**
 * Metrolist 13.7.0 - Pestaña Principal (MetrolistTab)
 * Módulo integrador que recrea la experiencia visual y musical de Metrolist dentro de Aarn-Music.
 * Gestiona navegación interna, reproductor musical con YouTube IFrame, cola e historial.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MetrolistNavView,
  MetrolistSong,
  MetrolistHomeData,
  SearchCategoryFilter
} from './types';
import {
  fetchMetrolistHome,
  getPlaybackHistory,
  addToPlaybackHistory,
  clearPlaybackHistory
} from './metrolistService';
import MetrolistHome from './MetrolistHome';
import MetrolistSearch from './MetrolistSearch';
import MetrolistArtist from './MetrolistArtist';
import MetrolistAlbum from './MetrolistAlbum';
import MetrolistPlaylist from './MetrolistPlaylist';
import MetrolistPlayer from './MetrolistPlayer';
import MetrolistQueue from './MetrolistQueue';
import MetrolistAudioEngine from './MetrolistAudioEngine';
import { Sparkles, Music, Search, ArrowLeft } from 'lucide-react';

interface MetrolistTabProps {
  onPauseAarnMusicPlayer?: () => void;
}

export const MetrolistTab: React.FC<MetrolistTabProps> = ({ onPauseAarnMusicPlayer }) => {
  // Pila de navegación interna de Metrolist
  const [navStack, setNavStack] = useState<MetrolistNavView[]>([{ type: 'home' }]);
  const currentView = navStack[navStack.length - 1] || { type: 'home' };

  // Datos de inicio
  const [homeData, setHomeData] = useState<MetrolistHomeData | null>(null);
  const [loadingHome, setLoadingHome] = useState<boolean>(true);

  // Estado del Reproductor Metrolist
  const [currentSong, setCurrentSong] = useState<MetrolistSong | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [seekRequestedTime, setSeekRequestedTime] = useState<number | null>(null);

  // Cola e Historial
  const [queue, setQueue] = useState<MetrolistSong[]>([]);
  const [history, setHistory] = useState<MetrolistSong[]>(() => getPlaybackHistory());
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);

  // Cargar datos de inicio de Metrolist
  useEffect(() => {
    let isMounted = true;
    setLoadingHome(true);

    fetchMetrolistHome()
      .then((data) => {
        if (isMounted) {
          setHomeData(data);
          setLoadingHome(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingHome(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Navegación
  const navigate = useCallback((view: MetrolistNavView) => {
    setNavStack((prev) => [...prev, view]);
  }, []);

  const goBack = useCallback(() => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
  }, []);

  // Reproducir canción seleccionada
  const handlePlaySong = useCallback(
    (song: MetrolistSong, newQueue?: MetrolistSong[]) => {
      // Pausar el reproductor nativo de Aarn-Music para no duplicar audio
      if (onPauseAarnMusicPlayer) {
        onPauseAarnMusicPlayer();
      }

      setCurrentSong(song);
      setIsPlaying(true);
      setCurrentTime(0);

      // Agregar a historial persistente
      const updatedHistory = addToPlaybackHistory(song);
      setHistory(updatedHistory);

      // Si se pasa una lista, configurar la cola
      if (newQueue && newQueue.length > 0) {
        const remaining = newQueue.filter((s) => s.id !== song.id);
        setQueue(remaining);
      }
    },
    [onPauseAarnMusicPlayer]
  );

  // Siguiente pista
  const handleNextTrack = useCallback(() => {
    if (repeatMode === 'one' && currentSong) {
      setSeekRequestedTime(0);
      setIsPlaying(true);
      return;
    }

    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      handlePlaySong(next);
    } else if (repeatMode === 'all' && history.length > 0) {
      handlePlaySong(history[history.length - 1]);
    } else {
      setIsPlaying(false);
    }
  }, [queue, history, repeatMode, currentSong, handlePlaySong]);

  // Pista anterior
  const handlePrevTrack = useCallback(() => {
    if (currentTime > 4) {
      setSeekRequestedTime(0);
      return;
    }
    if (history.length > 1) {
      const prev = history[1];
      handlePlaySong(prev);
    } else {
      setSeekRequestedTime(0);
    }
  }, [currentTime, history, handlePlaySong]);

  // Controles de Cola
  const handleAddToQueue = useCallback((song: MetrolistSong) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const handleRemoveFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearPlaybackHistory();
    setHistory([]);
  }, []);

  const handleShuffleQueue = useCallback(() => {
    setQueue((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  return (
    <div className="relative min-h-full pb-36 select-none animate-fade-in">
      {/* Motor Headless de Audio YouTube para Metrolist */}
      <MetrolistAudioEngine
        currentSong={currentSong}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        onTimeUpdate={(curr, dur) => {
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        }}
        onPlaybackStateChange={(playing) => setIsPlaying(playing)}
        onSongEnd={handleNextTrack}
        onSongError={(err) => {
          console.warn('[Metrolist song error, intentando siguiente]:', err);
          handleNextTrack();
        }}
        seekRequestedTime={seekRequestedTime}
        onSeekHandled={() => setSeekRequestedTime(null)}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
      />

      {/* Renderizado de Vistas según la pila de navegación */}
      {currentView.type === 'home' && (
        <MetrolistHome
          data={homeData}
          loading={loadingHome}
          onPlaySong={handlePlaySong}
          onNavigate={navigate}
          onOpenSearchWithQuery={(q) => navigate({ type: 'search', initialQuery: q })}
        />
      )}

      {currentView.type === 'search' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
              title="Regresar al inicio de Metrolist"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-white">Buscador Metrolist</h2>
          </div>
          <MetrolistSearch
            initialQuery={currentView.initialQuery}
            initialFilter={currentView.initialFilter}
            onPlaySong={handlePlaySong}
            onNavigate={navigate}
          />
        </div>
      )}

      {currentView.type === 'artist' && (
        <MetrolistArtist
          browseId={currentView.browseId}
          artistName={currentView.name}
          onPlaySong={handlePlaySong}
          onNavigate={navigate}
          onBack={goBack}
        />
      )}

      {currentView.type === 'album' && (
        <MetrolistAlbum
          browseId={currentView.browseId}
          albumTitle={currentView.title}
          onPlaySong={handlePlaySong}
          onNavigate={navigate}
          onBack={goBack}
          onAddToQueue={handleAddToQueue}
        />
      )}

      {currentView.type === 'playlist' && (
        <MetrolistPlaylist
          browseId={currentView.browseId}
          playlistTitle={currentView.title}
          onPlaySong={handlePlaySong}
          onNavigate={navigate}
          onBack={goBack}
          onAddToQueue={handleAddToQueue}
        />
      )}

      {/* Reproductor Integrado de Metrolist */}
      <MetrolistPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={(secs) => setSeekRequestedTime(secs)}
        onVolumeChange={(v) => {
          setVolume(v);
          setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onCycleRepeat={() => {
          setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
        }}
        onOpenQueue={() => setShowQueueModal(true)}
        onNavigate={navigate}
      />

      {/* Modal de Cola e Historial */}
      <MetrolistQueue
        currentSong={currentSong}
        queue={queue}
        history={history}
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        onPlaySong={(song) => {
          handlePlaySong(song);
          setShowQueueModal(false);
        }}
        onRemoveFromQueue={handleRemoveFromQueue}
        onMoveQueueItem={handleMoveQueueItem}
        onClearQueue={handleClearQueue}
        onClearHistory={handleClearHistory}
        onShuffleQueue={handleShuffleQueue}
      />
    </div>
  );
};

export default MetrolistTab;
