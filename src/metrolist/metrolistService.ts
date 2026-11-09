/**
 * Metrolist 13.7.0 Client Service
 * Comunicación con el motor de InnerTube y gestión de caché / historial local.
 * Licencia de referencia: GPL-3.0 (Metrolist / InnerTube).
 */

import {
  MetrolistHomeData,
  SearchResultsPayload,
  SearchCategoryFilter,
  MetrolistArtist,
  MetrolistAlbum,
  MetrolistPlaylist,
  LyricsResponse,
  MetrolistSong
} from './types';

const RECENT_SEARCHES_KEY = 'metrolist_recent_searches_v1';
const PLAYBACK_HISTORY_KEY = 'metrolist_playback_history_v1';

export async function fetchMetrolistHome(): Promise<MetrolistHomeData> {
  try {
    const res = await fetch('/api/metrolist/home');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      quickPicks: data.quickPicks || [],
      newReleases: data.newReleases || [],
      moodsAndGenres: data.moodsAndGenres || [],
      trending: data.trending || [],
      topArtists: data.topArtists || []
    };
  } catch (err) {
    console.warn('[metrolistService] Error obteniendo inicio:', err);
    return {
      quickPicks: [],
      newReleases: [],
      moodsAndGenres: [],
      trending: [],
      topArtists: []
    };
  }
}

export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`/api/metrolist/suggestions?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  } catch (err) {
    console.warn('[metrolistService] Error sugerencias:', err);
    return [];
  }
}

export async function fetchSearchResults(
  query: string,
  filter: SearchCategoryFilter = 'all'
): Promise<SearchResultsPayload> {
  const q = query.trim();
  if (!q) {
    return {
      query: '',
      filter,
      songs: [],
      artists: [],
      albums: [],
      playlists: [],
      videos: []
    };
  }
  try {
    const res = await fetch(`/api/metrolist/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      query: q,
      filter,
      songs: data.songs || [],
      artists: data.artists || [],
      albums: data.albums || [],
      playlists: data.playlists || [],
      videos: data.videos || [],
      topResult: data.topResult
    };
  } catch (err: any) {
    console.error('[metrolistService] Error búsqueda:', err);
    throw err;
  }
}

export async function fetchArtistDetails(browseId: string): Promise<MetrolistArtist> {
  const res = await fetch(`/api/metrolist/artist/${encodeURIComponent(browseId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function fetchAlbumDetails(browseId: string): Promise<MetrolistAlbum> {
  const res = await fetch(`/api/metrolist/album/${encodeURIComponent(browseId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function fetchPlaylistDetails(browseId: string): Promise<MetrolistPlaylist> {
  const res = await fetch(`/api/metrolist/playlist/${encodeURIComponent(browseId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function fetchTrackLyrics(title: string, artist: string): Promise<LyricsResponse> {
  try {
    const res = await fetch(
      `/api/metrolist/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      plainLyrics: data.plainLyrics || '',
      syncedLyrics: data.syncedLyrics || '',
      lines: data.lines || [],
      source: data.source || 'none'
    };
  } catch (err) {
    return { plainLyrics: '', syncedLyrics: '', lines: [], source: 'none' };
  }
}

// ==========================================
// PERSISTENCIA LOCAL (Búsquedas recientes e Historial)
// ==========================================

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return getRecentSearches();
  try {
    const list = getRecentSearches().filter(item => item.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...list].slice(0, 15);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(query: string): string[] {
  try {
    const list = getRecentSearches().filter(item => item !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}

export function getPlaybackHistory(): MetrolistSong[] {
  try {
    const raw = localStorage.getItem(PLAYBACK_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToPlaybackHistory(song: MetrolistSong): MetrolistSong[] {
  try {
    const list = getPlaybackHistory().filter(s => s.id !== song.id);
    const updated = [song, ...list].slice(0, 50);
    localStorage.setItem(PLAYBACK_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearPlaybackHistory(): void {
  try {
    localStorage.removeItem(PLAYBACK_HISTORY_KEY);
  } catch {}
}
