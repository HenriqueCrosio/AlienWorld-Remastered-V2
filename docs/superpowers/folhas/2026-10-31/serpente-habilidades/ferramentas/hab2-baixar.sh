#!/bin/sh
# usage: hab2-baixar.sh <job> <name> <frames>
S="C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad"
mkdir -p "$S/hab2/$2"
i=0
while [ $i -lt $3 ]; do
  curl -s -f -o "$S/hab2/$2/$i.png" "https://api.pixellab.ai/mcp/images/$1/download?index=$i" || echo "fail $2 $i"
  i=$((i+1))
done
echo "$2: $(ls "$S/hab2/$2" | grep -c '^[0-9]*\.png$') frames"
