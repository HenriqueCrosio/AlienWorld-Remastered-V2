import './montagem.css';
import { CARTAS } from '../data/catalogoCartas.ts';
import { COR_RARIDADE, NOME_RARIDADE } from '../raridade.ts';
import { ARVORES, ATALHOS, atalho, gastos, limiteDePontos, podeSomar, podeTirar, semF1Fora, somar, tirar, type Nave } from './arvore.ts';
import { INIMIGOS, MAX_POR_ONDA, NOME_INIMIGO, TIERS, carregar, salvar, type ConfigSandbox, type TipoInimigo } from './config.ts';

/**
 * A TELA DE MONTAGEM do sandbox (spec `2026-10-02-sandbox-dev-design.md`) — HTML por cima do canvas, só em dev.
 * Monta a build (as 4 árvores), a nave, o fundo, os inimigos e as ondas; o JOGAR entrega a `ConfigSandbox` a quem
 * abriu (o `main.ts`, que liga a `GameScene` em modo sandbox).
 *
 * Desenho por STRING + delegação: cada mudança redesenha tudo (são ~60 elementos); os ouvintes moram na raiz e leem
 * `data-acao`, então sobrevivem ao redesenho.
 */

const CEL = 56;
const PASSO_X = 72;
const PASSO_Y = 84;

let raiz: HTMLElement | null = null;
let cfg: ConfigSandbox;
let aoJogar: (c: ConfigSandbox) => void = () => {};

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const ctx = (): { nave: Nave; livre: boolean; fase: number } => ({ nave: cfg.nave, livre: cfg.livre, fase: cfg.fase });

export function abrirMontagem(jogar: (c: ConfigSandbox) => void): void {
  aoJogar = jogar;
  cfg = carregar();
  if (!raiz) criarRaiz();
  raiz!.hidden = false;
  desenhar();
}

export function fecharMontagem(): void {
  if (raiz) raiz.hidden = true;
  // ⚠️ O FOCO SAI DA MONTAGEM: preso no botão JOGAR (escondido), as teclas do jogo morreriam no `stopPropagation`.
  (document.activeElement as HTMLElement | null)?.blur();
}

function criarRaiz(): void {
  const r = document.createElement('div');
  r.id = 'sandbox';
  document.body.appendChild(r);
  raiz = r;
  // ⚠️ O PHASER ESCUTA A JANELA e captura setas/espaço: as teclas digitadas na montagem param aqui.
  r.addEventListener('keydown', (e) => {
    if (!r.hidden) e.stopPropagation();
  });
  r.addEventListener('click', aoClicar);
  r.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const no = (e.target as HTMLElement).closest<HTMLElement>('.no');
    if (no) mudar((c) => (c.niveis = tirar(no.dataset.id!, c.niveis)));
  });
  r.addEventListener('change', aoMudar);
  r.addEventListener('mouseover', (e) => mostrarDica(e));
  r.addEventListener('mousemove', (e) => moverDica(e));
  r.addEventListener('mouseout', () => esconderDica());
}

function mudar(f: (c: ConfigSandbox) => void): void {
  f(cfg);
  salvar(cfg);
  desenhar();
}

// ─── OS EVENTOS ───────────────────────────────────────────────────────────────────────────────

function aoClicar(e: MouseEvent): void {
  const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-acao], .no');
  if (!alvo) return;
  if (alvo.classList.contains('no')) {
    mudar((c) => (c.niveis = somar(alvo.dataset.id!, c.niveis, ctx())));
    return;
  }
  const { acao, nome, tipo } = alvo.dataset;
  if (acao === 'reset') mudar((c) => (c.niveis = {}));
  if (acao === 'atalho') mudar((c) => (c.niveis = atalho(nome!, c.niveis, ctx())));
  if (acao === 'mais' || acao === 'menos') {
    const t = tipo as TipoInimigo;
    mudar((c) => (c.inimigos[t] = Math.max(0, Math.min(MAX_POR_ONDA[t], c.inimigos[t] + (acao === 'mais' ? 1 : -1)))));
  }
  if (acao === 'jogar' && !(alvo as HTMLButtonElement).disabled) {
    salvar(cfg);
    fecharMontagem();
    aoJogar(structuredClone(cfg));
  }
}

function aoMudar(e: Event): void {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  mudar((c) => {
    if (el.id === 'sb-nave') {
      c.nave = el.value as Nave;
      if (!TIERS[c.nave].includes(c.tier)) c.tier = TIERS[c.nave][TIERS[c.nave].length - 1];
    }
    if (el.id === 'sb-tier') c.tier = Number(el.value);
    if (el.id === 'sb-livre') c.livre = (el as HTMLInputElement).checked;
    if (el.name === 'sb-fase') {
      c.fase = Number(el.value) as ConfigSandbox['fase'];
      // Na F1 (voo por impulso) Dash e Propulsores não existem: saem da build.
      if (c.fase === 1) c.niveis = semF1Fora(c.niveis);
    }
    if (el.id === 'sb-chefe') c.chefe = (el as HTMLInputElement).checked;
    if (el.id === 'sb-intervalo') c.intervalo = Math.max(3, Math.min(30, Number(el.value) || 8));
    if (el.id === 'sb-repetir') c.repetir = (el as HTMLInputElement).checked;
  });
}

// ─── A DICA (passar o mouse num nó) ───────────────────────────────────────────────────────────

function mostrarDica(e: MouseEvent): void {
  const no = (e.target as HTMLElement).closest<HTMLElement>('.no');
  const dica = raiz?.querySelector<HTMLElement>('.dica');
  if (!no || !dica) return;
  const c = CARTAS[no.dataset.id!];
  dica.innerHTML = `<b>${c.nome}</b><span class="rar" style="color:${hex(COR_RARIDADE[c.raridade])}">${NOME_RARIDADE[c.raridade]}</span> · máx. ${c.max}
    <div>${c.curto}</div>${c.requer ? `<div class="req">requer ${CARTAS[c.requer].nome}</div>` : ''}${c.semF1 ? '<div class="req">fora da F1</div>' : ''}
    <div class="req">clique +1 · botão direito −1</div>`;
  dica.hidden = false;
  moverDica(e);
}

function moverDica(e: MouseEvent): void {
  const dica = raiz?.querySelector<HTMLElement>('.dica');
  if (!dica || dica.hidden) return;
  dica.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 270)}px`;
  dica.style.top = `${e.clientY + 14}px`;
}

function esconderDica(): void {
  const dica = raiz?.querySelector<HTMLElement>('.dica');
  if (dica) dica.hidden = true;
}

// ─── O DESENHO ────────────────────────────────────────────────────────────────────────────────

function desenhar(): void {
  const lim = limiteDePontos(ctx());
  const g = gastos(cfg.niveis);
  const estourou = g > lim;
  const pontos = `PONTOS ${g}/${lim === Infinity ? '∞' : lim}`;
  raiz!.innerHTML = `
<h1>SANDBOX <small>dev · monte a build, os inimigos e o fundo, e jogue</small></h1>
<div class="barra">
  <div class="grupo"><span class="rotulo">nave</span>
    <select id="sb-nave"><option value="humana"${cfg.nave === 'humana' ? ' selected' : ''}>humana</option><option value="alienigena"${cfg.nave === 'alienigena' ? ' selected' : ''}>alien (manta)</option></select>
    <select id="sb-tier">${TIERS[cfg.nave].map((t) => `<option value="${t}"${t === cfg.tier ? ' selected' : ''}>T${t}</option>`).join('')}</select></div>
  <span class="pontos${estourou ? ' estourou' : g === lim ? ' cheio' : ''}">${pontos}</span>
  <label class="grupo"><input type="checkbox" id="sb-livre"${cfg.livre ? ' checked' : ''}> LIVRE</label>
  <button data-acao="reset">RESET</button>
  <div class="grupo"><span class="rotulo">atalhos</span>${Object.keys(ATALHOS).map((n) => `<button data-acao="atalho" data-nome="${n}">${n}</button>`).join('')}</div>
</div>
<div class="arvores">${ARVORES.map(desenharArvore).join('')}</div>
<div class="baixo">
  <div class="caixa fundos"><h3>FUNDO</h3>
    ${[1, 2, 3, 4].map((f) => `<label><input type="radio" name="sb-fase" value="${f}"${cfg.fase === f ? ' checked' : ''}> F${f}${f === 1 ? ' (flap)' : ''}</label>`).join('')}
    <div style="margin-top:8px"><label><input type="checkbox" id="sb-chefe"${cfg.chefe ? ' checked' : ''}> começar no chefão da fase</label></div></div>
  <div class="caixa"><h3>INIMIGOS POR ONDA</h3><div class="inimigos">
    ${INIMIGOS.map((t) => `<div class="contador"><span>${NOME_INIMIGO[t]}</span><span><button data-acao="menos" data-tipo="${t}">−</button> <output>${cfg.inimigos[t]}</output> <button data-acao="mais" data-tipo="${t}">+</button></span></div>`).join('')}
  </div></div>
  <div class="caixa"><h3>ONDA</h3>
    <label class="grupo">intervalo <input type="number" id="sb-intervalo" min="3" max="30" value="${cfg.intervalo}"> s</label>
    <div style="margin-top:6px"><label><input type="checkbox" id="sb-repetir"${cfg.repetir ? ' checked' : ''}> repetir</label></div>
    <div class="teclas">no jogo: <kbd>ESC</kbd> montagem · <kbd>N</kbd> onda agora · <kbd>X</kbd> limpar · <kbd>I</kbd> invulnerável · <kbd>G</kbd> chefão · <kbd>M</kbd> medidas · <kbd>L</kbd> flare · dois toques = dash</div></div>
  <div class="caixa" style="display:grid;place-items:center"><button class="jogar" data-acao="jogar"${estourou ? ' disabled title="pontos acima do limite da nave"' : ''}>JOGAR</button></div>
</div>
<div class="dica" hidden></div>`;
}

function desenharArvore(a: (typeof ARVORES)[number]): string {
  const linhas = Math.max(...a.nos.map((n) => n.lin)) + 1;
  const w = (a.colunas - 1) * PASSO_X + CEL;
  const h = (linhas - 1) * PASSO_Y + CEL;
  const naArvore = new Map(a.nos.map((n) => [n.id, n]));
  const gastoAqui = a.nos.reduce((s, n) => s + (cfg.niveis[n.id] ?? 0), 0);
  // As SETAS de requisito (só dentro da mesma árvore — e as cadeias nunca cruzam árvores).
  const setas = a.nos
    .filter((n) => CARTAS[n.id].requer && naArvore.has(CARTAS[n.id].requer!))
    .map((n) => {
      const p = naArvore.get(CARTAS[n.id].requer!)!;
      const acesa = (cfg.niveis[p.id] ?? 0) > 0;
      return `<line x1="${p.col * PASSO_X + CEL / 2}" y1="${p.lin * PASSO_Y + CEL}" x2="${n.col * PASSO_X + CEL / 2}" y2="${n.lin * PASSO_Y - 2}" stroke="${acesa ? '#3ee0f0' : '#3a4152'}" stroke-width="2" marker-end="url(#sb-seta-${acesa ? 'a' : 'b'})"/>`;
    })
    .join('');
  const nos = a.nos
    .map((n) => {
      const c = CARTAS[n.id];
      const nivel = cfg.niveis[n.id] ?? 0;
      const pode = podeSomar(n.id, cfg.niveis, ctx());
      const classes = ['no', nivel > 0 ? 'ativo' : '', nivel >= c.max ? 'cheio' : '', pode ? 'disponivel' : '', !nivel && !pode ? 'bloqueado' : '', podeTirar(n.id, cfg.niveis) ? 'tiravel' : '']
        .filter(Boolean)
        .join(' ');
      return `<div class="${classes}" data-id="${n.id}" style="left:${n.col * PASSO_X}px;top:${n.lin * PASSO_Y}px;--cor:${hex(COR_RARIDADE[c.raridade])}"><img src="sprites/cartas/icone-${n.id}.png" alt="${c.nome}"><span class="nivel">${nivel}/${c.max}</span></div>`;
    })
    .join('');
  return `<div class="arvore"><h2>${a.titulo} <span>(${gastoAqui})</span></h2>
<div class="grade" style="width:${w}px;height:${h}px">
  <svg width="${w}" height="${h}"><defs>
    <marker id="sb-seta-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#3ee0f0"/></marker>
    <marker id="sb-seta-b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#3a4152"/></marker>
  </defs>${setas}</svg>${nos}
</div></div>`;
}
