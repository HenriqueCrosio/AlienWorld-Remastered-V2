#!/bin/sh
# 02/11 — downloads a PixMiniMax job's frames (index 0 = the input frame, then the generated ones) into <out-dir>.
#   sh baixar.sh <job> <out-dir> <frames incl. the input>
mkdir -p "$2"
i=0
while [ $i -lt $3 ]; do
  curl -s -f -o "$2/$i.png" "https://api.pixellab.ai/mcp/images/$1/download?index=$i" || echo "fail $2 $i"
  i=$((i+1))
done
echo "$2: $(ls "$2" | grep -c '^[0-9]*\.png$') frames"
