import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Nom complet
  phone?: string;
  position?: string;
  role: string;
  permissions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signal pour l'utilisateur actuel
  currentUser = signal<User | null>(null);

  constructor() {
    // Simuler un utilisateur connecté pour le développement
    const mockUser: User = {
      id: 1,
      email: 'admin@targetdesk.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: ['dashboard:view', 'clients:manage']
    };

    this.setCurrentUser(mockUser);
  }

  /**
   * Retourne l'utilisateur actuellement connecté
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Met à jour l'utilisateur actuel
   */
  setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role.toLowerCase() === role.toLowerCase();
  }

  /**
   * Vérifie si l'utilisateur est un manager/admin
   */
  isManager(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ['admin', 'manager', 'directeur'].includes(user.role.toLowerCase());
  }

  /**
   * Déconnexion (simulation)
   */
  logout(): void {
    this.setCurrentUser(null);
  }

  /**
   * Connexion (simulation)
   */
  login(email: string, password: string): Observable<User> {
    // Simulation d'une connexion réussie
    const mockUser: User = {
      id: 1,
      email: email,
      firstName: 'Test',
      lastName: 'User',
      role: email.includes('admin') ? 'admin' : 'commercial',
      permissions: ['dashboard:view', 'clients:manage']
    };

    this.setCurrentUser(mockUser);
    return new Observable(observer => {
      observer.next(mockUser);
      observer.complete();
    });
  }
}