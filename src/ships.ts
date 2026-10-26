/**
 * AS NAVES — escolhidas na interlude, entre a Fase 1 e a Fase 2.
 *
 * **A nave É a sua arma base.** Não há atributo de casco, de velocidade nem de vida: a escolha
 * muda COMO VOCÊ ATIRA pelo resto da campanha, e nada mais. Um eixo só, e ele é o eixo do
 * gênero — num run'n'gun, a arma é a personagem.
 *
 * ⚠️ REGRA INEGOCIÁVEL (docs/GDD.md §5): a arma da nave é a arma **BASE** — infinita e fraca.
 * Se uma nave começar com uma especial de munição infinita, o modelo Metal Slug inteiro
 * (base fraca + especial escassa que se perde ao morrer) desmonta, e os pickups deixam de
 * significar alguma coisa.
 *
 * ⚠️ SÃO SIDEGRADES, NÃO UPGRADES. Se uma nave for simplesmente melhor, a escolha deixa de ser
 * uma escolha e vira a resposta certa — e um menu com uma resposta certa é um menu inútil.
 */
export interface ShipDef {
  id: string;
  name: string;
  /** A arma BASE que esta nave carrega para sempre. */
  weapon: string;
  /** Textura. Cai na `ship` padrão enquanto a arte do PixelLab não entrar. */
  texture: string;
  /** Animação de propulsão da nave (róster v2: cada nave tem a sua, 9 quadros). */
  anim?: string;
  /** Uma linha, no menu. Diz o TRADE-OFF, não o adjetivo. CURTA: a coluna tem ~150px. */
  tagline: string;
}

/**
 * UMA NAVE POR LINHAGEM (25/10) — os tiers saíram. Ele: *"retirar os tiers e trabalhar apenas com 1 tipo de nave,
 * exatamente como aparecem no primeiro hangar e depois a manta no seu tier maximo"* (a escada era só visual e não
 * convencia). A ALIEN é a manta dos chifres abertos (a antiga T2), já na Doca. As peças (as estrelas) continuam caindo
 * e dão só o 1-UP (src/pecas.ts).
 *
 * A HUMANA É ESCOLHIDA NO HANGAR (25/10, à noite): DOIS MODELOS, duas pinturas cada. Ele: *"uma delas vai ser a
 * escolha da nave preta e laranja, o outro lado fica para a escolha da nossa nave principal, que era a T1 da nave
 * humana antiga"*. O modelo "a" é a preta "a" do concept como MOLDE (`scripts/_naves/_nave-molde-preta.mjs`), em
 * laranja ou preta; o JATO é a T1 antiga (inspirada no X-wing), na pintura dele ou na de osso
 * (`scripts/_naves/_pintar-jato.mjs`). SÓ O VISUAL muda: a hitbox (21×9), a arma e as cartas são as mesmas — a escolha
 * é de identidade, não de build (nada novo para balancear).
 */
export type Modelo = 'a' | 'jato';
export type Pintura = 'laranja' | 'preta' | 'osso';
export interface Escolha {
  modelo: Modelo;
  pintura: Pintura;
}
/** As escolhas do hangar, na ordem da tecla de teste do menu. A 1ª é a de quem ainda não escolheu. */
export const ESCOLHAS: readonly Escolha[] = [
  { modelo: 'a', pintura: 'laranja' },
  { modelo: 'a', pintura: 'preta' },
  { modelo: 'jato', pintura: 'laranja' },
  { modelo: 'jato', pintura: 'osso' },
];
export const nomeDaEscolha = (e: Escolha): string => `${e.modelo}-${e.pintura}`;
export const escolhaPorNome = (nome: unknown): Escolha | undefined => ESCOLHAS.find((e) => nomeDaEscolha(e) === nome);

/** O registry do Phaser, só no que a escolha usa (este arquivo é dado — não importa o Phaser). */
interface Registro {
  get(chave: string): unknown;
  set(chave: string, valor: unknown): unknown;
}
const CHAVE_MODELO = 'modeloNave';
const CHAVE_PINTURA = 'pinturaNave';

/** A humana escolhida no hangar (a 1ª de `ESCOLHAS` até ele existir ou até a escolha; sem modelo = a "a"). */
export function naveEscolhida(reg: Registro): Escolha {
  const modelo = reg.get(CHAVE_MODELO) ?? 'a';
  const pintura = reg.get(CHAVE_PINTURA);
  return ESCOLHAS.find((e) => e.modelo === modelo && e.pintura === pintura) ?? ESCOLHAS[0];
}

/** O que a cena do hangar chama quando o jogador escolhe a nave (e a tecla de teste do menu, e o sandbox). */
export function escolherNave(reg: Registro, e: Escolha): void {
  reg.set(CHAVE_MODELO, e.modelo);
  reg.set(CHAVE_PINTURA, e.pintura);
}

/**
 * OS NOMES (26/10, dele): o jato (o X-wing) é a **X-AELO** — Aelo, a harpia grega —, a "a" é a **TERMINUS**, e a manta
 * é a **CHARYBDIS** (ele deixou "Charybdis ou Manta mesmo"; ficou Charybdis). O hangar e o painel da Doca leem daqui.
 */
export const NOME_MODELO: Record<Modelo, string> = { jato: 'X-AELO', a: 'TERMINUS' };
export const NOME_ALIEN = 'CHARYBDIS';

/** O nome da nave na tela: a humana pelo modelo escolhido no hangar, a alien pelo dela. */
export function nomeDaNave(id: string, e: Escolha = ESCOLHAS[0]): string {
  if (id === 'humana') return NOME_MODELO[e.modelo];
  if (id === 'alienigena') return NOME_ALIEN;
  return SHIPS[id]?.name ?? id;
}

const HUMANA: Record<string, { texture: string; anim: string }> = {
  'a-laranja': { texture: 'naveHumana', anim: 'nave-humana-thrust' },
  'a-preta': { texture: 'naveHumanaPreta', anim: 'nave-humana-preta-thrust' },
  'jato-laranja': { texture: 'shipJato', anim: 'ship-jato-thrust' },
  'jato-osso': { texture: 'naveJatoOsso', anim: 'nave-jato-osso-thrust' },
};

/**
 * A nave na tela: a humana na escolha do hangar; as outras, a textura do cadastro. TODA cena que mostra a nave do
 * jogador passa por aqui (a fase, as chegadas e as trocas das cutscenes, o painel da Doca, a final) — uma cena que
 * lesse `SHIPS[id].texture` mostraria o jato a quem escolheu a "a".
 */
export function visualDaNave(id: string, e: Escolha = ESCOLHAS[0]): { texture: string; anim?: string } {
  if (id === 'humana') return HUMANA[nomeDaEscolha(e)];
  const nave = SHIPS[id];
  return { texture: nave.texture, anim: nave.anim };
}

export const SHIPS: Record<string, ShipDef> = {
  // ─── PROTÓTIPO DAS CARTAS (feat/cartas-preview, 27/09): DUAS LINHAGENS, uma nave cada. ───
  // O poder vem das CARTAS; a nave não evolui (25/10: os tiers saíram — `visualDaNave`, acima).
  humana: {
    id: 'humana',
    name: 'LINHAGEM HUMANA',
    weapon: 'baseHumana',
    texture: 'shipJato',
    anim: 'ship-jato-thrust',
    tagline: 'o jato da colônia',
  },
  alienigena: {
    id: 'alienigena',
    name: 'LINHAGEM ALIEN',
    weapon: 'baseAlien',
    // A manta dos chifres abertos (a antiga T2, 25/10): o painel da Doca, a nave parada na doca e a chegada da F3 a
    // leem daqui — o jogador vê na doca exatamente a nave com que vai sair.
    texture: 'naveAlienT2',
    anim: 'nave-alien-t2-nado',
    tagline: 'tecnologia do inimigo',
  },

  // ─── O RÓSTER v2 (2026-07-17, direção do Henrique). ───
  //
  // O JATO é a nave "terrestre" — a Fase 1 inteira é jogada nele, ANTES de qualquer escolha.
  // A Aurora libera mais 3; a Doca soma a branca, a alien-preta e o Arauto; a nave de 4 canhões
  // fica reservada para a fase final (ROSTER_FINAL, abaixo).
  jato: {
    id: 'jato',
    name: 'JATO DE ATAQUE',
    weapon: 'tracer',
    texture: 'shipJato',
    anim: 'ship-jato-thrust',
    tagline: 'dupla · abraça o casco',
  },
  verde: {
    id: 'verde',
    name: 'BOMBARDEIRA',
    weapon: 'obus',
    texture: 'shipVerde',
    anim: 'ship-verde-thrust',
    tagline: 'pesada · exige liderar o alvo',
  },
  creme: {
    id: 'creme',
    name: 'CORSÁRIA',
    weapon: 'agulha',
    texture: 'shipCreme',
    anim: 'ship-creme-thrust',
    tagline: 'rápida · rala no casco',
  },
  cinza: {
    id: 'cinza',
    name: 'FANTASMA',
    weapon: 'salva',
    texture: 'shipCinza',
    anim: 'ship-cinza-thrust',
    tagline: 'rajada · a pausa expõe',
  },
  branca: {
    id: 'branca',
    name: 'PERFURADORA',
    weapon: 'perfurante',
    texture: 'shipBranca',
    anim: 'ship-branca-thrust',
    tagline: 'atravessa · fraca no um-a-um',
  },
  canhoes: {
    id: 'canhoes',
    name: 'BATERIA',
    weapon: 'bateria',
    texture: 'shipCanhoes',
    anim: 'ship-canhoes-thrust',
    tagline: '4 canos · abre com a distância',
  },
  alien2: {
    id: 'alien2',
    name: 'ESPECTRO',
    weapon: 'lamina',
    texture: 'shipAlien2',
    anim: 'ship-alien2-thrust',
    tagline: 'onda larga · perdoa a mira',
  },

  // ─── LEGADO (fora dos rósters desde o v2; defs mantidos para nada quebrar). ───
  interceptor: {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    weapon: 'pulse',
    texture: 'ship',
    tagline: 'reta · sem fraqueza',
  },
  lanca: {
    id: 'lanca',
    name: 'LANÇA',
    weapon: 'lance',
    texture: 'ship2',
    tagline: 'pesada · não perdoa erro',
  },
  dispersor: {
    id: 'dispersor',
    name: 'DISPERSOR',
    weapon: 'spread',
    texture: 'ship3',
    tagline: 'leque · exige chegar perto',
  },

  /**
   * A NAVE ALIENÍGENA — só oferecida na 2ª interlude (a base no cinturão).
   *
   * Ela não é "a nave 4", é a PRIMEIRA COISA DO JOGO QUE NÃO É SUA. Você a encontra encalhada
   * numa doca de mineração no meio do nada, e pilotá-la é a primeira vez que a campanha te deixa
   * usar a tecnologia do inimigo contra ele — o que é exatamente o arco de quem está indo caçar
   * o Leviatã.
   *
   * ⚠️ O ENXAME NÃO É UM UPGRADE, e a trava disso está na `HomingDef` (WeaponSystem): a curva é
   * LENTA. Ela nunca erra um alvo grande e lento, e quase sempre erra um alvo pequeno e rápido —
   * o inverso exato das outras três. Se ela virasse rápido, mirar deixaria de ser habilidade e a
   * escolha viraria "pegue a alienígena, ela é melhor".
   */
  alien: {
    id: 'alien',
    name: 'ARAUTO',
    weapon: 'enxame',
    texture: 'ship4',
    anim: 'ship-arauto-thrust',
    tagline: 'caça sozinho · erra o que é rápido',
  },
};

/** A nave da Fase 1: ela acontece ANTES da escolha, então é sempre esta. O jato "terrestre". */
export const DEFAULT_SHIP = 'humana';

/**
 * QUAIS NAVES CADA INTERLUDE OFERECE.
 *
 * A alienígena NÃO existe na 1ª escolha, e isso é a narrativa funcionando como regra: naquele
 * momento o jogador está no convés da SUA frota, escolhendo entre as naves DELE. O Arauto só
 * aparece na 2ª interlude porque é lá que ele é ENCONTRADO — encalhado numa doca de mineração no
 * meio do cinturão. Uma nave alienígena disponível no hangar humano da Aurora não teria de onde
 * ter vindo.
 *
 * É por isso que o róster é DADO da cena, e não a lista inteira de `SHIPS`: a escolha cresce com
 * a campanha.
 */
export const ROSTER_AURORA = ['humana'];
// PROTÓTIPO DAS CARTAS: a Doca oferece o certo (a humana) e o incerto (a alien, largada ali).
export const ROSTER_DOCA = ['humana', 'alienigena'];
const ROSTER_DOCA_ANTIGO = ['jato', 'verde', 'creme', 'cinza', 'branca', 'alien2', 'alien'];
/**
 * A nave de 4 canhões entra QUANDO A FASE FINAL EXISTIR — não ligue este róster a cena nenhuma
 * antes disso (a mesma regra do STAGES[3]: oferecer o que não existe despeja o jogador no lugar
 * errado sem aviso).
 */
export const ROSTER_FINAL = [...ROSTER_DOCA_ANTIGO, 'canhoes'];
