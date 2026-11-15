# CDTI · E²S — Presentación SenNet

Visor web de una presentación, preparado para GitHub Pages y navegadores de PC o TV compatibles.

**[Abrir la presentación](https://sennet-info.github.io/E2S-AGO/)**

## Acceso al contenido

El repositorio es público. Las diapositivas, sus títulos y su texto accesible se guardan cifrados. La contraseña se solicita en el navegador y no se incluye en el código ni se envía a un servidor de autenticación.

GitHub Pages sirve archivos estáticos. La protección del contenido se realiza mediante AES-256-GCM y una clave derivada con PBKDF2-SHA-256, sal aleatoria y 600.000 iteraciones. Cada archivo tiene su propio IV aleatorio y autenticación. La clave de descifrado permanece en la sesión del navegador. El botón **Bloquear** cierra la sesión del visor.

Este mecanismo no proporciona cuentas de usuario, límites de intentos ni revocación de copias ya descargadas. Un visitante puede descargar los archivos cifrados e intentar adivinar la contraseña fuera del sitio. El cifrado protege el contenido; el código del visor continúa siendo público.

## Publicación con GitHub Pages

1. Subir los archivos a la raíz de un repositorio público `E2S-AGO`.
2. Abrir **Settings → Pages → Build and deployment** y seleccionar **Deploy from a branch**.
3. Seleccionar `main`, carpeta **/(root)**, y pulsar **Save**.
4. Esperar a que GitHub confirme el despliegue. La URL final aparecerá en esa sección.

El archivo `.nojekyll` evita el procesamiento por Jekyll. No hay compilación ni dependencias externas para visualizar.

## Uso en una TV

Abrir la URL HTTPS, introducir la contraseña y pulsar **Abrir presentación**. El navegador debe admitir Web Crypto, AES-GCM, PBKDF2, TextEncoder y fetch. Comprobar la compatibilidad de la TV antes de la reunión. Si no admite el visor, abrirlo en el PC y mostrar su pantalla en la TV.

- Flechas o Re Pág/Av Pág: anterior/siguiente.
- Inicio/Fin: primera/última.
- F: pantalla completa, si el navegador la permite.
- I: índice. Esc: cerrar índice o ayuda.
- En móvil: deslizar horizontalmente.
- `#6`, por ejemplo, abre la sexta diapositiva después de desbloquear.

Cada dispositivo navega de forma independiente. Esta web estática no sincroniza el PC con la TV. Se puede manejar desde un teclado o mando compatible conectado a la TV, o proyectando la pantalla del PC.

## Prueba local

Con Node.js instalado, el script de cifrado no requiere paquetes adicionales. Para ver la web localmente puede utilizarse Python:

```powershell
py -m http.server 8080 --bind 127.0.0.1
```

Abrir `http://localhost:8080` en el PC. Para acceso desde otro dispositivo, Web Crypto exige HTTPS, salvo las excepciones de origen local del navegador. Abrir directamente `index.html` como archivo no es el modo de funcionamiento previsto.

## Actualizar las diapositivas o cambiar la contraseña

Conservar las imágenes originales fuera del repositorio público. Preparar en una carpeta privada un archivo `slides.json` con esta estructura y los PNG referenciados:

```json
[
  {"src": "assets/slides/01.png", "title": "Título de la diapositiva", "text": "Texto accesible de la diapositiva"}
]
```

Ejecutar:

```text
node encrypt.mjs CARPETA_PRIVADA CARPETA_PUBLICA
```

El programa solicita la contraseña sin mostrarla. Solo copiará al destino archivos cifrados y la configuración pública. Al recibir la contraseña por stdin, elimina únicamente el salto de línea final.

Revisar y publicar juntos todos los `slide-*.bin`, `manifest.bin` y `vault.json` generados. Nunca subir las imágenes originales, `slides.json`, notas del presentador, contraseñas ni el archivo editable original. Cambiar la contraseña de una nueva versión no invalida copias antiguas del contenido cifrado y de su clave que ya se hubieran obtenido.

Las marcas y el contenido de la presentación conservan sus derechos. La publicación de este repositorio no concede por defecto una licencia de uso de esos materiales.
