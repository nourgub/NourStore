"""Split very wide ribbon figures into two stacked halves so the labels stay readable in print."""
import json, os, sys
from PIL import Image, ImageDraw
S = os.path.dirname(os.path.abspath(__file__))
clips = json.load(open(f'{S}/clips.json'))
for fid, c in clips.items():
    if c['width'] < 1300 or c['width'] / c['height'] < 2.6: continue
    im = Image.open(f'{S}/ill/{fid}.png').convert('RGB'); k = im.width / c['width']
    # cut at the column nearest the middle that does not cross a marker
    g = im.convert('L'); y0, y1 = int(im.height * .28), int(im.height * .62); px = g.load()
    def ink(X): return sum(1 for y in range(y0, y1, 2) if px[X, y] < 200)
    cand = [x for x in range(int(c['width'] * .35), int(c['width'] * .65)) if all(not (a - 6 <= x <= b + 6) for a, b in c['mk'])]
    # prefer an empty column (gap between ribbon groups), then the one nearest the middle
    best = min(cand, key=lambda x: (ink(int(x * k)) > 2, abs(x - c['width'] / 2)))
    cx = int(best * k); L, R = im.crop((0, 0, cx, im.height)), im.crop((cx, 0, im.width, im.height))
    gap = 36; W = max(L.width, R.width); out = Image.new('RGB', (W, L.height + R.height + gap), 'white')
    out.paste(L, (0, 0)); out.paste(R, (0, L.height + gap))
    d = ImageDraw.Draw(out); y = L.height + gap // 2
    for x in range(0, W, 28): d.line([(x, y), (x + 14, y)], fill='#D4A84B', width=4)
    out.save(f'{S}/ill/{fid}.png'); print('split', fid, im.size, '->', out.size)
