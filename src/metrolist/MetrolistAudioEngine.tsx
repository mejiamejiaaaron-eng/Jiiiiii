/**
 * Metrolist 13.7.0 Audio Engine
 * Reproductor de audio real integrado utilizando YouTube IFrame Player API.
 * Sincroniza estado de reproducción real, eventos, progreso, búfer y MediaSession API.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useEffect, useRef } from 'react';
import { MetrolistSong } from './types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface MetrolistAudioEngineProps {
  currentSong: MetrolistSong | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlaybackStateChange: (isPlaying: boolean) => void;
  onSongEnd: () => void;
  onSongError: (err: any) => void;
  seekRequestedTime: number | null;
  onSeekHandled: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

export const MetrolistAudioEngine: React.FC<MetrolistAudioEngineProps> = ({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  onTimeUpdate,
  onPlaybackStateChange,
  onSongEnd,
  onSongError,
  seekRequestedTime,
  onSeekHandled,
  onNextTrack,
  onPrevTrack
}) => {
  const playerRef = useRef<any>(null);
  const isApiReadyRef = useRef<boolean>(false);
  const containerId = 'metrolist-hidden-yt-player';
  const progressIntervalRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  // 1. Cargar script de YouTube IFrame API una sola vez
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isApiReadyRef.current = true;
      initPlayer();
      return;
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      isApiReadyRef.current = true;
      initPlayer();
    };

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Inicializar el reproductor headless
  const initPlayer = () => {
    if (!window.YT || !window.YT.Player || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player(containerId, {
        height: '10',
        width: '10',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event: any) => {
            if (currentSong && currentSong.id) {
              event.target.loadVideoById(currentSong.id);
              currentVideoIdRef.current = currentSong.id;
              if (isPlaying) {
                event.target.playVideo();
              }
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            const state = event.data;
            if (state === 1) {
              onPlaybackStateChange(true);
              startProgressLoop();
            } else if (state === 2) {
              onPlaybackStateChange(false);
              stopProgressLoop();
            } else if (state === 0) {
              stopProgressLoop();
              onPlaybackStateChange(false);
              onSongEnd();
            }
          },
          onError: (event: any) => {
            console.warn('[Metrolist Audio Engine Error Code]:', event.data);
            onSongError(event.data);
          }
        }
      });
    } catch (err) {
      console.warn('[Metrolist Player init error]:', err);
    }
  };

  // 3. Manejo de cambio de canción
  useEffect(() => {
    if (!currentSong || !currentSong.id) {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
      }
      currentVideoIdRef.current = null;
      stopProgressLoop();
      return;
    }

    if (currentSong.id !== currentVideoIdRef.current) {
      currentVideoIdRef.current = currentSong.id;
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(currentSong.id);
          if (isPlaying) {
            playerRef.current.playVideo();
          }
        } catch (err) {
          console.warn('[Error loading video ID]:', err);
        }
      }
    }

    // Actualizar MediaSession para controles en segundo plano y pantalla de bloqueo
    if ('mediaSession' in navigator && currentSong) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          album: currentSong.album || 'Metrolist 13.7.0',
          artwork: [
            { src: currentSong.thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.thumbnail, sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.thumbnail, sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          onPlaybackStateChange(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          onPlaybackStateChange(false);
        });
        if (onNextTrack) {
          navigator.mediaSession.setActionHandler('nexttrack', onNextTrack);
        }
        if (onPrevTrack) {
          navigator.mediaSession.setActionHandler('previoustrack', onPrevTrack);
        }
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
              playerRef.current.seekTo(details.seekTime, true);
            }
          }
        });
      } catch (e) {
        // Ignorar si el navegador no soporta MediaMetadata completo
      }
    }
  }, [currentSong?.id]);

  // 4. Manejo de Play / Pause
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } else {
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      // Ignorar si aún no cargó el iframe
    }
  }, [isPlaying]);

  // 5. Manejo de Volumen y Silencio
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
      } else {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(Math.round(volume * 100));
        }
      }
    } catch {}
  }, [volume, isMuted]);

  // 6. Manejo de Seek interactivo desde la barra de progreso
  useEffect(() => {
    if (seekRequestedTime !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(seekRequestedTime, true);
      } catch {}
      onSeekHandled();
    }
  }, [seekRequestedTime]);

  // 7. Bucle de actualización de tiempo real
  const startProgressLoop = () => {
    stopProgressLoop();
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          onTimeUpdate(curr, dur);
        } catch {}
      }
    }, 400);
  };

  const stopProgressLoop = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopProgressLoop();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.01
      }}
      aria-hidden="true"
    >
      <div id={containerId}></div>
    </div>
  );
};

export default MetrolistAudioEngine;
