/**
 * AudioPlaybackService
 * Servicio centralizado de reproducción para Aarn-Music.
 * Desacopla la lógica de reproducción de las vistas y componentes de React.
 * Si detecta AndroidMediaBridge (APK nativo con ExoPlayer y Media3), delega la reproducción a Android.
 * Si no (Web / AI Studio), utiliza el reproductor web HTML5 existente sin romper ninguna función.
 */

import { Song } from '../App';
import { androidMediaBridge, PlaybackState } from './androidMediaBridge';

export interface PlaybackStateModel {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  queue: Song[];
  isNativeAndroid: boolean;
}

export type PlaybackListener = (state: PlaybackStateModel) => void;

class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private resolveUrlFn: ((song: Song | null) => string) | null = null;
  private activePlaylist: Song[] = [];
  private listeners: Set<PlaybackListener> = new Set();

  private state: PlaybackStateModel = {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    isMuted: false,
    repeatMode: 'off',
    isShuffle: false,
    queue: [],
    isNativeAndroid: false
  };

  constructor() {
    this.state.isNativeAndroid = androidMediaBridge.isAvailable();
    this.setupAndroidBridgeListeners();
  }

  /**
   * Conecta el elemento de audio web y la función para resolver URLs (Cloudflare R2 / Telegram)
   */
  public bindWebAudio(audioEl: HTMLAudioElement | null, resolveFn: (song: Song | null) => string) {
    this.audioElement = audioEl;
    this.resolveUrlFn = resolveFn;

    if (this.audioElement) {
      this.audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
    }
  }

  /**
   * Suscribe un componente de React a los cambios de estado de reproducción
   */
  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  public getState(): PlaybackStateModel {
    return { ...this.state };
  }

  /**
   * Configura los oyentes que vienen de Android si la app está en APK WebView
   */
  private setupAndroidBridgeListeners() {
    androidMediaBridge.registerHandlers({
      onPlaybackStateChange: (playbackState: PlaybackState) => {
        const isPlaying = playbackState === 'playing';
        this.state.isPlaying = isPlaying;
        if (playbackState === 'ended') {
          this.handleTrackEnded();
        }
        this.notify();
      },
      onTimeUpdate: (currentTimeSec: number, durationSec: number) => {
        this.state.currentTime = currentTimeSec;
        if (durationSec > 0) {
          this.state.duration = durationSec;
        }
        this.notify();
      },
      onTrackChange: (songId: string) => {
        const found = this.activePlaylist.find((s) => String(s.id) === String(songId));
        if (found) {
          this.state.currentSong = found;
          this.notify();
        }
      },
      onNextRequested: () => {
        this.playNext();
      },
      onPreviousRequested: () => {
        this.playPrevious();
      },
      onSeekRequested: (seconds: number) => {
        this.seekTo(seconds);
      }
    });
  }

  /**
   * Reproducir una canción
   */
  public playSong(song: Song, playlist?: Song[]) {
    this.state.currentSong = song;
    this.state.currentTime = 0;
    this.state.isPlaying = true;

    if (playlist && playlist.length > 0) {
      this.activePlaylist = playlist;
    }

    const resolvedUrl = this.resolveUrlFn ? this.resolveUrlFn(song) : '';

    // Si Android nativo está presente (APK), delegar a AndroidMediaBridge
    if (androidMediaBridge.isAvailable() && resolvedUrl) {
      androidMediaBridge.playSong(song, resolvedUrl);
      this.notify();
      return;
    }

    // Fallback: Reproductor web HTML5
    if (this.audioElement && resolvedUrl) {
      this.audioElement.src = resolvedUrl;
      this.audioElement.currentTime = 0;
      this.audioElement.load();
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.state.isPlaying = true;
            this.notify();
          })
          .catch((err) => {
            console.warn('[AudioPlaybackService] Autoplay diferido en web:', err);
          });
      }
    }

    this.notify();
  }

  /**
   * Alternar Play/Pausa
   */
  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause() {
    this.state.isPlaying = false;

    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.pause();
      this.notify();
      return;
    }

    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.notify();
  }

  public resume() {
    if (!this.state.currentSong) return;
    this.state.isPlaying = true;

    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.resume();
      this.notify();
      return;
    }

    if (this.audioElement) {
      this.audioElement.play().catch((err) => console.warn('Error resume web audio:', err));
    }
    this.notify();
  }

  /**
   * Saltar a un segundo específico
   */
  public seekTo(seconds: number) {
    this.state.currentTime = seconds;

    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.seekTo(seconds);
      this.notify();
      return;
    }

    if (this.audioElement) {
      this.audioElement.currentTime = seconds;
    }
    this.notify();
  }

  /**
   * Siguiente canción con soporte de cola y shuffle
   */
  public playNext() {
    if (this.state.queue.length > 0) {
      const nextSong = this.state.queue[0];
      this.state.queue = this.state.queue.slice(1);
      this.playSong(nextSong);
      return;
    }

    if (this.activePlaylist.length === 0) return;

    const currentIndex = this.activePlaylist.findIndex(
      (s) => String(s.id) === String(this.state.currentSong?.id)
    );

    let nextIndex = 0;
    if (this.state.isShuffle && this.activePlaylist.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * this.activePlaylist.length);
      } while (nextIndex === currentIndex && this.activePlaylist.length > 1);
    } else {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % this.activePlaylist.length;
    }

    const nextSong = this.activePlaylist[nextIndex];
    if (nextSong) {
      this.playSong(nextSong, this.activePlaylist);
    }
  }

  /**
   * Canción anterior
   */
  public playPrevious() {
    if (this.state.currentTime > 3) {
      this.seekTo(0);
      return;
    }

    if (this.activePlaylist.length === 0) return;

    const currentIndex = this.activePlaylist.findIndex(
      (s) => String(s.id) === String(this.state.currentSong?.id)
    );

    let prevIndex = 0;
    if (this.state.isShuffle && this.activePlaylist.length > 1) {
      do {
        prevIndex = Math.floor(Math.random() * this.activePlaylist.length);
      } while (prevIndex === currentIndex && this.activePlaylist.length > 1);
    } else {
      prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + this.activePlaylist.length) % this.activePlaylist.length;
    }

    const prevSong = this.activePlaylist[prevIndex];
    if (prevSong) {
      this.playSong(prevSong, this.activePlaylist);
    }
  }

  /**
   * Manejador al finalizar canción
   */
  public handleTrackEnded() {
    if (this.state.repeatMode === 'one') {
      this.seekTo(0);
      this.resume();
      return;
    }
    this.playNext();
  }

  /**
   * Volumen (0.0 a 1.0)
   */
  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    this.state.isMuted = false;

    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.setVolume(clamped);
    }
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
    this.notify();
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.audioElement) {
      this.audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
    }
    this.notify();
  }

  public setRepeatMode(mode: 'off' | 'all' | 'one') {
    this.state.repeatMode = mode;
    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.setRepeatMode(mode);
    }
    this.notify();
  }

  public toggleShuffle() {
    this.state.isShuffle = !this.state.isShuffle;
    if (androidMediaBridge.isAvailable()) {
      androidMediaBridge.setShuffle(this.state.isShuffle);
    }
    this.notify();
  }

  public addToQueue(song: Song) {
    this.state.queue = [...this.state.queue, song];
    if (androidMediaBridge.isAvailable() && this.resolveUrlFn) {
      androidMediaBridge.updateQueue(this.state.queue, this.resolveUrlFn);
    }
    this.notify();
  }

  public setQueue(queue: Song[]) {
    this.state.queue = queue;
    if (androidMediaBridge.isAvailable() && this.resolveUrlFn) {
      androidMediaBridge.updateQueue(this.state.queue, this.resolveUrlFn);
    }
    this.notify();
  }

  public setPlaylist(playlist: Song[]) {
    this.activePlaylist = playlist;
  }
}

export const audioPlaybackService = new AudioPlaybackService();
export default audioPlaybackService;
