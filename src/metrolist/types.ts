/**
 * Tipos de datos para la integración de Metrolist 13.7.0 en Aarn-Music.
 * Basado en la arquitectura InnerTube y modelos de Metrolist (GPL-3.0).
 */

export interface MetrolistSong {
  id: string; // YouTube VideoId
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: number; // en segundos
  durationFormatted?: string; // ej: "3:45"
  thumbnail: string;
  views?: string;
  year?: string;
  isExplicit?: boolean;
}

export interface MetrolistArtist {
  id: string; // BrowseId (UC...)
  name: string;
  subscribers?: string;
  description?: string;
  thumbnail: string;
  banner?: string;
  topSongs: MetrolistSong[];
  albums: MetrolistAlbum[];
  singles: MetrolistAlbum[];
  similarArtists: Array<{
    id: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
  }>;
}

export interface MetrolistAlbum {
  id: string; // BrowseId (MPREb_...)
  title: string;
  artist: string;
  artistId?: string;
  year?: string;
  thumbnail: string;
  trackCount?: number;
  description?: string;
  tracks: MetrolistSong[];
}

export interface MetrolistPlaylist {
  id: string; // BrowseId (VLPL... o similar)
  title: string;
  author?: string;
  thumbnail: string;
  trackCount?: number;
  description?: string;
  tracks: MetrolistSong[];
}

export interface MetrolistHomeData {
  quickPicks: MetrolistSong[];
  newReleases: MetrolistAlbum[];
  moodsAndGenres: Array<{
    title: string;
    query: string;
    color?: string;
  }>;
  trending: MetrolistSong[];
  topArtists: Array<{
    id: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
  }>;
}

export type SearchCategoryFilter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'videos';

export interface SearchResultsPayload {
  query: string;
  filter: SearchCategoryFilter;
  songs: MetrolistSong[];
  artists: Array<{
    id: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
  }>;
  albums: MetrolistAlbum[];
  playlists: MetrolistPlaylist[];
  videos: MetrolistSong[];
  topResult?: {
    type: 'song' | 'artist' | 'album' | 'playlist';
    data: any;
  };
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsResponse {
  plainLyrics?: string;
  syncedLyrics?: string;
  lines?: LyricLine[];
  source?: string;
}

export type MetrolistNavView =
  | { type: 'home' }
  | { type: 'search'; initialQuery?: string; initialFilter?: SearchCategoryFilter }
  | { type: 'artist'; browseId: string; name?: string }
  | { type: 'album'; browseId: string; title?: string }
  | { type: 'playlist'; browseId: string; title?: string }
  | { type: 'queue' }
  | { type: 'history' };
