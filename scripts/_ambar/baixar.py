import sys, urllib.request, os
S = sys.argv[1]
for tag, job, n in [('peq', '6a8d4de6-3834-49fa-a1dc-b8d5574ec145', 64), ('med', '4bd13eee-5776-4990-859c-1d273e611a7f', 25)]:
    os.makedirs(f'{S}/{tag}', exist_ok=True)
    for i in range(n):
        u = f'https://api.pixellab.ai/mcp/images/{job}/download?index={i}'
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'pixel-client'})).read()
            open(f'{S}/{tag}/{i}.png', 'wb').write(data)
        except Exception as e:
            print(tag, i, e)
print('ok')
