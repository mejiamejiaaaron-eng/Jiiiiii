/**
 * Metrolist 13.7.0 Search ViewModel and Helpers
 * Adaptación de OnlineSearchViewModel y OnlineSearchSuggestionViewModel a TypeScript y React.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SearchResultsPayload,
  SearchCategoryFilter,
  MetrolistSong,
  MetrolistArtist,
  MetrolistAlbum,
  MetrolistPlaylist
} from './types';
import {
  fetchSearchResults,
  fetchSearchSuggestions,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches
} from './metrolistService';

export interface UseSearchViewModelProps {
  initialQuery?: string;
  initialFilter?: SearchCategoryFilter;
}

export function useOnlineSearchViewModel({
  initialQuery = '',
  initialFilter = 'all'
}: UseSearchViewModelProps = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<SearchCategoryFilter>(initialFilter);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sugerencias y búsquedas recientes
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debounceTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar sugerencias al escribir con debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const fetched = await fetchSearchSuggestions(trimmed);
        setSuggestions(fetched);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Ejecutar búsqueda oficial en InnerTube
  const executeSearch = useCallback(
    async (searchQuery: string, filterCategory: SearchCategoryFilter = activeFilter) => {
      const q = searchQuery.trim();
      if (!q) {
        setResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);
      setShowSuggestions(false);

      // Guardar en búsquedas recientes
      const updatedRecent = saveRecentSearch(q);
      setRecentSearches(updatedRecent);

      try {
        const payload = await fetchSearchResults(q, filterCategory);
        setResults(payload);
      } catch (err: any) {
        console.error('[SearchViewModel] Error al buscar:', err);
        setError(err?.message || 'Error al conectar con el servidor de búsqueda');
      } finally {
        setIsSearching(false);
      }
    },
    [activeFilter]
  );

  const changeFilter = useCallback(
    (newFilter: SearchCategoryFilter) => {
      setActiveFilter(newFilter);
      if (query.trim()) {
        executeSearch(query, newFilter);
      }
    },
    [query, executeSearch]
  );

  const handleSelectSuggestion = useCallback(
    (text: string) => {
      setQuery(text);
      executeSearch(text, activeFilter);
    },
    [activeFilter, executeSearch]
  );

  const handleRemoveRecent = useCallback((text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeRecentSearch(text);
    setRecentSearches(updated);
  }, []);

  const handleClearAllRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
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
  };
}
