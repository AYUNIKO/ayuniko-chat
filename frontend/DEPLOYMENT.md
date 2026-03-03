
# Guía de Despliegue y Uso en Iframe

Para publicar esta aplicación y usarla en tu sitio web, sigue estos pasos:

## 1. Publicación (Hosting)
Puedes usar plataformas gratuitas y sencillas como **Vercel** o **Netlify**:

1.  Sube este código a un repositorio de GitHub.
2.  Conecta tu repositorio a Vercel (vercel.com) o Netlify (netlify.com).
3.  **IMPORTANTE:** En la configuración del proyecto, añade una variable de entorno:
    *   Nombre: `API_KEY`
    *   Valor: Tu clave de API de Google Gemini.
4.  Despliega la aplicación. Obtendrás una URL (ej: `https://tu-app-ayuniko.vercel.app`).

## 2. Uso en Iframe
Una vez que tengas la URL de tu aplicación publicada, inserta el siguiente código en tu sitio web donde quieras que aparezca el chat:

```html
<iframe 
    src="TU_URL_AQUI" 
    width="100%" 
    height="600px" 
    style="border: none; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    allow="microphone"
></iframe>
```

## 3. Notas de Seguridad
- La `API_KEY` se maneja a través de `process.env.API_KEY`. Asegúrate de que tu entorno de construcción la inyecte correctamente.
- El diseño es responsivo, por lo que se adaptará al ancho del contenedor donde pongas il iframe.
