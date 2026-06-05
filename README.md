# 🏫 AulaOnline

Plataforma educativa estática pensada para profesores que quieren gestionar su clase desde GitHub Pages, sin necesidad de servidor ni base de datos.

## ✨ Funcionalidades

- **Tareas** — crea, edita, elimina y marca como completadas, con prioridad, fecha de entrega y enlace adjunto
- **Anuncios** — publica mensajes visibles para todos los alumnos
- **Recursos** — organiza enlaces a PDFs, vídeos, ejercicios y más
- **Calendario** — vista de entregas agrupadas por mes
- **Dashboard** — estadísticas de progreso de la clase en tiempo real
- **Dos roles** — Profesor (gestión completa) y Alumno (solo lectura y marcar tareas)

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (vanilla)
- [Bootstrap 5.3](https://getbootstrap.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- `localStorage` para persistencia de datos

## 🚀 Despliegue en GitHub Pages

1. Sube este repositorio a GitHub
2. Ve a **Settings → Pages**
3. En *Branch*, selecciona `main` y la carpeta `/ (root)`
4. Pulsa **Save** — en unos segundos tu página estará en `https://tuusuario.github.io/tu-repo/`

## 📁 Estructura del proyecto

```
aulaonline/
├── index.html   # Aplicación completa (todo en un solo archivo)
└── README.md    # Este archivo
```

## 💾 Sobre los datos

Los datos se guardan en el `localStorage` del navegador de cada usuario. Esto significa:

- El profesor crea las tareas desde su dispositivo
- Los alumnos ven sus propias copias locales
- **No hay sincronización en tiempo real** entre dispositivos

> Si necesitas que todos vean los mismos datos, considera integrar un backend como [Firebase](https://firebase.google.com/) o [Supabase](https://supabase.com/).

## 🔑 Cambiar de rol

En la barra lateral hay un botón **"Cambiar rol"** para alternar entre modo Profesor y modo Alumno. Úsalo para mostrar a los alumnos cómo ven ellos la plataforma.

## 📄 Licencia

Uso libre para entornos educativos.
