# Guía de Integración Nativa Android (APK) para Aarn-Music
## Reproducción en Segundo Plano y Pantalla Apagada con Android Media3 & ExoPlayer

Esta guía y plantillas de código contienen todo lo necesario para empaquetar Aarn-Music en un APK nativo mediante Android Studio, garantizando:

1. **Reproducción continua con pantalla apagada**.
2. **Reproducción en segundo plano al salir a la pantalla de inicio**.
3. **Notificación multimedia nativa** con controles de reproducción, portada e información de pista (`NotificationCompat.MediaStyle` / Media3).
4. **Controles en pantalla de bloqueo y Bluetooth/coche (Android Auto / AVRCP)**.
5. **Control de Audio Focus**: pausa automática al recibir llamadas o alarmas y reanudación automática al finalizar.
6. **Sincronización bidireccional inmediata** con la interfaz web de Aarn-Music a través de `AndroidMediaBridge`.

---

## 1. Dependencias en `app/build.gradle.kts`

Agrega las siguientes librerías oficiales de AndroidX Media3 en tu proyecto de Android Studio:

```kotlin
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.11.0")

    // AndroidX Media3 (ExoPlayer + MediaSessionService)
    val media3Version = "1.3.1"
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-session:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")

    // Carga de portadas bitmap para la notificación
    implementation("com.github.bumptech.glide:glide:4.16.0")
}
```

---

## 2. Permisos y Servicio en `AndroidManifest.xml`

Declara los permisos para reproducción en primer plano, bloqueo de suspensión (WakeLock) e Internet, junto con el servicio multimedia:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Aarn-Music"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Servicio Nativo MediaSessionService para segundo plano y pantalla apagada -->
        <service
            android:name=".MediaPlaybackService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

    </application>
</manifest>
```

---

## 3. Implementación de `AndroidMediaBridge.kt`

Clase con anotaciones `@JavascriptInterface` que la WebView expone a JavaScript como `window.AndroidMediaBridge`:

```kotlin
package com.aarnmusic.app

import android.webkit.JavascriptInterface
import org.json.JSONObject

class AndroidMediaBridge(
    private val serviceProvider: () -> MediaPlaybackService?
) {

    @JavascriptInterface
    fun isNativePlaybackAvailable(): Boolean {
        return true
    }

    @JavascriptInterface
    fun playSong(songJson: String) {
        try {
            val json = JSONObject(songJson)
            val id = json.optString("id")
            val title = json.optString("title")
            val artist = json.optString("artist")
            val audioUrl = json.optString("audioUrl")
            val coverUrl = json.optString("coverUrl")

            serviceProvider()?.playUrl(id, title, artist, audioUrl, coverUrl)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun pause() {
        serviceProvider()?.pause()
    }

    @JavascriptInterface
    fun resume() {
        serviceProvider()?.resume()
    }

    @JavascriptInterface
    fun stop() {
        serviceProvider()?.stop()
    }

    @JavascriptInterface
    fun seekTo(positionMs: Long) {
        serviceProvider()?.seekTo(positionMs)
    }

    @JavascriptInterface
    fun nextTrack() {
        serviceProvider()?.requestNextFromWeb()
    }

    @JavascriptInterface
    fun prevTrack() {
        serviceProvider()?.requestPrevFromWeb()
    }

    @JavascriptInterface
    fun setVolume(volume: Float) {
        serviceProvider()?.setVolume(volume)
    }

    @JavascriptInterface
    fun setRepeatMode(mode: String) {
        serviceProvider()?.setRepeatMode(mode)
    }

    @JavascriptInterface
    fun setShuffle(enabled: Boolean) {
        serviceProvider()?.setShuffle(enabled)
    }

    @JavascriptInterface
    fun updateQueue(queueJson: String) {
        // Almacena o actualiza la cola nativa si se requiere
    }
}
```

---

## 4. Implementación de `MediaPlaybackService.kt`

Servicio nativo que ejecuta ExoPlayer en primer plano (Foreground Service) garantizando reproducción con pantalla apagada:

```kotlin
package com.aarnmusic.app

import android.content.Intent
import android.os.Binder
import android.os.IBinder
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import android.net.Uri

class MediaPlaybackService : MediaSessionService() {

    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    private val binder = LocalBinder()
    var onPlayerEvent: ((type: String, data: Any?) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): MediaPlaybackService = this@MediaPlaybackService
    }

    override fun onBind(intent: Intent?): IBinder? {
        val superBinder = super.onBind(intent)
        return superBinder ?: binder
    }

    override fun onCreate() {
        super.onCreate()

        // 1. Configurar AudioAttributes para tomar AudioFocus automáticamente
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        // 2. Inicializar ExoPlayer con WakeLock (evita que la CPU se suspenda con pantalla apagada)
        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus = */ true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()

        // 3. Crear MediaSession
        mediaSession = MediaSession.Builder(this, player!!).build()

        // 4. Oyente de eventos de ExoPlayer para sincronizar con la interfaz web
        player?.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                onPlayerEvent?.invoke("playbackState", if (isPlaying) "playing" else "paused")
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    onPlayerEvent?.invoke("playbackState", "ended")
                } else if (playbackState == Player.STATE_BUFFERING) {
                    onPlayerEvent?.invoke("playbackState", "buffering")
                }
            }
        })
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    fun playUrl(id: String, title: String, artist: String, audioUrl: String, coverUrl: String) {
        val metadata = MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setArtworkUri(if (coverUrl.isNotEmpty()) Uri.parse(coverUrl) else null)
            .build()

        val mediaItem = MediaItem.Builder()
            .setMediaId(id)
            .setUri(audioUrl)
            .setMediaMetadata(metadata)
            .build()

        player?.setMediaItem(mediaItem)
        player?.prepare()
        player?.play()
    }

    fun pause() {
        player?.pause()
    }

    fun resume() {
        player?.play()
    }

    fun stop() {
        player?.stop()
    }

    fun seekTo(positionMs: Long) {
        player?.seekTo(positionMs)
    }

    fun setVolume(volume: Float) {
        player?.volume = volume
    }

    fun setRepeatMode(mode: String) {
        player?.repeatMode = when (mode) {
            "one" -> Player.REPEAT_MODE_ONE
            "all" -> Player.REPEAT_MODE_ALL
            else -> Player.REPEAT_MODE_OFF
        }
    }

    fun setShuffle(enabled: Boolean) {
        player?.shuffleModeEnabled = enabled
    }

    fun requestNextFromWeb() {
        onPlayerEvent?.invoke("nextRequested", null)
    }

    fun requestPrevFromWeb() {
        onPlayerEvent?.invoke("previousRequested", null)
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
```

---

## 5. Implementación de `MainActivity.kt`

Carga la URL de Aarn-Music en la WebView, inyecta `AndroidMediaBridge` y comunica los eventos a JavaScript mediante `evaluateJavascript`:

```kotlin
package com.aarnmusic.app

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var playbackService: MediaPlaybackService? = null
    private var isBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as? MediaPlaybackService.LocalBinder
            playbackService = binder?.getService()
            isBound = true

            // Sincronizar eventos de Android hacia JavaScript
            playbackService?.onPlayerEvent = { type, data ->
                runOnUiThread {
                    when (type) {
                        "playbackState" -> {
                            val state = data as? String ?: "idle"
                            webView.evaluateJavascript(
                                "window.AndroidMediaBridgeReceiver && window.AndroidMediaBridgeReceiver.onPlaybackStateChange('$state')",
                                null
                            )
                        }
                        "nextRequested" -> {
                            webView.evaluateJavascript(
                                "window.AndroidMediaBridgeReceiver && window.AndroidMediaBridgeReceiver.onNextRequested()",
                                null
                            )
                        }
                        "previousRequested" -> {
                            webView.evaluateJavascript(
                                "window.AndroidMediaBridgeReceiver && window.AndroidMediaBridgeReceiver.onPreviousRequested()",
                                null
                            )
                        }
                    }
                }
            }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            playbackService = null
            isBound = false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Iniciar y enlazar el Foreground Service
        val serviceIntent = Intent(this, MediaPlaybackService::class.java)
        startService(serviceIntent)
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)

        // 2. Configurar la WebView de Aarn-Music
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false // Permite reproducción continua automática
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // 3. Inyectar la interfaz AndroidMediaBridge a JavaScript
        webView.addJavascriptInterface(AndroidMediaBridge { playbackService }, "AndroidMediaBridge")

        // 4. Cargar URL de la aplicación
        webView.loadUrl("https://tu-dominio-de-aarn-music.com")
    }

    override fun onDestroy() {
        if (isBound) {
            unbindService(serviceConnection)
            isBound = false
        }
        super.onDestroy()
    }
}
```

---

## 6. Resumen de Flujo de Datos

```
+--------------------------------------------------------------+
|                    Interfaz Web (Aarn-Music)                 |
|  - App.tsx / MetrolistPlayer.tsx                             |
|  - AudioPlaybackService                                      |
+--------------------------------------------------------------+
        |                                       ^
        | 1. playSong(), pause(), seekTo()     | 4. onPlaybackStateChange()
        v                                       |    onTimeUpdate()
+--------------------------------------------------------------+
|                    AndroidMediaBridge                        |
|  - @JavascriptInterface en Android WebView                   |
+--------------------------------------------------------------+
        |                                       ^
        | 2. Enviar a ExoPlayer                 | 3. ExoPlayer.Listener
        v                                       |
+--------------------------------------------------------------+
|            Android MediaPlaybackService (Media3)             |
|  - Foreground Service (WAKELOCK)                              |
|  - Pantalla apagada & Audio Focus                             |
|  - Notificación MediaStyle & Lockscreen                      |
+--------------------------------------------------------------+
```
