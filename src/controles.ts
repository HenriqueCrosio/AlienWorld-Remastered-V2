/**
 * O MAPA DE TECLAS (spec `2026-10-03-mapa-de-teclas-design.md`): o jogo pergunta por AÇÕES, nunca por teclas — o
 * desenho dos "action maps" das engines. As ações moram na MÃO ESQUERDA e valem igual para quem move no WASD ou nas
 * setas; os dois layouts mudam só o movimento.
 *
 * Sem Phaser (o teste roda em node): as teclas são os NOMES do `Phaser.Input.Keyboard.KeyCodes`. O Phaser não separa
 * o Shift esquerdo do direito — e é isso que queremos (a bomba vale nos dois lados).
 *
 * ⚠️ NENHUM PERFIL USA CTRL: Ctrl+W fecha a aba e nenhuma página consegue bloquear. No WASD, segurar W e apertar a
 * bomba fecharia o jogo (a repetição do W chega como Ctrl+W).
 *
 * É o gancho do MENU DE CONTROLES (spec própria, junto com o áudio): ele só vai escrever em `aw.teclas`.
 */
export type Acao = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'flap' | 'tiro' | 'bomba' | 'dash' | 'flare' | 'missil';
export type Perfil = 'padrao' | 'classico';
export type Mapa = Record<Acao, readonly string[]>;

export const ACOES: readonly Acao[] = ['cima', 'baixo', 'esquerda', 'direita', 'flap', 'tiro', 'bomba', 'dash', 'flare', 'missil'];

/** WASD OU setas. O flap é o "para cima" da F1 (W / ↑) — o Espaço não faz flap desde 03/10. */
const MOVIMENTO = {
  cima: ['W', 'UP'],
  baixo: ['S', 'DOWN'],
  esquerda: ['A', 'LEFT'],
  direita: ['D', 'RIGHT'],
  flap: ['W', 'UP'],
} as const;

export const PERFIS: Record<Perfil, Mapa> = {
  // Espaço no polegar, Shift no mindinho (os dois lados), E e F no indicador — o par clássico de habilidade no PC. O
  // MÍSSIL (04/10: deixou de ser automático — *"apelão demais"*) no Q, o vizinho do E na fileira de cima.
  padrao: { ...MOVIMENTO, tiro: ['SPACE'], bomba: ['SHIFT'], dash: ['E'], flare: ['F'], missil: ['Q'] },
  // O old school do shmup (Z atira, X bomba) — *"para quem quer ter o prazer de jogar x/z"* (03/10). O míssil no V,
  // seguindo a fileira de baixo.
  classico: { ...MOVIMENTO, tiro: ['Z'], bomba: ['X'], dash: ['C'], flare: ['F'], missil: ['V'] },
};

export const CHAVE_STORAGE = 'aw.teclas';

const ehPerfil = (v: unknown): v is Perfil => v === 'padrao' || v === 'classico';

/** `?teclas=` na URL vence (e é gravado); senão o salvo; senão o padrão. */
export function resolverPerfil(salvo: string | null, busca: string): { perfil: Perfil; gravar: Perfil | null } {
  const pedido = new URLSearchParams(busca).get('teclas');
  if (ehPerfil(pedido)) return { perfil: pedido, gravar: pedido };
  return { perfil: ehPerfil(salvo) ? salvo : 'padrao', gravar: null };
}

export function perfilAtivo(): Perfil {
  let salvo: string | null = null;
  try {
    salvo = localStorage.getItem(CHAVE_STORAGE);
  } catch {
    // Sem storage (aba privada, bloqueado): fica o padrão.
  }
  const { perfil, gravar } = resolverPerfil(salvo, typeof location === 'undefined' ? '' : location.search);
  if (gravar) {
    try {
      localStorage.setItem(CHAVE_STORAGE, gravar);
    } catch {
      // Idem: a escolha vale só nesta visita.
    }
  }
  return perfil;
}

export const mapaAtivo = (): Mapa => PERFIS[perfilAtivo()];

const ROTULO: Record<string, string> = { SPACE: 'ESPAÇO' };

/** O nome da tecla na tela ("ESPAÇO repete…"). */
export const rotuloDaTecla = (nome: string): string => ROTULO[nome] ?? nome;
