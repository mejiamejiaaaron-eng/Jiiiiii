/**
 * AndroidMediaBridge
 * Interfaz de comunicación bidireccional entre la aplicación web Aarn-Music
 * y la capa nativa de Android (Media3 / ExoPlayer / MediaSessionService).
 *
 * Permite que, al compilar el APK con Android Studio:
 * 1. La interfaz web envíe comandos de audio a Android.
 * 2. El servicio nativo en primer plano (Foreground Service) reproduzca con pantalla apagada.
 * 3. Los botones del lockscreen, barra de notificaciones y Bluetooth sincronicen la app web.
 * 4. Si se ejecuta en navegador web (o AI Studio), actúe de forma transparente con el reproductor web.
 */

import { Song } from '../App';

export interface AndroidSongPayload {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  duration: number;
  folderId?: string;
}

export type PlaybackState = 'idle' | 'buffering' | 'playing' | 'paused' | 'ended';

export interface AndroidMediaBridgeNative {
  playSong(songJson: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  seekTo(positionMs: number): void;
  nextTrack(): void;
  prevTrack(): void;
  setVolume(volume: number): void;
  setRepeatMode(mode: string): void; // "off", "all", "one"
  setShuffle(enabled: boolean): void;
  updateQueue(queueJson: string): void;
  isNativePlaybackAvailable(): boolean;
}

export interface AndroidEventHandlers {
  onPlaybackStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTimeSec: number, durationSec: number) => void;
  onTrackChange?: (songId: string) => void;
  onNextRequested?: () => void;
  onPreviousRequested?: () => void;
  onSeekRequested?: (seconds: number) => void;
}

declare global {
  interface Window {
    AndroidMediaBridge?: AndroidMediaBridgeNative;
    AndroidMediaBridgeReceiver?: {
      onPlaybackStateChange: (state: string) => void;
      onTimeUpdate: (currentTimeSec: number, durationSec: number) => void;
      onTrackChange: (songId: string) => void;
      onNextRequested: () => void;
      onPreviousRequested: () => void;
      onSeekRequested: (seconds: number) => void;
    };
  }
}

class AndroidMediaBridgeService {
  private handlers: AndroidEventHandlers = {};
  private isNativeAvailableCache: boolean | null = null;

  constructor() {
    this.setupGlobalReceiver();
  }

  /**
   * Detecta si la WebView de Android inyectó la interfaz nativa 'AndroidMediaBridge'
   */
  public isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isNativeAvailableCache !== null) return this.isNativeAvailableCache;

    const hasBridge =
      'AndroidMediaBridge' in window &&
      typeof window.AndroidMediaBridge !== 'undefined' &&
      typeof window.AndroidMediaBridge?.playSong === 'function';

    this.isNativeAvailableCache = hasBridge;
    return hasBridge;
  }

  /**
   * Configura el receptor global al que el código Java/Kotlin de Android llamará vía
   * webView.evaluateJavascript("window.AndroidMediaBridgeReceiver.onPlaybackStateChange('playing')")
   */
  private setupGlobalReceiver() {
    if (typeof window === 'undefined') return;

    window.AndroidMediaBridgeReceiver = {
      onPlaybackStateChange: (stateStr: string) => {
        const state = (stateStr || 'idle').toLowerCase() as PlaybackState;
        if (this.handlers.onPlaybackStateChange) {
          this.handlers.onPlaybackStateChange(state);
        }
      },
      onTimeUpdate: (currentSec: number, durationSec: number) => {
        if (this.handlers.onTimeUpdate) {
          this.handlers.onTimeUpdate(Number(currentSec) || 0, Number(durationSec) || 0);
        }
      },
      onTrackChange: (songId: string) => {
        if (this.handlers.onTrackChange) {
          this.handlers.onTrackChange(songId);
        }
      },
      onNextRequested: () => {
        if (this.handlers.onNextRequested) {
          this.handlers.onNextRequested();
        }
      },
      onPreviousRequested: () => {
        if (this.handlers.onPreviousRequested) {
          this.handlers.onPreviousRequested();
        }
      },
      onSeekRequested: (seconds: number) => {
        if (this.handlers.onSeekRequested) {
          this.handlers.onSeekRequested(Number(seconds) || 0);
        }
      }
    };
  }

  /**
   * Registra los manejadores de eventos recibidos desde Android
   */
  public registerHandlers(handlers: AndroidEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Ordena a Android reproducir una canción
   */
  public playSong(song: Song, resolvedAudioUrl: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      const payload: AndroidSongPayload = {
        id: String(song.id),
        title: (song.title || song.titulo || 'Audio').trim(),
        artist: (song.artist || song.artista || 'Artista').trim(),
        audioUrl: resolvedAudioUrl,
        coverUrl: song.cover_url || song.cover || '',
        duration: Number(song.duration) || 0,
        folderId: song.folder_id || undefined
      };
      window.AndroidMediaBridge!.playSong(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar playSong nativo:', e);
      return false;
    }
  }

  /**
   * Pausar reproducción nativa
   */
  public pause(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.pause();
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar pause nativo:', e);
      return false;
    }
  }

  /**
   * Reanudar reproducción nativa
   */
  public resume(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.resume();
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar resume nativo:', e);
      return false;
    }
  }

  /**
   * Detener reproducción nativa
   */
  public stop(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.stop();
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar stop nativo:', e);
      return false;
    }
  }

  /**
   * Saltar a un segundo específico (seek)
   */
  public seekTo(positionSeconds: number): boolean {
    if (!this.isAvailable()) return false;
    try {
      const positionMs = Math.round(positionSeconds * 1000);
      window.AndroidMediaBridge!.seekTo(positionMs);
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar seekTo nativo:', e);
      return false;
    }
  }

  /**
   * Siguiente pista nativa
   */
  public nextTrack(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.nextTrack();
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar nextTrack nativo:', e);
      return false;
    }
  }

  /**
   * Pista anterior nativa
   */
  public prevTrack(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.prevTrack();
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar prevTrack nativo:', e);
      return false;
    }
  }

  /**
   * Ajustar volumen en Android (0.0 a 1.0)
   */
  public setVolume(volume: number): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.setVolume(volume);
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar setVolume nativo:', e);
      return false;
    }
  }

  /**
   * Configurar modo de repetición ("off", "all", "one")
   */
  public setRepeatMode(mode: 'off' | 'all' | 'one'): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.setRepeatMode(mode);
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar setRepeatMode nativo:', e);
      return false;
    }
  }

  /**
   * Configurar reproducción aleatoria (shuffle)
   */
  public setShuffle(enabled: boolean): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.AndroidMediaBridge!.setShuffle(enabled);
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al invocar setShuffle nativo:', e);
      return false;
    }
  }

  /**
   * Sincronizar cola de reproducción hacia Android
   */
  public updateQueue(queue: Song[], resolveUrlFn: (s: Song) => string): boolean {
    if (!this.isAvailable()) return false;
    try {
      const items: AndroidSongPayload[] = queue.map((s) => ({
        id: String(s.id),
        title: (s.title || s.titulo || 'Audio').trim(),
        artist: (s.artist || s.artista || 'Artista').trim(),
        audioUrl: resolveUrlFn(s),
        coverUrl: s.cover_url || s.cover || '',
        duration: Number(s.duration) || 0,
        folderId: s.folder_id || undefined
      }));
      window.AndroidMediaBridge!.updateQueue(JSON.stringify(items));
      return true;
    } catch (e) {
      console.warn('[AndroidMediaBridge] Error al sincronizar cola con Android:', e);
      return false;
    }
  }
}

export const androidMediaBridge = new AndroidMediaBridgeService();
export default androidMediaBridge;
