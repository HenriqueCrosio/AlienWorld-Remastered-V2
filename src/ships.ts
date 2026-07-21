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

export const SHIPS: Record<string, ShipDef> = {
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
export const DEFAULT_SHIP = 'jato';

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
export const ROSTER_AURORA = ['jato', 'verde', 'creme', 'cinza'];
export const ROSTER_DOCA = ['jato', 'verde', 'creme', 'cinza', 'branca', 'alien2', 'alien'];
/**
 * A nave de 4 canhões entra QUANDO A FASE FINAL EXISTIR — não ligue este róster a cena nenhuma
 * antes disso (a mesma regra do STAGES[3]: oferecer o que não existe despeja o jogador no lugar
 * errado sem aviso).
 */
export const ROSTER_FINAL = [...ROSTER_DOCA, 'canhoes'];
