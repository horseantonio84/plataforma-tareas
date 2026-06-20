// ─────────────────────────────────────────
//  Punto de entrada del panel de profesor (admin.html)
// ─────────────────────────────────────────
import { initTheme } from '../shared/theme.js';
import { initAuthGuard } from './auth-guard.js';

// Importamos el resto de módulos de funcionalidad para que registren
// sus propios listeners de eventos al cargarse.
import './class-switcher.js';
import './navigation.js';
import './home.js';
import './tasks.js';
import './submissions.js';
import './grades.js';
import './announcements.js';
import './resources.js';
import './students.js';
import './settings.js';
import './stats.js';
import './historial.js';
import './chat.js';
import './notifications.js';

initTheme();
initAuthGuard();
