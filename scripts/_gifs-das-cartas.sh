#!/usr/bin/env bash
# Um GIF por carta (as que têm efeito visível), no pixel nativo (GIF_ZOOM=1), para a folha das skills.
# Uso, da raiz: bash scripts/_gifs-das-cartas.sh <pasta>   (npm run dev rodando)
OUT=${1:-docs/superpowers/folhas/2026-10-02/skills}
mkdir -p "$OUT"
export GIF_ZOOM=1
g() { node scripts/_gif-cartas.mjs "$OUT/$1.gif" "$2" "$3" aprovada "${4:-humana}" || echo "FALHOU $1"; }
g WPN_001 base,duplo 2.5
g WPN_002 base,triplo 2.5
g WPN_004 base,cadencia 2.5
g WPN_007 perfurante 2.5
g WPN_008 base,pesado 2.5
g WPN_009 missil1,missil2,missilvolta 3
g WPN_010 drone,dronealien 4
g EFF_001 explosivo 2.5
g EFF_002 explosivo,maior 2.5
g EFF_003 fragmentos 2.5
g EFF_004 incendiario 3
g EFF_006 combustao 3.5
g EFF_007 emcadeia 4
g EFF_010 flare 5
g EFF_011 eletricotrava 4
g EFF_012 arco 4
g EFF_013 eletrico 4
g DEF_001 casco,cascoalien 3
g DEF_004 reativo 2.5
g MOV_003 dash 2.6
echo FIM
