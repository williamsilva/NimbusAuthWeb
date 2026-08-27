/** Wrapper simples de localStorage para persistir o estado dos filtros avançados de uma tela de
 *  lista entre sessões (ver StatefulListPage). Sem TTL/versionamento próprio - a própria chave
 *  (ver state-key.constants.ts) carrega um sufixo ".v1" pra invalidar manualmente se o shape do
 *  estado mudar no futuro. */
export class PersistedFilters<T> {
  constructor(private readonly key: string) {}

  save(state: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // localStorage indisponível (modo privado, quota cheia) - falha silenciosa, filtro só não persiste
    }
  }

  load(): T | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(this.key);
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}
