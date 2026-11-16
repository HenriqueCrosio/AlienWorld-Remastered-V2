// BLOCK SOUND (15/11) — the shared sound-sheet page (spec `specs/2026-11-15-bloco-som-design.md` §6): every take of
// every sound, heard AS IN THE GAME (the same acoustics module the game uses), repeated ×8 with the per-shot
// variation, optionally over the soundtrack; one choice per sound; the footer is the text he pastes in the
// conversation. The choice is kept in this browser only. Served by Vite (it imports the game's .ts modules).
import { AO_FUNDO, montarAcustica } from '/src/som/acustica.ts';
import { sortearVariacao } from '/src/som/vozes.ts';

const dados = JSON.parse(document.getElementById('dados').textContent);
const raiz = document.getElementById('folha');
const CHAVE = `folha-sons:${location.pathname}`;
let escolhas = {};
try {
  escolhas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
} catch {
  escolhas = {};
}

let ctx = null;
let ac = null;
let trilha = null;
const buffers = new Map();
let lugarForcado = '';
let fundo = false;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    ac = montarAcustica(ctx, 'atmosfera');
    ac.saida.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function buffer(arquivo) {
  if (!buffers.has(arquivo)) buffers.set(arquivo, fetch(arquivo).then((r) => r.arrayBuffer()).then((b) => audio().decodeAudioData(b)));
  return buffers.get(arquivo);
}
async function tocar(som, versao, { variar = false, quando = 0 } = {}) {
  const c = audio();
  const lugar = lugarForcado || som.lugar || 'cabine';
  ac.mudar(lugar, 0);
  const b = await buffer(versao.arquivo);
  const f = c.createBufferSource();
  f.buffer = b;
  const g = c.createGain();
  const v = variar ? sortearVariacao(Math.random, som.variacao?.tom ?? 0.04, som.variacao?.vol ?? 0.1) : { taxa: 1, ganho: 1 };
  f.playbackRate.value = v.taxa;
  g.gain.value = 0.8 * v.ganho;
  let no = f.connect(g);
  if (fundo) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = AO_FUNDO[lugar].passaBaixa;
    g.gain.value *= AO_FUNDO[lugar].volume;
    no = no.connect(lp);
  }
  no.connect(som.interface ? c.destination : ac.entrada);
  f.start(c.currentTime + quando);
  if (som.laco) f.stop(c.currentTime + quando + 6);
}
function alternarTrilha(liga) {
  if (!liga) {
    trilha?.pause();
    return;
  }
  trilha ??= Object.assign(new Audio('/audio/stage1.mp3'), { loop: true, volume: 0.45 });
  trilha.play();
}
function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(escolhas));
  } catch {
    /* a private window: the choice lives only in the text below */
  }
  const linhas = [];
  for (const gr of dados.grupos) {
    for (const s of gr.sons) {
      const e = escolhas[s.nome];
      if (e?.id || e?.nota) linhas.push(`${s.nome}: ${e.id ?? '?'}${e.nota ? ` — ${e.nota}` : ''}`);
    }
  }
  document.getElementById('texto').value = linhas.join('\n');
  document.querySelectorAll('.versao').forEach((el) => el.classList.toggle('escolhida', escolhas[el.dataset.som]?.id === el.dataset.id));
}
const el = (tag, props = {}, ...filhos) => {
  const { dataset, ...resto } = props;
  const e = Object.assign(document.createElement(tag), resto);
  if (dataset) Object.assign(e.dataset, dataset);
  e.append(...filhos.filter((f) => f !== '' && f != null));
  return e;
};
const caixa = (rotulo, aoMudar) => {
  const c = el('input', { type: 'checkbox' });
  c.onchange = () => aoMudar(c.checked);
  return el('label', {}, c, rotulo);
};
const seletorLugar = () => {
  const s = el('select');
  for (const [v, t] of [['', 'o de cada som'], ['atmosfera', 'atmosfera'], ['caverna', 'caverna'], ['cabine', 'espaço (cabine)'], ['interior', 'interior (F4)'], ['agua', 'água (F4 B)']]) {
    s.append(el('option', { value: v, textContent: t }));
  }
  s.onchange = () => {
    lugarForcado = s.value;
  };
  return el('label', {}, 'ouvir no lugar:', s);
};

raiz.append(
  el('h1', { textContent: dados.titulo }),
  el('p', { className: 'nota', textContent: dados.nota ?? '' }),
  el('div', { className: 'barra' }, seletorLugar(), caixa('ao fundo (camada de trás)', (v) => (fundo = v)), caixa('trilha por baixo', alternarTrilha)),
);
for (const gr of dados.grupos) {
  raiz.append(el('h2', { textContent: gr.titulo }));
  for (const s of gr.sons) {
    const sec = el('section', { className: 'som' },
      el('header', {}, el('code', { textContent: s.nome }), el('strong', { textContent: s.oque }), el('span', { className: 'onde', textContent: `${s.onde} · ${s.lugar ?? 'cabine'}${s.laco ? ' · laço' : ''}` })));
    const grade = el('div', { className: 'versoes' });
    for (const v of s.versoes) {
      grade.append(el('div', { className: 'versao', dataset: { som: s.nome, id: v.id } },
        el('div', {}, el('strong', { textContent: v.id }), ' ',
          el('button', { textContent: '▶', title: 'ouvir', onclick: () => tocar(s, v) }), ' ',
          s.repetir ? el('button', { textContent: '×8', title: 'oito vezes, com a variação do jogo', onclick: () => { for (let i = 0; i < 8; i++) tocar(s, v, { variar: true, quando: i * 0.14 }); } }) : ''),
        el('div', { className: 'fonte', textContent: `${v.fonte} · ${v.licenca}` }),
        v.nota ? el('div', { className: 'fonte', textContent: v.nota }) : ''));
    }
    const escolha = el('div', { className: 'escolha' });
    for (const id of [...s.versoes.map((v) => v.id), 'refazer']) {
      const r = el('input', { type: 'radio', name: s.nome, value: id, checked: escolhas[s.nome]?.id === id });
      r.onchange = () => {
        escolhas[s.nome] = { ...escolhas[s.nome], id };
        gravar();
      };
      escolha.append(el('label', {}, r, id));
    }
    const nota = el('input', { type: 'text', placeholder: 'nota (opcional)', value: escolhas[s.nome]?.nota ?? '' });
    nota.oninput = () => {
      escolhas[s.nome] = { ...escolhas[s.nome], nota: nota.value };
      gravar();
    };
    escolha.append(nota);
    sec.append(grade, escolha);
    raiz.append(sec);
  }
}
document.body.append(el('footer', {}, el('div', { textContent: 'as escolhas (copie e cole na conversa):' }), el('textarea', { id: 'texto', readOnly: true })));
gravar();
