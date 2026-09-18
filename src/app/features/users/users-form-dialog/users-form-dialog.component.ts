import { Component, DestroyRef, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';

import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel } from '../../apps/apps.models';
import { GroupsApiService } from '../../groups/groups.api.service';
import { GroupOption } from '../../groups/groups.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ErrorMsgComponent } from '../../../shared/error-msg/error-msg.component';
import { UsersApiService } from '../users.api.service';
import { UserInput, UserModel } from '../users.models';
import { cpfCnpjValidator } from '../cpf-cnpj.validator';

/** Cria/edita um usuário. Como nb_users é global (compartilhado entre cardsync/nimbusflow/
 *  nimbusnovax/nimbuscore), o acesso é montado em 2 passos: primeiro escolhe QUAIS apps (seletor
 *  "Apps com acesso" - `selectedAppKeys`), depois só os apps escolhidos ganham uma linha com o
 *  multiselect de grupos DAQUELE app_key (grupo é sempre escopado a 1 app só). Sem esse primeiro
 *  passo, a seção cresceria 1 linha por app cadastrado no ecossistema, sem limite. Catálogo
 *  (apps+grupos de TODOS os apps) vem de 2 chamadas só (GroupsApiService#options() sem appKey
 *  devolve os de todos de uma vez). O payload final (UserInput.groupIds) é só a união dos grupos
 *  selecionados nos apps ESCOLHIDOS - o backend não distingue de onde cada id veio. */
@Component({
  standalone: true,
  selector: 'app-users-form-dialog',
  templateUrl: './users-form-dialog.component.html',
  imports: [
    ButtonModule,
    DialogModule,
    ErrorMsgComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
})
export class UsersFormDialogComponent {
  visible = input.required<boolean>();
  user = input<UserModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersApiService);
  private readonly appsApi = inject(AppsApiService);
  private readonly groupsApi = inject(GroupsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  readonly isEditMode = computed(() => !!this.user());
  readonly canResendInvite = computed(() => this.user()?.status === 5);

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly sendingInvite = signal(false);
  readonly loadingCatalog = signal(true);

  readonly apps = signal<AppModel[]>([]);
  readonly groupOptionsByApp = signal<Record<string, GroupOption[]>>({});
  readonly groupIdsByApp = signal<Record<string, string[]>>({});

  /** Apps escolhidos no seletor "Apps com acesso" - só esses ganham uma linha de grupos visível.
   *  Sem isso, a seção cresceria 1 linha por app cadastrado no ecossistema, sem limite. */
  readonly selectedAppKeys = signal<string[]>([]);

  readonly totalSelectedGroups = computed(() =>
    this.selectedAppKeys().reduce((sum, appKey) => sum + (this.groupIdsByApp()[appKey]?.length ?? 0), 0),
  );

  private lastLoadedId: string | null = null;
  private catalogLoaded = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    userName: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    document: ['', [Validators.required, cpfCnpjValidator()]],
  });

  /** Chamado pelo (onShow) do p-dialog - dispara certo tanto pra criar quanto pra editar. */
  onDialogShow(): void {
    if (!this.catalogLoaded) {
      this.catalogLoaded = true;
      this.loadCatalog();
    }

    const user = this.user();

    if (!user) {
      this.lastLoadedId = null;
      this.resetFormForCreate();
      return;
    }

    if (this.lastLoadedId === user.id) {
      return;
    }

    this.lastLoadedId = user.id;
    this.setGroupIdsForUser(user);

    this.form.reset({
      name: user.name,
      userName: user.userName,
      document: user.document,
    });
    this.submitted.set(false);
  }

  /** 1 chamada só de cada (apps + TODOS os grupos, sem filtrar por appKey - ver
   *  GroupsApiService#options), em vez de 1+N (1 por app cadastrado) - evita um pico de N+1
   *  requisições simultâneas só pra abrir este diálogo. */
  private loadCatalog(): void {
    this.loadingCatalog.set(true);

    forkJoin({
      apps: this.appsApi.search('', 0, 100),
      groups: this.groupsApi.options(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ apps: appsResult, groups }) => {
          const apps = appsResult._embedded?.content ?? [];
          this.apps.set(apps);

          // Pré-popula TODOS os apps (mesmo os sem nenhum grupo) com array vazio - sem isso,
          // groupOptionsFor()/selectedGroupsFor() caem no fallback "?? []" a cada verificação do
          // Angular, criando uma referência de array NOVA a cada ciclo. O p-multiSelect, ao
          // receber uma referência de `[options]` diferente a cada ciclo, reprocessa/reemite
          // internamente - entrando num loop de change detection que nunca se estabiliza e trava
          // a aba inteira (não é só a tela não atualizar - o loop consome a thread principal).
          const optionsByApp: Record<string, GroupOption[]> = {};
          for (const app of apps) {
            optionsByApp[app.appKey] = [];
          }
          for (const group of groups) {
            (optionsByApp[group.appKey] ??= []).push(group);
          }
          this.groupOptionsByApp.set(optionsByApp);

          // Mesmo cuidado pro lado da seleção - garante uma entrada estável por app, preservando
          // o que já tiver sido setado (ex.: usuário em edição, populado antes do catálogo
          // terminar de carregar).
          this.groupIdsByApp.update((current) => {
            const next = { ...current };
            for (const app of apps) {
              next[app.appKey] ??= [];
            }
            return next;
          });

          this.loadingCatalog.set(false);
        },
        error: () => this.loadingCatalog.set(false),
      });
  }

  private setGroupIdsForUser(user: UserModel): void {
    const byApp: Record<string, string[]> = {};
    for (const app of this.apps()) {
      byApp[app.appKey] = [];
    }

    const appKeysWithAccess = new Set<string>();
    for (const group of user.groups ?? []) {
      (byApp[group.appKey] ??= []).push(group.id);
      appKeysWithAccess.add(group.appKey);
    }

    this.groupIdsByApp.set(byApp);
    this.selectedAppKeys.set(Array.from(appKeysWithAccess));
  }

  appName(appKey: string): string {
    return this.apps().find((a) => a.appKey === appKey)?.name ?? appKey;
  }

  groupOptionsFor(appKey: string): GroupOption[] {
    return this.groupOptionsByApp()[appKey] ?? [];
  }

  selectedGroupsFor(appKey: string): string[] {
    return this.groupIdsByApp()[appKey] ?? [];
  }

  onSelectedAppsChange(appKeys: string[] | null): void {
    this.selectedAppKeys.set(appKeys ?? []);
  }

  onGroupsChange(appKey: string, ids: string[] | null): void {
    this.groupIdsByApp.update((current) => ({ ...current, [appKey]: ids ?? [] }));
  }

  close(): void {
    this.submitted.set(false);
    this.saving.set(false);
    this.lastLoadedId = null;
    this.resetFormForCreate();
    this.visibleChange.emit(false);
  }

  onResendInvite(): void {
    const id = this.user()?.id;
    if (!id || !this.canResendInvite()) {
      return;
    }

    this.sendingInvite.set(true);
    this.api.resendInvite(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.sendingInvite.set(false);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.tUi('users.dialog.toastInviteResent.summary', 'Convite reenviado'),
          detail: this.i18n.tUi('users.dialog.toastInviteResent.detail', 'E-mail de primeiro acesso reenviado.'),
        });
      },
      error: () => this.sendingInvite.set(false),
    });
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.totalSelectedGroups() === 0) {
      return;
    }

    const v = this.form.getRawValue();
    const groupIds = Array.from(
      new Set(this.selectedAppKeys().flatMap((appKey) => this.groupIdsByApp()[appKey] ?? [])),
    );
    const payload: UserInput = {
      name: v.name.trim(),
      userName: v.userName.trim().toLowerCase(),
      document: v.document.replace(/\D+/g, ''),
      groupIds,
    };

    const user = this.user();
    this.saving.set(true);

    const req$ = user ? this.api.update(user.id, payload) : this.api.create(payload);
    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.tUi('common.success', 'Sucesso'),
          detail: user
            ? this.i18n.tUi('users.dialog.toastUpdated', 'Usuário atualizado.')
            : this.i18n.tUi('users.dialog.toastCreated', 'Usuário criado - convite de primeiro acesso enviado por e-mail.'),
        });
        this.saved.emit();
        this.close();
      },
      error: () => this.saving.set(false),
    });
  }

  private resetFormForCreate(): void {
    this.form.reset({ name: '', userName: '', document: '' });

    const byApp: Record<string, string[]> = {};
    for (const app of this.apps()) {
      byApp[app.appKey] = [];
    }
    this.groupIdsByApp.set(byApp);
    this.selectedAppKeys.set([]);
  }
}
