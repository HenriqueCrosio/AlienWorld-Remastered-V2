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
  /** Uma linha, no menu. Diz o TRADE-OFF, não o adjetivo. CURTA: a coluna tem ~150px. */
  tagline: string;
}

export const SHIPS: Record<string, ShipDef> = {
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
    tagline: 'caça sozinho · erra o que é rápido',
  },
};

/** A nave da Fase 1: ela acontece ANTES da escolha, então é sempre esta. */
export const DEFAULT_SHIP = 'interceptor';

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
export const ROSTER_AURORA = ['interceptor', 'lanca', 'dispersor'];
export const ROSTER_DOCA = ['interceptor', 'lanca', 'dispersor', 'alien'];
