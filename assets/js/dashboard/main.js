// ─────────────────────────────────────────
//  Punto de entrada del panel de alumno (dashboard.html)
// ─────────────────────────────────────────
import { initTheme } from '../shared/theme.js';
import { initAuthGuard } from './auth-guard.js';

import './class-switcher.js';
import './navigation.js';
import './home.js';
import './tasks.js';
import './announcements.js';
import './resources.js';
import './grades.js';
import './chat.js';
import './perfil.js';

initTheme();
initAuthGuard();
