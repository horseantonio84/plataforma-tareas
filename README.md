# 🏫 AulaOnline

Plataforma educativa moderna para profesores y alumnos. Construida con HTML/CSS/JS vanilla + Bootstrap Icons + Firebase. Compatible con GitHub Pages.

## ✨ Funcionalidades

### Profesor
- Crear y gestionar tareas con prioridad, fecha de entrega y enlace adjunto
- Ver y corregir entregas de alumnos con nota y feedback
- Registrar calificaciones por alumno y concepto
- Publicar anuncios para la clase
- Subir recursos (PDFs, vídeos, enlaces, ejercicios)
- Aprobar o revocar acceso a alumnos
- Panel de estadísticas en tiempo real

### Alumno
- Ver tareas pendientes y entregadas
- Entregar tareas con comentario o enlace
- Consultar sus calificaciones y feedback del profesor
- Ver anuncios y recursos de la clase
- Panel de progreso personal

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (ES Modules, vanilla)
- [Bootstrap Icons 1.11](https://icons.getbootstrap.com/)
- [Firebase 10](https://firebase.google.com/) — Auth + Firestore
- GitHub Pages (hosting estático)

## 📁 Estructura del proyecto

```
aulaonline/
├── index.html              # Login y registro
├── pending.html            # Pantalla de espera (alumno pendiente)
├── admin.html              # Panel del profesor
├── dashboard.html          # Panel del alumno
├── assets/
│   ├── css/
│   │   └── app.css         # Estilos globales (design system)
│   └── js/
│       └── firebase-config.js  # Configuración Firebase (exporta auth y db)
└── README.md
```

## 🗃️ Modelo de datos (Firestore)

```
/users/{uid}
  email, displayName, role, approved, classId, classCode, className, createdAt

/classes/{classId}
  name, description, teacherUid, teacherName, code, createdAt

/tasks/{taskId}
  classId, title, desc, due, priority, link, createdAt, updatedAt

/submissions/{submissionId}
  classId, taskId, studentUid, studentName, comment, grade, feedback, submittedAt, gradedAt

/grades/{gradeId}
  classId, studentUid, studentName, concept, grade, comment, createdAt

/announcements/{id}
  classId, title, body, teacherName, createdAt

/resources/{id}
  classId, name, url, type, desc, createdAt
```

## 🔐 Roles y acceso

| Rol | Acceso |
|-----|--------|
| `teacher` | `admin.html` — gestión completa |
| `student` (aprobado) | `dashboard.html` — vista alumno |
| `student` (pendiente) | `pending.html` — espera aprobación |

El primer usuario con `role: teacher` se crea manualmente desde la consola de Firebase (ver pasos de configuración).

## 🚀 Configuración inicial

### 1. Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Activa **Authentication → Email/Password**
3. Crea una **Firestore Database** en modo test, región `eur3`
4. En **Project Settings → Your apps**, registra una app web y copia las credenciales a `assets/js/firebase-config.js`

### 2. Crear cuenta de profesor

En la consola de Firebase → Firestore → colección `users`, crea manualmente un documento con tu `uid` (lo encuentras en Authentication → Users tras registrarte):

```json
{
  "uid": "TU_UID_AQUI",
  "email": "tu@correo.com",
  "displayName": "Nombre Profesor",
  "role": "teacher",
  "approved": true,
  "classId": "",
  "createdAt": (timestamp)
}
```

Al hacer login, el sistema detectará `role: teacher` y te redirigirá a `admin.html`, donde la clase se crea automáticamente.

### 3. Reglas de seguridad Firestore (producción)

Sustituye las reglas de test por estas en **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isTeacher() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    function isApprovedStudent() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approved == true;
    }
    function sameClass(classId) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.classId == classId;
    }

    match /users/{uid} {
      allow read: if request.auth.uid == uid || isTeacher();
      allow create: if request.auth.uid == uid;
      allow update: if isTeacher() || request.auth.uid == uid;
    }
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if isTeacher();
    }
    match /tasks/{taskId} {
      allow read: if isApprovedStudent() || isTeacher();
      allow write: if isTeacher();
    }
    match /submissions/{subId} {
      allow read: if isTeacher() || (isApprovedStudent() && resource.data.studentUid == request.auth.uid);
      allow create: if isApprovedStudent();
      allow update: if isTeacher();
    }
    match /grades/{gradeId} {
      allow read: if isTeacher() || (isApprovedStudent() && resource.data.studentUid == request.auth.uid);
      allow write: if isTeacher();
    }
    match /announcements/{id} {
      allow read: if isApprovedStudent() || isTeacher();
      allow write: if isTeacher();
    }
    match /resources/{id} {
      allow read: if isApprovedStudent() || isTeacher();
      allow write: if isTeacher();
    }
  }
}
```

### 4. GitHub Pages

1. Sube el repo a GitHub
2. **Settings → Pages → Branch: main → / (root) → Save**
3. Tu app estará en `https://tuusuario.github.io/aulaonline/`

## 📋 Flujo de uso

```
Alumno                          Profesor
  │                                │
  ├─ Entra en index.html           ├─ Entra en index.html
  ├─ Se registra con código        ├─ Login → redirige a admin.html
  ├─ Espera en pending.html        ├─ Aprueba al alumno en "Alumnos"
  ├─ Accede a dashboard.html  ◄────┘
  ├─ Ve tareas y las entrega
  ├─ Consulta sus notas
  └─ Lee anuncios y recursos
```

## 📄 Licencia

MIT — Uso libre para entornos educativos.
