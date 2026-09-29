# FamyBloom 🌸

App de recompensas para familias — gamifica las tareas del hogar para que los niños ganen puntos y los canjeen por premios y regalos.

Inspirada en Constanza Valentina.

## Estructura

```
famybloom/
├── web/        # PWA — desplegada en famybloom.com (Netlify)
└── android/    # Wrapper Android TWA — publicado en Google Play
```

## Web (PWA)

Single-file PWA en `web/index.html`. Deploy automático via Netlify.

```bash
cd web
netlify deploy --prod --dir .
```

## Android (TWA)

Wrapper de Trusted Web Activity que carga famybloom.com.

```bash
cd android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew bundleRelease
# Firmar con keystore y subir a Google Play
```

**Nota:** El archivo `android.keystore` NO está en el repo. Guardarlo en lugar seguro.

## Publicar cambios

- **Solo web:** Hacer deploy a Netlify. La app Android actualiza sola.
- **Android:** Incrementar `versionCode` en `app/build.gradle`, compilar, firmar y subir a Play Console.
