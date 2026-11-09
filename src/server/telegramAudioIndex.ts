import fs from 'fs';
import path from 'path';

export interface TelegramAudioRecord {
  id: string;
  file_id: string;
  file_unique_id: string;
  title: string;
  performer: string;
  file_name: string;
  duration: number;
  mime_type: string;
  chat_id: string | number;
  message_id: string | number;
  created_at: string;
  file_size?: number;
}

export interface TelegramAudioPayload {
  file_id: string;
  file_unique_id?: string;
  title?: string;
  performer?: string;
  file_name?: string;
  duration?: number;
  mime_type?: string;
  file_size?: number;
}

class TelegramAudioIndexService {
  private dataDir: string;
  private dataFilePath: string;
  private cacheDir: string;
  private records: Map<string, TelegramAudioRecord> = new Map();
  // Índice para búsqueda rápida por (chat_id, message_id) para idempotencia
  private chatMessageIndex: Map<string, string> = new Map();

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dataFilePath = path.join(this.dataDir, 'telegram_audio_index.json');
    this.cacheDir = path.resolve(process.cwd(), '.cache', 'audio_cache');

    this.ensureDirectories();
    this.loadFromDisk();
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (err) {
      console.error('[TelegramAudioIndex] Error creando directorios:', err);
    }
  }

  private getCompositeKey(chatId: string | number, messageId: string | number): string {
    return `${String(chatId)}:${String(messageId)}`;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const list: TelegramAudioRecord[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.records.clear();
          this.chatMessageIndex.clear();
          for (const item of list) {
            this.records.set(item.id, item);
            if (item.chat_id !== undefined && item.message_id !== undefined) {
              const compKey = this.getCompositeKey(item.chat_id, item.message_id);
              this.chatMessageIndex.set(compKey, item.id);
            }
          }
          console.log(`[TelegramAudioIndex] Cargados ${this.records.size} audios indexados desde disco.`);
        }
      }
    } catch (err) {
      console.warn('[TelegramAudioIndex] No se pudo leer telegram_audio_index.json previo:', err);
    }
  }

  private persistToDisk(): void {
    try {
      this.ensureDirectories();
      const list = Array.from(this.records.values());
      const tempPath = `${this.dataFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dataFilePath);
    } catch (err) {
      console.error('[TelegramAudioIndex] Error guardando índice en disco:', err);
    }
  }

  /**
   * Indexa un audio proveniente de Telegram.
   * Garantiza restricción UNIQUE sobre (chat_id, message_id) para evitar duplicados (Idempotencia).
   */
  public indexarAudio(
    audio: TelegramAudioPayload,
    chatId: string | number,
    messageId: string | number
  ): TelegramAudioRecord {
    const compKey = this.getCompositeKey(chatId, messageId);

    // 1. Verificar si ya existe el mensaje indexado (Idempotencia ON CONFLICT DO NOTHING)
    if (this.chatMessageIndex.has(compKey)) {
      const existingId = this.chatMessageIndex.get(compKey)!;
      const existing = this.records.get(existingId);
      if (existing) {
        // Si el file_id fue actualizado, lo refrescamos
        if (audio.file_id && audio.file_id !== existing.file_id) {
          existing.file_id = audio.file_id;
          if (audio.file_unique_id) existing.file_unique_id = audio.file_unique_id;
          this.records.set(existing.id, existing);
          this.persistToDisk();
        }
        return existing;
      }
    }

    // 2. Normalizar campos
    const id = `tga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = audio.file_name || (audio.title ? `${audio.title}.mp3` : 'audio.mp3');
    const title = (audio.title || fileName.replace(/\.[^/.]+$/, '')).trim();
    const performer = (audio.performer || 'Artista desconocido').trim();

    const record: TelegramAudioRecord = {
      id,
      file_id: audio.file_id,
      file_unique_id: audio.file_unique_id || audio.file_id,
      title,
      performer,
      file_name: fileName,
      duration: Number(audio.duration) || 0,
      mime_type: audio.mime_type || 'audio/mpeg',
      chat_id: chatId,
      message_id: messageId,
      created_at: new Date().toISOString(),
      file_size: audio.file_size
    };

    this.records.set(id, record);
    this.chatMessageIndex.set(compKey, id);
    this.persistToDisk();

    console.log(`[TelegramAudioIndex] Audio indexado exitosamente: "${title}" - "${performer}" (ID: ${id})`);
    return record;
  }

  /**
   * Búsqueda en el índice propio por coincidencia parcial e insensible a mayúsculas
   * sobre título, artista (performer) o nombre de archivo (file_name).
   */
  public buscar(query: string): Array<{
    id: string;
    title: string;
    performer: string;
    duration: number;
    file_name: string;
    file_unique_id: string;
    created_at: string;
  }> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);
    const results: TelegramAudioRecord[] = [];

    for (const record of this.records.values()) {
      const haystack = `${record.title} ${record.performer} ${record.file_name}`.toLowerCase();
      // Debe coincidir con todos los tokens buscados (ej: "Maluma" y "baby")
      const matchesAll = tokens.every((token) => haystack.includes(token));
      if (matchesAll) {
        results.push(record);
      }
    }

    // Ordenar de más reciente a más antiguo
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      performer: r.performer,
      duration: r.duration,
      file_name: r.file_name,
      file_unique_id: r.file_unique_id,
      created_at: r.created_at
    }));
  }

  public obtenerPorId(id: string): TelegramAudioRecord | undefined {
    return this.records.get(id);
  }

  public obtenerPorFileUniqueId(fileUniqueId: string): TelegramAudioRecord | undefined {
    for (const record of this.records.values()) {
      if (record.file_unique_id === fileUniqueId) {
        return record;
      }
    }
    return undefined;
  }

  public actualizarFileId(id: string, nuevoFileId: string): void {
    const record = this.records.get(id);
    if (record) {
      record.file_id = nuevoFileId;
      this.records.set(id, record);
      this.persistToDisk();
    }
  }

  public getCacheFilePath(fileUniqueId: string): string {
    const sanitized = fileUniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.cacheDir, `${sanitized}.mp3`);
  }
}

export const telegramAudioIndex = new TelegramAudioIndexService();
