import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../../environments/environment';
import { MeStore } from '../../../core/auth/me.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UsersApiService } from '../../users/users.api.service';
import { UserModel } from '../../users/users.models';
import { statusSeverity } from '../../users/user-status';

/** Chave de tradução (profile.permissions.<CODE>) + fallback pt-BR do catálogo de permissões do
 *  app_key "nimbusauth" (ver migrations V20260828_01__nimbusauth_users_groups_permissions_seed /
 *  V20260825_02.../V20260825_04.../V20260826_03.../V20260910_01.../V20260915_01.../V20260916_01...
 *  no NimbusAuthServer) - o access_token só carrega o CÓDIGO da permissão, não a descrição, então
 *  replicamos aqui pra tela não mostrar só o nome bruto. Código sem entrada cai no fallback
 *  humanizado (humanizeEnum). */
const PERMISSION_FALLBACKS: Record<string, string> = {
  USERS_CONSULT: 'Consulta os usuários cadastrados',
  USERS_CREATE: 'Cadastra um usuário novo',
  USERS_CHANGE: 'Altera um usuário existente',
  USERS_ACTIVE_OR_INACTIVE: 'Ativa ou inativa um usuário',
  USERS_RESEND_INVITE: 'Reenvia o convite de primeiro acesso',
  GROUPS_CONSULT: 'Consulta os grupos cadastrados',
  GROUPS_CREATE: 'Cadastra um grupo novo',
  GROUPS_CHANGE: 'Altera um grupo existente',
  GROUPS_DELETE: 'Exclui um grupo',
  GROUPS_MANAGEMENT_USER: 'Gerencia os usuários de um grupo',
  GROUPS_MANAGEMENT_PERMISSION: 'Gerencia as permissões de um grupo',
  APPS_CONSULT: 'Consulta os Apps cadastrados',
  APPS_CREATE: 'Cadastra um App novo',
  APPS_CHANGE: 'Altera um App existente',
  APPS_DELETE: 'Exclui um App',
  SECURITY_SETTINGS_CONSULT: 'Consulta as Configurações de Segurança',
  SECURITY_SETTINGS_PROCESS: 'Altera as Configurações de Segurança',
  EMAIL_SETTINGS_CONSULT: 'Consulta as Configurações de E-mail',
  EMAIL_SETTINGS_PROCESS: 'Altera as Configurações de E-mail',
  APPS_EMAIL_SETTINGS_CONSULT: 'Consulta a config de e-mail de cada app satélite',
  APPS_EMAIL_SETTINGS_PROCESS: 'Atualiza a config de e-mail de cada app satélite',
  APPS_EMAIL_LOG_CONSULT: 'Consulta a auditoria de e-mail de cada app satélite',
  AUDIT_MAIL_CONSULT: 'Consulta e-mails enviados',
  BACKUP_CONSULT: 'Consulta o status/histórico de backup',
  BACKUP_PROCESS: 'Dispara backup manual e conecta/desconecta o Google Drive',
};

type PermissionTone =
  | 'is-perm-security'
  | 'is-perm-apps'
  | 'is-perm-settings'
  | 'is-perm-email'
  | 'is-perm-audit'
  | 'is-perm-backup'
  | 'is-default';

/** Tela "Meu Perfil" (/security/account/profile) - mesmo destino que o TopbarComponent
 *  compartilhado (@williamsilva/nimbus-web-commons) navega ao clicar em "Meu perfil" no menu de
 *  conta. Identidade básica (nome/username/grupos/permissões) já vem decodificada do access token
 *  (ver MeStore/AuthService.claims) - dados completos (documento/status/datas) exigem
 *  GET /api/v1/me/profile (UsersApiService.getMyProfile()). Visual (cards numerados com cor por
 *  categoria) espelha o mesmo padrão já usado no CardSyncWeb/NimbusFlowWeb/NimbusDeskWeb/
 *  NimbusNovaxWeb (profile.component.scss), adaptado ao catálogo de permissões do próprio
 *  NimbusAuth. */
@Component({
  standalone: true,
  selector: 'app-account-profile-page',
  styleUrl: './profile.component.scss',
  templateUrl: './profile.component.html',
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, DialogModule, DividerModule, TagModule, TranslateModule],
})
export class ProfilePageComponent implements OnInit {
  private readonly meStore = inject(MeStore);
  private readonly api = inject(UsersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly statusSeverity = statusSeverity;
  readonly issuer = environment.auth.issuer;

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
        this.loadError.set(this.i18n.tUi('profile.loadError', 'Não foi possível carregar os dados do perfil.'));
        this.loading.set(false);
      },
    });
  }

  statusLabel(code: number | null | undefined): string {
    const key: Record<number, string> = {
      1: 'users.status.active',
      2: 'users.status.inactive',
      3: 'users.status.blocked',
      4: 'users.status.disabled',
      5: 'users.status.pendingPassword',
    };
    const fallback: Record<number, string> = {
      1: 'Ativo',
      2: 'Inativo',
      3: 'Bloqueado',
      4: 'Desabilitado',
      5: 'Pendente (1º acesso)',
    };
    if (code != null && key[code]) return this.i18n.tUi(key[code], fallback[code]);
    return '—';
  }

  itemsCountLabel(count: number): string {
    return this.i18n.tUi(count === 1 ? 'profile.itemsCount.one' : 'profile.itemsCount.other', { count });
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

    return new Intl.DateTimeFormat(this.i18n.getDateLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(d);
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
    const no = this.i18n.tUi('profile.security.no', 'Não');
    if (!blockedUntil) return no;

    const d = new Date(blockedUntil);
    if (Number.isNaN(d.getTime())) return no;

    return d.getTime() > Date.now() ? this.i18n.tUi('profile.security.yes', 'Sim') : no;
  }

  passwordExpiryLabel(passwordExpiresAt?: string | null): string {
    const notInformed = this.i18n.tUi('profile.security.notInformed', 'Não informado');
    if (!passwordExpiresAt) return notInformed;

    const d = new Date(passwordExpiresAt);
    if (Number.isNaN(d.getTime())) return notInformed;

    const diff = d.getTime() - Date.now();
    if (diff <= 0) return this.i18n.tUi('profile.security.expired', 'Expirada');

    const days = Math.floor(diff / 86400000);
    if (days <= 0) return this.i18n.tUi('profile.security.today', 'Hoje');
    if (days === 1) return this.i18n.tUi('profile.security.oneDay', '1 dia');

    return this.i18n.tUi('profile.security.daysCount', { count: days }, `${days} dias`);
  }

  groupLabel(group?: string | null): string {
    const value = (group ?? '').trim().toUpperCase();
    return value ? this.humanizeEnum(value) : '—';
  }

  permissionLabel(permission?: string | null): string {
    const value = (permission ?? '').trim().toUpperCase();
    if (!value) return '';

    const fallback = PERMISSION_FALLBACKS[value] ?? this.humanizeEnum(value);
    return this.i18n.tUi(`profile.permissions.${value}`, fallback);
  }

  /** Categoriza a permissão pela mesma paleta usada nos grupos/telas do menu (ver menu.data.ts) -
   *  vermelho pra gestão de usuários/grupos (área sensível), demais categorias com cor própria. */
  permissionClass(permission?: string | null): PermissionTone {
    const v = (permission ?? '').toUpperCase();

    if (v.startsWith('USERS_') || v.startsWith('GROUPS_')) return 'is-perm-security';
    if (v.startsWith('APPS_EMAIL_LOG') || v === 'AUDIT_MAIL_CONSULT' || v.startsWith('EMAIL_LOG')) {
      return 'is-perm-audit';
    }
    if (v.startsWith('APPS_EMAIL_SETTINGS') || v.startsWith('EMAIL_SETTINGS')) return 'is-perm-email';
    if (v.startsWith('SECURITY_SETTINGS')) return 'is-perm-settings';
    if (v.startsWith('BACKUP_')) return 'is-perm-backup';
    if (v.startsWith('APPS_')) return 'is-perm-apps';

    return 'is-default';
  }

  private humanizeEnum(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(' ');
  }
}
