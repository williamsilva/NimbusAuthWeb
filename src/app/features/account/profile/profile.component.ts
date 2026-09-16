import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

import { MeStore } from '../../../core/auth/me.store';
import { UsersApiService } from '../../users/users.api.service';
import { UserModel } from '../../users/users.models';
import { statusLabel, statusSeverity } from '../../users/user-status';

/** Tela "Meu Perfil" (/security/account/profile) - mesmo destino que o TopbarComponent
 *  compartilhado (@williamsilva/nimbus-web-commons) navega ao clicar em "Meu perfil" no menu de
 *  conta. Identidade básica (nome/username/grupos/permissões) já vem decodificada do access token
 *  (ver MeStore/AuthService.claims) - dados completos (documento/status/datas) exigem
 *  GET /api/v1/me/profile (UsersApiService.getMyProfile). */
@Component({
  standalone: true,
  selector: 'app-account-profile-page',
  templateUrl: './profile.component.html',
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, DialogModule, DividerModule, TagModule],
})
export class ProfilePageComponent implements OnInit {
  private readonly meStore = inject(MeStore);
  private readonly api = inject(UsersApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusLabel = statusLabel;
  protected readonly statusSeverity = statusSeverity;

  readonly me = computed(() => this.meStore.me());
  readonly groups = computed(() => this.me()?.groups ?? []);
  readonly permissions = computed(() => this.me()?.permissions ?? []);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly details = signal<UserModel | null>(null);

  readonly groupsModalVisible = signal(false);
  readonly permissionsModalVisible = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.api.getMyProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.details.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Não foi possível carregar os dados do perfil.');
        this.loading.set(false);
      },
    });
  }

  openGroupsModal(): void {
    this.groupsModalVisible.set(true);
  }

  openPermissionsModal(): void {
    this.permissionsModalVisible.set(true);
  }

  initials(value?: string | null): string {
    const text = (value || '').trim();
    if (!text) return '?';

    const parts = text.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  sortedList(values: string[]): string[] {
    return [...values].sort();
  }

  fmtValue(value?: string | number | null): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }

  fmtDateTime(value?: string | null): string {
    if (!value) return '—';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  }

  documentMask(value?: string | null): string {
    const raw = (value ?? '').replace(/\D/g, '');
    if (!raw) return '—';

    if (raw.length === 11) {
      return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    if (raw.length === 14) {
      return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return value ?? '—';
  }

  blockedLabel(blockedUntil?: string | null): string {
    if (!blockedUntil) return 'Não';

    const d = new Date(blockedUntil);
    if (Number.isNaN(d.getTime())) return 'Não';

    return d.getTime() > Date.now() ? 'Sim' : 'Não';
  }

  passwordExpiryLabel(passwordExpiresAt?: string | null): string {
    if (!passwordExpiresAt) return 'Não informado';

    const d = new Date(passwordExpiresAt);
    if (Number.isNaN(d.getTime())) return 'Não informado';

    const diff = d.getTime() - Date.now();
    if (diff <= 0) return 'Expirada';

    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'Hoje';
    if (days === 1) return '1 dia';

    return `${days} dias`;
  }
}
