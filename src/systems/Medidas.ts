/**
 * AS MEDIDAS DO SANDBOX (spec `2026-10-02-sandbox-dev-design.md` §4) — os números do balanceamento: dano por FONTE
 * (quanto cada carta contribui de verdade), DPS, abates por tipo, o tempo para limpar cada onda e o que a nave recebeu.
 * Só existe no sandbox; o jogo chama `medidas?.…` e, fora dele, nada acontece.
 *
 * O dano contado é o EFETIVO (o que a vida do alvo de fato perdeu): um tiro de 2 num inimigo de 1 de vida conta 1 —
 * senão a carta que "sobra" dano (Pesado num drone) pareceria melhor do que é.
 */

const JANELA_MS = 5000;

export class Medidas {
  total = 0;
  readonly porFonte = new Map<string, number>();
  readonly abates = new Map<string, number>();
  /** Golpes que um ESCUDO segurou (a Sentinela, frente B), por fonte — quanto o elite bloqueou de verdade. */
  readonly bloqueados = new Map<string, number>();
  golpes = 0;
  cascoGasto = 0;
  vidasPerdidas = 0;
  bombasUsadas = 0;
  /** Quanto cada onda levou para sumir da tela (morta ou escapada), em ms. */
  readonly ondas: { n: number; ms: number; escaparam: number }[] = [];
  private readonly recentes: { t: number; d: number }[] = [];
  private readonly abatidos = new WeakSet<object>();
  private readonly inicio: number;

  constructor(private readonly relogio: () => number) {
    this.inicio = relogio();
  }

  dano(fonte: string, d: number): void {
    if (d <= 0) return;
    this.total += d;
    this.porFonte.set(fonte, (this.porFonte.get(fonte) ?? 0) + d);
    this.recentes.push({ t: this.relogio(), d });
  }

  bloqueio(fonte: string): void {
    this.bloqueados.set(fonte, (this.bloqueados.get(fonte) ?? 0) + 1);
  }

  abate(tipo: string, quem: object): void {
    this.abates.set(tipo, (this.abates.get(tipo) ?? 0) + 1);
    this.abatidos.add(quem);
  }

  foiAbatido(quem: object): boolean {
    return this.abatidos.has(quem);
  }

  onda(n: number, ms: number, escaparam: number): void {
    this.ondas.push({ n, ms, escaparam });
  }

  /** Segundos desde o começo. */
  get tempo(): number {
    return (this.relogio() - this.inicio) / 1000;
  }

  get dps(): number {
    return this.tempo > 0 ? this.total / this.tempo : 0;
  }

  /** DPS dos últimos 5s — o que a build faz AGORA (a média esconde os picos). */
  get dpsRecente(): number {
    const desde = this.relogio() - JANELA_MS;
    while (this.recentes.length && this.recentes[0].t < desde) this.recentes.shift();
    const soma = this.recentes.reduce((s, r) => s + r.d, 0);
    return soma / Math.min(JANELA_MS / 1000, Math.max(this.tempo, 0.001));
  }

  /** O painel, em HTML curto (o `SandboxArena` o escreve no canto da tela). */
  painel(ondaAtual: number): string {
    const fmt = (n: number): string => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
    const t = this.tempo;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    const ultima = this.ondas[this.ondas.length - 1];
    const media = this.ondas.length ? this.ondas.reduce((s, o) => s + o.ms, 0) / this.ondas.length / 1000 : 0;
    const fontes = [...this.porFonte.entries()].sort((a, b) => b[1] - a[1]).map(([f, d]) => `${f} ${Math.round(d)}`).join(' · ');
    const abates = [...this.abates.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
    const totalAbates = [...this.abates.values()].reduce((s, n) => s + n, 0);
    return `<b>TEMPO</b> ${mm}:${ss} &nbsp; <b>ONDA</b> ${ondaAtual}${ultima ? ` <span class="fraco">(última limpa em ${fmt(ultima.ms / 1000)}s; média ${fmt(media)}s)</span>` : ''}<br>
<b>DANO</b> ${Math.round(this.total)} &nbsp; <b>DPS</b> ${fmt(this.dps)} <span class="fraco">(últimos 5s ${fmt(this.dpsRecente)})</span><br>
<span class="fraco">por fonte:</span> ${fontes || '—'}<br>
<b>ABATES</b> ${totalAbates} <span class="fraco">${abates ? `(${abates})` : ''}</span><br>
<b>RECEBIDOS</b> golpes ${this.golpes} · casco gastou ${this.cascoGasto} · vidas −${this.vidasPerdidas} · bombas ${this.bombasUsadas}`;
  }

  /** O resumo para colar e comparar builds. */
  resumo(): Record<string, unknown> {
    return {
      tempo_s: Math.round(this.tempo),
      dano: Math.round(this.total),
      dps: Math.round(this.dps * 10) / 10,
      dano_por_fonte: Object.fromEntries([...this.porFonte.entries()].map(([f, d]) => [f, Math.round(d)])),
      abates: Object.fromEntries(this.abates),
      bloqueados: Object.fromEntries(this.bloqueados),
      ondas: this.ondas.map((o) => ({ n: o.n, s: Math.round(o.ms / 100) / 10, escaparam: o.escaparam })),
      recebidos: { golpes: this.golpes, casco: this.cascoGasto, vidas: this.vidasPerdidas, bombas: this.bombasUsadas },
    };
  }
}
