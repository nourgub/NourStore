"""Project figures: render each project deck (LibreOffice -> PDF -> PNG) and compose the slides named in the legend, with gold numbered markers."""
import subprocess, os, glob, tempfile
from PIL import Image, ImageDraw, ImageFont
S = os.path.dirname(os.path.abspath(__file__)); P = os.path.abspath(S + '/../projets')
SOFF = '/root/.claude/skills/synced/71915369-dd07-4c56-b6dc-b58f22bc837a_19973b43-eeeb-4fa5-85f9-8afe53831a92/pptx/scripts/office/soffice.py'
FIG = {'P25': ('Projet1-Expose-scolaire', [1, 2, 3, 4, 5]), 'P26': ('Projet2-Pitch-commercial', [1, 2, 3, 4, 5]), 'P27': ('Projet3-Bilan-des-ventes', [2, 3, 4, 5]),
       'P28': ('Projet4-Soutenance-memoire', [1, 2, 3, 5, 6]), 'P29': ('Projet5-Portfolio-CV', [1, 2, 3, 4]), 'P30': ('Projet6-Quiz-interactif', [2, 3, 4, 9])}
F = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', 40)
tmp = tempfile.mkdtemp()
for fid, (deck, slides) in FIG.items():
    subprocess.run(['python3', SOFF, '--headless', '--convert-to', 'pdf', '--outdir', tmp, f'{P}/{deck}.pptx'], capture_output=True, timeout=180)
    for f in glob.glob(f'{tmp}/s-*.png'): os.remove(f)
    subprocess.run(['pdftoppm', '-r', '110', '-png', f'{tmp}/{deck}.pdf', f'{tmp}/s'], check=True)
    pages = sorted(glob.glob(f'{tmp}/s-*.png'))
    ims = [Image.open(pages[n - 1]).convert('RGB') for n in slides]
    cols = 2 if len(ims) == 4 else 3
    w = 1000 if cols == 2 else 760; h = round(w * 9 / 16); gap = 50; pad = 60
    rows = (len(ims) + cols - 1) // cols
    W = cols * w + (cols - 1) * gap + 2 * pad; H = rows * h + (rows - 1) * gap + 2 * pad
    C = Image.new('RGB', (W, H), '#EDEBE9'); d = ImageDraw.Draw(C)
    for i, im in enumerate(ims):
        # right-to-left order: first slide top-right, like reading Arabic
        c = cols - 1 - (i % cols); r = i // cols
        x = pad + c * (w + gap); y = pad + r * (h + gap)
        d.rectangle([x + 4, y + 6, x + w + 4, y + h + 6], fill='#C9C6C2')
        C.paste(im.resize((w, h), Image.LANCZOS), (x, y))
        d.rectangle([x - 3, y - 3, x + w + 3, y + h + 3], outline='#D4A84B', width=5)
        cx, cy, R = x + w - 6, y + 6, 34
        d.ellipse([cx - R - 4, cy - R - 4, cx + R + 4, cy + R + 4], fill='#0F2747'); d.ellipse([cx - R, cy - R, cx + R, cy + R], fill='#D4A84B', outline='white', width=5)
        t = str(i + 1); tw = d.textlength(t, font=F); d.text((cx - tw / 2, cy - 27), t, font=F, fill='#0F2747')
        lab = f'شريحة {slides[i]}'
    C.save(f'{S}/ill/{fid}.png'); print(fid, C.size)
