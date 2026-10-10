"""Find chapters whose summary spills alone onto a page; give their figures a smaller max height (tight.json)."""
import subprocess, json, os, re
S = os.path.dirname(os.path.abspath(__file__))
pdf = f'{S}/out/pdf.pdf'; toc = json.load(open(f'{S}/toc.json'))
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
starts = [(pg, int(re.match(r'الفصل (\d+)', t).group(1))) for t, pg in toc if re.match(r'الفصل \d+', t)]
tight = json.load(open(f'{S}/tight.json')) if os.path.exists(f'{S}/tight.json') else {}
changed = False
for p in range(2, n + 1):
    lines = [l for l in subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-layout', pdf, '-'], capture_output=True, text=True).stdout.splitlines() if l.strip()]
    if len(lines) < 10 and any('خلاصة الفصل' in l for l in lines[:3]):
        ch = max((c for pg, c in starts if pg <= p), default=None)
        if ch is None: continue
        f = f'ch{ch:02d}.md'; cur = tight.get(f, 11)
        if cur > 9.5: tight[f] = round(cur - 0.75, 2); changed = True; print('tighten', f, tight[f], 'page', p)
json.dump(tight, open(f'{S}/tight.json', 'w'), indent=1)
print('changed' if changed else 'ok')
