import { HttpContextToken } from '@angular/common/http';

/** Polling e chamadas com tratamento específico podem dispensar a UI global. */
export const SKIP_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);
export const SKIP_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);
