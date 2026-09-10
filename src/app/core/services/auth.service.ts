import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginRequest, LoginResponse, AuthUser } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'arp_token';
  private readonly USER_KEY = 'arp_user';
  private apiUrl = `${environment.apiUrl}/auth/login`;

  private tokenSignal = signal<string | null>(this.getStoredToken());
  private currentUserSignal = signal<AuthUser | null>(this.getStoredUser());

  currentUser = computed(() => this.currentUserSignal());
  isLoggedIn = computed(() => !!this.tokenSignal());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const payload = {
      email: credentials.email,
      senha: credentials.senha,
      username: credentials.email,
      password: credentials.senha
    };

    return this.http.post<LoginResponse>(this.apiUrl, payload).pipe(
      tap(response => {
        const token = this.extractToken(response);
        if (token) {
          this.setToken(token);
        }

        const user = response?.user || this.extractUserFromToken(token);
        if (user) {
          this.setUser(user);
        }
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Optional expiration verification if JWT has exp payload
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          this.logout();
          return false;
        }
      }
    } catch {
      // If token format is not standard JWT, treat presence as authenticated
    }

    return true;
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private extractToken(res: any): string | null {
    if (!res) return null;
    if (typeof res === 'string') return res;
    return res.token || res.accessToken || res.access_token || res.jwt || res.data?.token || null;
  }

  private extractUserFromToken(token: string | null): AuthUser | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]));
        return {
          email: decoded.sub || decoded.email || '',
          nome: decoded.name || decoded.nome || decoded.sub || 'Usuário',
          role: decoded.role || (decoded.roles && decoded.roles[0]) || 'USER'
        };
      }
    } catch {
      // Ignore decoding failure
    }
    return null;
  }

  private getStoredToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(this.TOKEN_KEY);
      }
    } catch {
      // Storage access error
    }
    return null;
  }

  private setToken(token: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
    } catch {
      // Storage access error
    }
    this.tokenSignal.set(token);
  }

  private removeToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    } catch {
      // Storage access error
    }
    this.tokenSignal.set(null);
  }

  private getStoredUser(): AuthUser | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.USER_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Storage access error
    }
    return null;
  }

  private setUser(user: AuthUser): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch {
      // Storage access error
    }
    this.currentUserSignal.set(user);
  }

  private removeUser(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.USER_KEY);
      }
    } catch {
      // Storage access error
    }
    this.currentUserSignal.set(null);
  }
}
