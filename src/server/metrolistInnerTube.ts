/**
 * Módulo de servicio InnerTube para Metrolist 13.7.0 en Aarn-Music.
 * Consulta segura y compatible con los endpoints públicos de YouTube Music / InnerTube.
 * Licencia de referencia: GPL-3.0 (Metrolist / ViMusic / InnerTube).
 */

const YTM_API_URL = 'https://music.youtube.com/youtubei/v1';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://music.youtube.com/',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
};

const DEFAULT_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240101.01.00',
    hl: 'es',
    gl: 'MX'
  }
};

/**
 * Obtiene sugerencias en vivo desde la API de autocompletado de YouTube
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  const q = (query || '').trim();
  if (!q) return [];
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': DEFAULT_HEADERS['User-Agent'] } });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const suggestions: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    return suggestions.slice(0, 10);
  } catch (err) {
    console.warn('[Metrolist InnerTube] Error obteniendo sugerencias:', err);
    return [];
  }
}

/**
 * Búsqueda musical en InnerTube con clasificación por categorías
 */
export async function searchInnerTube(query: string, filter: string = 'all') {
  const q = (query || '').trim();
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
    const res = await fetch(`${YTM_API_URL}/search?prettyPrint=false`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: DEFAULT_CONTEXT,
        query: q
      })
    });

    if (!res.ok) {
      throw new Error(`InnerTube search status: ${res.status}`);
    }

    const data = (await res.json()) as any;
    const sections =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const songs: any[] = [];
    const artists: any[] = [];
    const albums: any[] = [];
    const playlists: any[] = [];
    const videos: any[] = [];
    let topResult: any = null;

    // Procesar tarjeta principal (Top result / Artista / Canción destacada)
    const cardShelf = sections.find((s: any) => s.musicCardShelfRenderer)?.musicCardShelfRenderer;
    if (cardShelf) {
      const title = cardShelf.title?.runs?.map((r: any) => r.text).join('') || '';
      const subtitle = cardShelf.subtitle?.runs?.map((r: any) => r.text).join('') || '';
      const thumb = cardShelf.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
      const navVideoId =
        cardShelf.onTap?.watchEndpoint?.videoId ||
        cardShelf.buttons?.find((b: any) => b.buttonRenderer?.navigationEndpoint?.watchEndpoint?.videoId)?.buttonRenderer
          ?.navigationEndpoint?.watchEndpoint?.videoId;
      const navBrowseId = cardShelf.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

      if (subtitle.toLowerCase().includes('artista') || (navBrowseId && navBrowseId.startsWith('UC'))) {
        topResult = {
          type: 'artist',
          data: {
            id: navBrowseId || 'artist_' + title,
            name: title,
            thumbnail: thumb,
            subscribers: subtitle
          }
        };
        artists.push(topResult.data);
      } else if (navVideoId) {
        topResult = {
          type: 'song',
          data: {
            id: navVideoId,
            title,
            artist: subtitle.split('•')[1]?.trim() || subtitle,
            thumbnail: thumb
          }
        };
        songs.push(topResult.data);
      }
    }

    // Procesar listas de elementos (canciones, álbumes, artistas, playlists)
    for (const section of sections) {
      const shelf = section.musicShelfRenderer || section.itemSectionRenderer;
      const contents = shelf?.contents || [];

      for (const itemWrapper of contents) {
        const item = itemWrapper.musicResponsiveListItemRenderer;
        if (!item) continue;

        const col0Runs = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const title = col0Runs.map((r: any) => r.text).join('');
        const col1Runs = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const subtitle = col1Runs.map((r: any) => r.text).join('');

        const thumb =
          item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

        const videoId =
          item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId ||
          col0Runs.find((r: any) => r.navigationEndpoint?.watchEndpoint?.videoId)?.navigationEndpoint?.watchEndpoint?.videoId ||
          item.navigationEndpoint?.watchEndpoint?.videoId;

        const browseId =
          item.navigationEndpoint?.browseEndpoint?.browseId ||
          col0Runs.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId ||
          col1Runs.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;

        const subLower = subtitle.toLowerCase();

        // Clasificar por tipo
        if (subLower.includes('canción') || subLower.includes('song') || videoId) {
          // Extraer artista y duración
          const parts = subtitle.split('•').map((s: string) => s.trim());
          const artist = parts[1] || parts[0] || 'Artista';
          const durationFormatted = parts.find((p: string) => /^\d+:\d+$/.test(p)) || '';

          if (videoId && !songs.some(s => s.id === videoId)) {
            const songObj = {
              id: videoId,
              title,
              artist,
              artistId: col1Runs.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))
                ?.navigationEndpoint?.browseEndpoint?.browseId,
              album: parts[2] && !/^\d+:\d+$/.test(parts[2]) ? parts[2] : undefined,
              durationFormatted,
              thumbnail: thumb
            };
            if (subLower.includes('vídeo') || subLower.includes('video')) {
              videos.push(songObj);
            } else {
              songs.push(songObj);
            }
          }
        } else if (subLower.includes('artista') || (browseId && browseId.startsWith('UC'))) {
          if (browseId && !artists.some(a => a.id === browseId)) {
            artists.push({
              id: browseId,
              name: title,
              thumbnail: thumb,
              subscribers: subtitle
            });
          }
        } else if (subLower.includes('álbum') || subLower.includes('album') || subLower.includes('single') || (browseId && browseId.startsWith('MPREb_'))) {
          if (browseId && !albums.some(a => a.id === browseId)) {
            const parts = subtitle.split('•').map((s: string) => s.trim());
            albums.push({
              id: browseId,
              title,
              artist: parts[1] || 'Artista',
              year: parts[2] || '',
              thumbnail: thumb,
              tracks: []
            });
          }
        } else if (subLower.includes('playlist') || subLower.includes('lista') || (browseId && browseId.startsWith('VL'))) {
          if (browseId && !playlists.some(p => p.id === browseId)) {
            playlists.push({
              id: browseId,
              title,
              author: subtitle.split('•')[0]?.trim() || 'YouTube Music',
              thumbnail: thumb,
              tracks: []
            });
          }
        }
      }
    }

    return {
      query: q,
      filter,
      topResult,
      songs,
      artists,
      albums,
      playlists,
      videos
    };
  } catch (err: any) {
    console.error('[Metrolist InnerTube search error]:', err?.message || err);
    return {
      query: q,
      filter,
      songs: [],
      artists: [],
      albums: [],
      playlists: [],
      videos: [],
      error: err?.message || 'Error en búsqueda'
    };
  }
}

/**
 * Carga la pantalla de inicio de Metrolist (Explorar, Tendencias, Novedades, Géneros)
 */
export async function getMetrolistHome() {
  try {
    const res = await fetch(`${YTM_API_URL}/browse?prettyPrint=false`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: DEFAULT_CONTEXT,
        browseId: 'FEmusic_explore'
      })
    });

    if (!res.ok) {
      throw new Error(`InnerTube explore status: ${res.status}`);
    }

    const data = (await res.json()) as any;
    const sections =
      data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const trending: any[] = [];
    const newReleases: any[] = [];
    const quickPicks: any[] = [];

    // Helper para extraer canciones de un carrusel
    for (const sec of sections) {
      const carousel = sec.musicCarouselShelfRenderer || sec.musicShelfRenderer;
      if (!carousel) continue;

      const headerTitle =
        carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.map((r: any) => r.text).join('') ||
        carousel.header?.musicHeaderRenderer?.title?.runs?.map((r: any) => r.text).join('') ||
        '';

      const items = carousel.contents || [];

      for (const itemWrap of items) {
        const item = itemWrap.musicResponsiveListItemRenderer || itemWrap.musicTwoRowItemRenderer;
        if (!item) continue;

        const title =
          item.title?.runs?.map((r: any) => r.text).join('') ||
          item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
          '';

        const subtitle =
          item.subtitle?.runs?.map((r: any) => r.text).join('') ||
          item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
          '';

        const thumb =
          item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

        const videoId =
          item.navigationEndpoint?.watchEndpoint?.videoId ||
          item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId;

        const browseId =
          item.navigationEndpoint?.browseEndpoint?.browseId ||
          item.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

        if (headerTitle.toLowerCase().includes('álbum') || headerTitle.toLowerCase().includes('single') || (browseId && browseId.startsWith('MPREb_'))) {
          if (browseId && !newReleases.some(a => a.id === browseId)) {
            newReleases.push({
              id: browseId,
              title,
              artist: subtitle.split('•')[0]?.trim() || 'Artista',
              year: subtitle.split('•')[1]?.trim() || '',
              thumbnail: thumb,
              tracks: []
            });
          }
        } else if (videoId) {
          const songObj = {
            id: videoId,
            title,
            artist: subtitle.split('•')[0]?.trim() || subtitle,
            thumbnail: thumb
          };
          if (headerTitle.toLowerCase().includes('tendencia') || headerTitle.toLowerCase().includes('popular')) {
            if (!trending.some(s => s.id === videoId)) trending.push(songObj);
          } else {
            if (!quickPicks.some(s => s.id === videoId)) quickPicks.push(songObj);
          }
        }
      }
    }

    // Moods y géneros característicos de Metrolist
    const moodsAndGenres = [
      { title: 'Corridos & Bélicos', query: 'Corridos Tumbados 2025', color: 'from-amber-600 to-yellow-700' },
      { title: 'Reggaetón & Perreo', query: 'Reggaeton Hits 2025', color: 'from-red-600 to-pink-700' },
      { title: 'Para Entrenar', query: 'Música para entrenar gym', color: 'from-orange-600 to-red-800' },
      { title: 'Fiesta & Desmadre', query: 'Fiesta latina mix', color: 'from-purple-600 to-indigo-800' },
      { title: 'Enfoque & Chill', query: 'Lo-Fi Chill Beats', color: 'from-emerald-600 to-teal-800' },
      { title: 'Románticas & Baladas', query: 'Baladas romanticas en español', color: 'from-rose-600 to-pink-900' },
      { title: 'Rock en Español', query: 'Rock en español clásicos', color: 'from-blue-700 to-cyan-900' },
      { title: 'Electrónica & EDM', query: 'EDM Festival Hits', color: 'from-cyan-600 to-blue-800' }
    ];

    // Artistas destacados iniciales
    const topArtists = [
      { id: 'UCiY3z8HAGD6BlSNKVn2kSvQ', name: 'Bad Bunny', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', subscribers: '47.5M suscriptores' },
      { id: 'UC7n3gWRN0vQzgiOKc51aZ4w', name: 'KAROL G', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80', subscribers: '36.8M suscriptores' },
      { id: 'UCw_m17sBd4GHxuK83-AZtuA', name: 'Rauw Alejandro', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&q=80', subscribers: '15.4M suscriptores' },
      { id: 'UCYPsIfSIEwWcoynHBP5k1dg', name: 'Myke Towers', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80', subscribers: '12.8M suscriptores' }
    ];

    return {
      quickPicks: quickPicks.slice(0, 12),
      trending: trending.length > 0 ? trending.slice(0, 15) : quickPicks.slice(0, 10),
      newReleases: newReleases.slice(0, 10),
      moodsAndGenres,
      topArtists
    };
  } catch (err: any) {
    console.warn('[Metrolist InnerTube explore error]:', err?.message || err);
    // Retorno de contingencia limpio
    return {
      quickPicks: [],
      trending: [],
      newReleases: [],
      moodsAndGenres: [],
      topArtists: []
    };
  }
}

/**
 * Consulta la página de un Artista por su browseId (UC...)
 */
export async function getArtistDetails(browseId: string) {
  try {
    const res = await fetch(`${YTM_API_URL}/browse?prettyPrint=false`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: DEFAULT_CONTEXT,
        browseId
      })
    });

    if (!res.ok) throw new Error(`Artist browse status ${res.status}`);
    const data = (await res.json()) as any;

    const header = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer;
    const name = header?.title?.runs?.map((r: any) => r.text).join('') || 'Artista';
    const description = header?.description?.runs?.map((r: any) => r.text).join('') || '';
    const banner =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
      header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
      '';

    const sections =
      data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const topSongs: any[] = [];
    const albums: any[] = [];
    const singles: any[] = [];
    const similarArtists: any[] = [];

    for (const sec of sections) {
      const shelf = sec.musicShelfRenderer || sec.musicCarouselShelfRenderer;
      if (!shelf) continue;

      const headerTitle =
        shelf.title?.runs?.map((r: any) => r.text).join('') ||
        shelf.header?.musicHeaderRenderer?.title?.runs?.map((r: any) => r.text).join('') ||
        shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.map((r: any) => r.text).join('') ||
        '';

      const hLower = headerTitle.toLowerCase();
      const items = shelf.contents || [];

      for (const itemWrap of items) {
        const item = itemWrap.musicResponsiveListItemRenderer || itemWrap.musicTwoRowItemRenderer;
        if (!item) continue;

        const title =
          item.title?.runs?.map((r: any) => r.text).join('') ||
          item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
          '';

        const subtitle =
          item.subtitle?.runs?.map((r: any) => r.text).join('') ||
          item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
          '';

        const thumb =
          item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          banner ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

        const videoId =
          item.navigationEndpoint?.watchEndpoint?.videoId ||
          item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId;

        const bId =
          item.navigationEndpoint?.browseEndpoint?.browseId ||
          item.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

        if (hLower.includes('cancion') || hLower.includes('song') || hLower.includes('popular') || videoId) {
          if (videoId && !topSongs.some(s => s.id === videoId)) {
            topSongs.push({
              id: videoId,
              title,
              artist: name,
              artistId: browseId,
              thumbnail: thumb,
              views: subtitle
            });
          }
        } else if (hLower.includes('álbum') || hLower.includes('album')) {
          if (bId && !albums.some(a => a.id === bId)) {
            albums.push({
              id: bId,
              title,
              artist: name,
              year: subtitle.split('•')[1]?.trim() || subtitle,
              thumbnail: thumb,
              tracks: []
            });
          }
        } else if (hLower.includes('single') || hLower.includes('sencillo')) {
          if (bId && !singles.some(s => s.id === bId)) {
            singles.push({
              id: bId,
              title,
              artist: name,
              year: subtitle.split('•')[1]?.trim() || subtitle,
              thumbnail: thumb,
              tracks: []
            });
          }
        } else if (hLower.includes('similar') || hLower.includes('fans') || (bId && bId.startsWith('UC'))) {
          if (bId && !similarArtists.some(a => a.id === bId)) {
            similarArtists.push({
              id: bId,
              name: title,
              thumbnail: thumb,
              subscribers: subtitle
            });
          }
        }
      }
    }

    return {
      id: browseId,
      name,
      description,
      thumbnail: banner,
      banner,
      topSongs: topSongs.slice(0, 15),
      albums: albums.slice(0, 10),
      singles: singles.slice(0, 10),
      similarArtists: similarArtists.slice(0, 8)
    };
  } catch (err: any) {
    console.error('[Metrolist getArtistDetails error]:', err?.message || err);
    throw err;
  }
}

/**
 * Consulta los datos y lista de pistas de un Álbum por su browseId (MPREb_...)
 */
export async function getAlbumDetails(browseId: string) {
  try {
    const res = await fetch(`${YTM_API_URL}/browse?prettyPrint=false`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: DEFAULT_CONTEXT,
        browseId
      })
    });

    if (!res.ok) throw new Error(`Album browse status ${res.status}`);
    const data = (await res.json()) as any;

    const twoCol = data?.contents?.twoColumnBrowseResultsRenderer;
    const header =
      twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;

    const title = header?.title?.runs?.map((r: any) => r.text).join('') || 'Álbum';
    const subtitle = header?.subtitle?.runs?.map((r: any) => r.text).join('') || '';
    const description =
      header?.description?.musicDescriptionShelfRenderer?.description?.runs?.map((r: any) => r.text).join('') || '';
    const thumbnail =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

    const secContents = twoCol?.secondaryContents?.sectionListRenderer?.contents || [];
    const shelf = secContents[0]?.musicShelfRenderer || secContents[0]?.musicPlaylistShelfRenderer;
    const items = shelf?.contents || [];

    const tracks: any[] = [];
    let trackIndex = 1;

    for (const itemWrap of items) {
      const item = itemWrap.musicResponsiveListItemRenderer;
      if (!item) continue;

      const trackTitle =
        item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
        'Pista ' + trackIndex;

      const col1Runs = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const trackSubtitle = col1Runs.map((r: any) => r.text).join('');

      const durationFormatted =
        item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
        trackSubtitle.split('•').find((p: string) => /^\d+:\d+$/.test(p.trim())) ||
        '';

      const videoId =
        item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
          ?.watchEndpoint?.videoId ||
        item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint
          ?.watchEndpoint?.videoId ||
        item.navigationEndpoint?.watchEndpoint?.videoId;

      if (videoId) {
        tracks.push({
          id: videoId,
          title: trackTitle,
          artist: subtitle.split('•')[1]?.trim() || subtitle.split('•')[0]?.trim() || 'Artista',
          album: title,
          albumId: browseId,
          durationFormatted,
          thumbnail
        });
      }
      trackIndex++;
    }

    return {
      id: browseId,
      title,
      artist: subtitle.split('•')[1]?.trim() || subtitle.split('•')[0]?.trim() || 'Artista',
      year: subtitle.split('•')[2]?.trim() || subtitle.split('•')[1]?.trim() || '',
      thumbnail,
      description,
      trackCount: tracks.length,
      tracks
    };
  } catch (err: any) {
    console.error('[Metrolist getAlbumDetails error]:', err?.message || err);
    throw err;
  }
}

/**
 * Consulta los datos y canciones de una Playlist por su browseId (VLPL... o RDCLAK...)
 */
export async function getPlaylistDetails(browseId: string) {
  try {
    const res = await fetch(`${YTM_API_URL}/browse?prettyPrint=false`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: DEFAULT_CONTEXT,
        browseId
      })
    });

    if (!res.ok) throw new Error(`Playlist browse status ${res.status}`);
    const data = (await res.json()) as any;

    const twoCol = data?.contents?.twoColumnBrowseResultsRenderer;
    const header =
      twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;

    const title = header?.title?.runs?.map((r: any) => r.text).join('') || 'Playlist';
    const subtitle = header?.subtitle?.runs?.map((r: any) => r.text).join('') || '';
    const description =
      header?.description?.musicDescriptionShelfRenderer?.description?.runs?.map((r: any) => r.text).join('') || '';
    const thumbnail =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

    const secContents = twoCol?.secondaryContents?.sectionListRenderer?.contents || [];
    const shelf = secContents[0]?.musicPlaylistShelfRenderer || secContents[0]?.musicShelfRenderer;
    const items = shelf?.contents || [];

    const tracks: any[] = [];
    for (const itemWrap of items) {
      const item = itemWrap.musicResponsiveListItemRenderer;
      if (!item) continue;

      const trackTitle =
        item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((r: any) => r.text).join('') || '';
      const col1Runs = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const trackSubtitle = col1Runs.map((r: any) => r.text).join('');
      const parts = trackSubtitle.split('•').map((p: string) => p.trim());

      const videoId =
        item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint
          ?.watchEndpoint?.videoId ||
        item.navigationEndpoint?.watchEndpoint?.videoId;

      const trackThumb =
        item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || thumbnail;

      const durationFormatted =
        item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
        parts.find((p: string) => /^\d+:\d+$/.test(p)) ||
        '';

      if (videoId && !tracks.some(t => t.id === videoId)) {
        tracks.push({
          id: videoId,
          title: trackTitle,
          artist: parts[0] || 'Artista',
          durationFormatted,
          thumbnail: trackThumb
        });
      }
    }

    return {
      id: browseId,
      title,
      author: subtitle.split('•')[0]?.trim() || 'Curador',
      thumbnail,
      description,
      trackCount: tracks.length,
      tracks
    };
  } catch (err: any) {
    console.error('[Metrolist getPlaylistDetails error]:', err?.message || err);
    throw err;
  }
}

/**
 * Consulta letras sincronizadas y planas en LRCLIB
 */
export async function getTrackLyrics(title: string, artist: string) {
  try {
    const cleanTitle = (title || '')
      .replace(/\s*[\(\[](official|video|audio|remix|letra|lyrics|video oficial).*?[\)\]]/gi, '')
      .trim();
    const cleanArtist = (artist || '').replace(/\s*•.*$/, '').trim();

    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Metrolist-AarnMusic/1.0' } });

    if (res.ok) {
      const data = (await res.json()) as any;
      const plainLyrics = data.plainLyrics || '';
      const syncedLyrics = data.syncedLyrics || '';

      // Parsear líneas sincronizadas [mm:ss.xx]
      const lines: Array<{ timeMs: number; text: string }> = [];
      if (syncedLyrics) {
        const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
        const rawLines = syncedLyrics.split('\n');
        for (const line of rawLines) {
          const match = line.match(regex);
          if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
            const timeMs = min * 60 * 1000 + sec * 1000 + ms;
            lines.push({
              timeMs,
              text: match[4].trim()
            });
          }
        }
      }

      return {
        plainLyrics,
        syncedLyrics,
        lines,
        source: 'lrclib'
      };
    }
  } catch (err) {
    console.warn('[Metrolist getTrackLyrics error]:', err);
  }

  return {
    plainLyrics: '',
    syncedLyrics: '',
    lines: [],
    source: 'none'
  };
}
