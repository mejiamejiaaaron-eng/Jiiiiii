/**
 * Metrolist 13.7.0 - Cola de Reproducción e Historial (MetrolistQueue)
 * Gestión de próximas canciones, reordenación, eliminación e historial de reproducción.
 * Licencia de referencia: GPL-3.0 (Metrolist).
 */

import React, { useState } from 'react';
import {
  X,
  ListMusic,
  Clock,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Music,
  CheckCircle2,
  Shuffle
} from 'lucide-react';
import { MetrolistSong } from './types';

interface MetrolistQueueProps {
  currentSong: MetrolistSong | null;
  queue: MetrolistSong[];
  history: MetrolistSong[];
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: MetrolistSong) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
  onClearHistory: () => void;
  onShuffleQueue: () => void;
}

export const MetrolistQueue: React.FC<MetrolistQueueProps> = ({
  currentSong,
  queue,
  history,
  isOpen,
  onClose,
  onPlaySong,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  onClearHistory,
  onShuffleQueue
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fade-in select-none">
      <div
        className="bg-neutral-900 border border-white/10 w-full max-w-xl max-h-[85vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === 'queue'
                  ? 'bg-[#1ED760] text-black shadow'
                  : 'text-neutral-400 hover:text-white bg-neutral-800'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>A continuación ({queue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === 'history'
                  ? 'bg-[#1ED760] text-black shadow'
                  : 'text-neutral-400 hover:text-white bg-neutral-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Historial ({history.length})</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'queue' ? (
            <>
              {/* Canción en reproducción */}
              {currentSong && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1ED760]/20 to-neutral-800 border border-[#1ED760]/30 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow bg-neutral-800">
                      <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1ED760]">
                        Sonando ahora
                      </span>
                      <p className="text-sm font-bold text-white truncate leading-tight">
                        {currentSong.title}
                      </p>
                      <p className="text-xs text-neutral-300 truncate font-medium">
                        {currentSong.artist}
                      </p>
                    </div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-[#1ED760] animate-pulse shrink-0 ml-2"></div>
                </div>
              )}

              {/* Acciones de la Cola */}
              {queue.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Próximas pistas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onShuffleQueue}
                      className="px-3 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-[#1ED760]" />
                      <span>Mezclar</span>
                    </button>
                    <button
                      onClick={onClearQueue}
                      className="px-3 py-1 rounded-full bg-neutral-800 hover:bg-rose-900/40 text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar cola</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Canciones en Cola */}
              {queue.length > 0 ? (
                <div className="space-y-1.5">
                  {queue.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-800/80 group transition border border-transparent hover:border-white/5"
                    >
                      <div
                        onClick={() => onPlaySong(item)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                          {idx + 1}
                        </span>
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800 shadow">
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                            {item.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            {item.artist}
                          </p>
                        </div>
                      </div>

                      {/* Controles de orden y eliminación */}
                      <div className="flex items-center gap-1 shrink-0">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => onMoveQueueItem(idx, idx - 1)}
                            className="p-1 text-neutral-500 hover:text-white transition rounded"
                            title="Subir"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < queue.length - 1 && (
                          <button
                            type="button"
                            onClick={() => onMoveQueueItem(idx, idx + 1)}
                            className="p-1 text-neutral-500 hover:text-white transition rounded"
                            title="Bajar"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveFromQueue(idx)}
                          className="p-1 text-neutral-500 hover:text-rose-400 transition rounded"
                          title="Quitar de la cola"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 text-neutral-500">
                  <ListMusic className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-neutral-400">La cola de reproducción está vacía</p>
                  <p className="text-xs">Selecciona canciones de la búsqueda o álbumes para agregarlas aquí</p>
                </div>
              )}
            </>
          ) : (
            /* HISTORIAL */
            <div className="space-y-3">
              {history.length > 0 && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Canciones escuchadas recientemente
                  </span>
                  <button
                    onClick={onClearHistory}
                    className="px-3 py-1 rounded-full bg-neutral-800 hover:bg-rose-900/40 text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar historial</span>
                  </button>
                </div>
              )}

              {history.length > 0 ? (
                <div className="space-y-1.5">
                  {history.map((song, idx) => (
                    <div
                      key={`${song.id}-hist-${idx}`}
                      onClick={() => onPlaySong(song)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-800/80 group transition cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800 shadow">
                          <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#1ED760] transition">
                            {song.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(song);
                        }}
                        className="p-1.5 rounded-full bg-[#1ED760] text-black shadow hover:scale-105 active:scale-95 transition"
                        title="Volver a reproducir"
                      >
                        <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 text-neutral-500">
                  <Clock className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-neutral-400">No hay historial de reproducción aún</p>
                  <p className="text-xs">Las canciones que reproduzcas en Metrolist aparecerán aquí</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetrolistQueue;
