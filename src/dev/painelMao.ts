import type Phaser from 'phaser';
import { NOMES_MAO, maoPorNome, type NomeMao } from './maos.ts';
import { carregar } from '../sandbox/config.ts';

const ROTULO: Record<NomeMao, string> = { nenhuma: 'sem cartas', mediana: 'mediana', forte: 'forte', sandbox: 'a do sandbox' };

/**
 * KEY 8 (dev — spec 2026-11-24-besta-refeita §7): a small HTML list of the ready hands over the game. The scene pauses
 * while it is open (its keys stop: the sandbox's 1–4 never fire under it); 1–4 or a click picks, ESC closes and resumes.
 * The keys are caught on `window` in the CAPTURE phase and stopped there, so Phaser's own listener never sees them.
 */
export function abrirPainelMao(scene: Phaser.Scene, escolher: (cartas: string[], nome: NomeMao) => void): void {
  if (document.getElementById('dev-mao')) return;
  const niveis = carregar().niveis;
  scene.scene.pause();

  const caixa = document.createElement('div');
  caixa.id = 'dev-mao';
  caixa.style.cssText =
    'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;display:flex;flex-direction:column;' +
    'gap:6px;padding:12px 16px;background:#0d0f14ee;border:1px solid #6a6f80;color:#e4e4e8;font:14px monospace';
  const titulo = document.createElement('b');
  titulo.textContent = 'MÃO (dev) — 1–4 ou clique, ESC fecha';
  caixa.appendChild(titulo);

  const fechar = (): void => {
    window.removeEventListener('keydown', tecla, true);
    caixa.remove();
  };
  const pegar = (nome: NomeMao): void => {
    fechar();
    escolher(maoPorNome(nome, niveis), nome);
  };
  NOMES_MAO.forEach((nome, i) => {
    const b = document.createElement('button');
    b.dataset.mao = nome;
    b.textContent = `${i + 1}  ${ROTULO[nome]} (${maoPorNome(nome, niveis).length} cartas)`;
    b.style.cssText = 'text-align:left;font:inherit;padding:4px 8px;cursor:pointer';
    b.onclick = () => pegar(nome);
    caixa.appendChild(b);
  });

  function tecla(e: KeyboardEvent): void {
    const i = Number(e.key) - 1;
    if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      e.preventDefault();
      fechar();
      scene.input.keyboard?.resetKeys();
      scene.scene.resume();
    } else if (Number.isInteger(i) && i >= 0 && i < NOMES_MAO.length) {
      e.stopImmediatePropagation();
      e.preventDefault();
      pegar(NOMES_MAO[i]);
    }
  }
  window.addEventListener('keydown', tecla, true);
  document.body.appendChild(caixa);
}
