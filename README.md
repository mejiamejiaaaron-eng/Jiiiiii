# Spotyy_AA - Buscador de Audios MP3 de Telegram

Sistema de búsqueda de audios MP3 por nombre integrado con Telegram Bot API y almacenamiento en frío. Permite buscar canciones por título, artista o nombre de archivo y reproducirlas con soporte para streaming parcial (HTTP Range / 206 Partial Content), manteniendo los archivos guardados en el chat de Telegram.

---

## 🚀 Arquitectura y Componentes Implementados

1. **Módulo de Índice Aislado (`src/server/telegramAudioIndex.ts`)**:
   - Estructura de datos `telegram_audio_index` con campos:
     - `id`: Identificador único de registro (`tga_...`).
     - `file_id`: Identificador para descarga vía Telegram Bot API (`getFile`).
     - `file_unique_id`: Identificador permanente de Telegram.
     - `title`: Título de la pista o canción.
     - `performer`: Artista o intérprete.
     - `file_name`: Nombre del archivo MP3.
     - `duration`: Duración en segundos.
     - `mime_type`: Tipo MIME (`audio/mpeg`).
     - `chat_id`: Identificador del chat de Telegram.
     - `message_id`: Identificador del mensaje en Telegram.
     - `created_at`: Fecha ISO de indexación.
   - **Idempotencia**: Restricción UNIQUE sobre la combinación `(chat_id, message_id)`. Reintentos de webhook no generan registros duplicados (comportamiento equivalente a `INSERT ... ON CONFLICT DO NOTHING`).
   - Persistencia local atómica en `data/telegram_audio_index.json`.

2. **Seguridad del Webhook (`POST /telegram/webhook`)**:
   - Validación obligatoria de la cabecera `X-Telegram-Bot-Api-Secret-Token`.
   - Comparación en tiempo constante mediante `crypto.timingSafeEqual` para prevenir ataques de temporización (timing attacks).
   - Responde con `401 Unauthorized` si el token es incorrecto o inválido.

3. **Indexación automática en envíos salientes (`sendAudio`)**:
   - En `/upload-cold-storage` (y `/api/upload-cold-storage`), tras ejecutarse con éxito `sendAudio`, se extraen los metadatos y `file_id` devueltos por Telegram (`result.audio`) y se envían a `indexarAudio(...)` sin alterar el flujo de envío ni el almacenamiento en el chat.

4. **Búsqueda rápida en el índice (`GET /api/audio/search?q=texto`)**:
   - Búsqueda insensible a mayúsculas y acentos sobre `title`, `performer` y `file_name`.
   - Permite consultas compuestas (ejemplo: `"Maluma baby"`).
   - Si no hay coincidencias, devuelve lista vacía `[]` de forma segura.

5. **Streaming con soporte HTTP Range (`GET /api/audio/:id/stream`)**:
   - Soporte nativo para cabecera `Range: bytes=start-end`.
   - Responde con `206 Partial Content` y cabeceras `Accept-Ranges: bytes`, `Content-Range` y `Content-Length`.
   - Permite al reproductor HTML5 avanzar, retroceder y buscar posiciones (*seek*) sin recargar el archivo completo.
   - Almacenamiento en caché local en `.cache/audio_cache/` para eliminar latencia en reproducciones repetidas.
   - El token del bot de Telegram nunca se expone al navegador ni al frontend.

6. **Integración Frontend en el Buscador Existente**:
   - Reutiliza la barra de búsqueda de la pestaña **Buscar** (`searchQuery`).
   - Debounce integrado de 350 ms para no saturar el servidor mientras el usuario escribe.
   - Sección dedicada de **Audios en Telegram** con badge, estados de carga, error y lista de resultados con botón **Reproducir**.
   - Conexión directa con el reproductor principal de la app mediante `seleccionarCancion`.

---

## ⚙️ Variables de Entorno

Configura en tu archivo `.env` o en las variables del servidor:

```bash
# Token privado del bot de Telegram obtenido en @BotFather
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"

# Chat ID del grupo o canal donde se almacenan los audios en frío
TELEGRAM_CHAT_ID="-1003870072472"

# Secreto de seguridad para validar peticiones del Webhook
TELEGRAM_WEBHOOK_SECRET="tu_secreto_aleatorio_muy_seguro_hex_o_string"

# Opcional: Raíz de Telegram API (por defecto https://api.telegram.org)
TELEGRAM_API_ROOT="https://api.telegram.org"
```

---

## 📡 Configuración del Webhook en Telegram

Para vincular tu bot con el endpoint del webhook y registrar el secreto:

### Opción A: Mediante el endpoint utilitario del servidor
```bash
curl -X POST https://tu-dominio.com/api/telegram/set-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-dominio.com/telegram/webhook"
  }'
```

### Opción B: Directamente con la API de Telegram
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-dominio.com/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "channel_post"]
  }'
```

---

## ⚠️ Nota Técnica: Límite de 20 MB de Telegram Bot API y Escalabilidad

### El Límite Oficial de la API Pública de Bots
La API pública en la nube de Telegram (`https://api.telegram.org`) impone una restricción fija en el método `getFile`:
- **Máximo de descarga**: 20 MB por archivo.
- **Máximo de subida (`sendAudio`)**: 50 MB por archivo.

Si un archivo supera los 20 MB y se intenta descargar a través de la API pública estándar, Telegram devuelve un error indicando que el archivo es demasiado grande. Nuestro backend intercepta este caso y devuelve un código HTTP **`413 Payload Too Large`** con un mensaje claro y descriptivo para el cliente, evitando caídas inesperadas del servicio.

### Soluciones para Escalar y Superar el Límite (hasta 2 GB):

1. **Servidor Local Oficial de Telegram Bot API (Local Bot API Server - Recomendado)**:
   - Telegram provee el código abierto del servidor de Bot API en C++: [telegram-bot-api en GitHub](https://github.com/tdlib/telegram-bot-api).
   - Se puede ejecutar en un contenedor Docker con:
     ```bash
     docker run -d -p 8081:8081 \
       --name tg-bot-api \
       -v /var/lib/telegram-bot-api:/var/lib/telegram-bot-api \
       aiogram/telegram-bot-api:latest \
       --api-id=<TU_API_ID> \
       --api-hash=<TU_API_HASH> \
       --local
     ```
   - Al usar el modo `--local`, el límite de descarga de `getFile` aumenta automáticamente de **20 MB a 2.000 MB (2 GB)**.
   - En tu app, solo configuras la variable de entorno:
     ```bash
     TELEGRAM_API_ROOT="http://localhost:8081"
     ```
   - El código de Spotyy_AA ya está 100% preparado para usar `TELEGRAM_API_ROOT` sin cambios adicionales.

2. **Cliente MTProto directo (WTelegramBot en .NET o TDLib en Node.js/C++)**:
   - Si no deseas usar Bot API, puedes usar un cliente de usuario (UserBot) conectado a la red MTProto mediante TDLib o bibliotecas como GramJS / MTProto. Permiten transferir archivos de hasta 2 GB (o 4 GB con Telegram Premium) usando directamente el protocolo de Telegram.

---

## 🧪 Pasos de Verificación de Criterios de Aceptación

1. **Búsqueda por nombre de canción o artista**:
   - Abrir la pestaña **Buscar**.
   - Escribir `Maluma baby` en la barra de búsqueda existente.
   - Se observa el indicador de carga y aparecen los audios indexados coincidentes con título, artista, duración y botón "Reproducir".

2. **Reproducción y Seeking (HTTP Range)**:
   - Presionar **Reproducir** en el resultado de Telegram.
   - El audio se reproduce a través de `/api/audio/:id/stream`.
   - Se puede adelantar o atrasar la barra de progreso sin cortes gracias a la respuesta `206 Partial Content`.

3. **Verificación de Seguridad del Webhook**:
   - Realizar una petición a `/telegram/webhook` sin la cabecera correcta o con token incorrecto:
     ```bash
     curl -i -X POST http://localhost:3000/telegram/webhook \
       -H "Content-Type: application/json" \
       -H "X-Telegram-Bot-Api-Secret-Token: token_invalido" \
       -d '{"update_id":1}'
     ```
   - Devuelve `401 Unauthorized`.

4. **Verificación de Idempotencia**:
   - Enviar el mismo update de audio con `(chat_id, message_id)` dos veces.
   - El backend devuelve el mismo ID indexado y el total de registros en la búsqueda no se duplica.

5. **Protección de Archivos > 20 MB**:
   - Si un archivo en la API pública supera los 20 MB, el endpoint `/stream` devuelve un estado `413` con el detalle en JSON en lugar de generar un fallo en el servidor.
