#!/usr/bin/env python3
"""Put Nib — handwritten maths to LaTeX, the Board's engine (croix18/Nib) — into Deckhand.html.

    python3 tools/vendor_nib.py [path/to/nib.js]

Without a path it takes the engine the kit carries, ../Windmill/nib/nib.js (croix18/Windmill: the shared code Croix's
tools take from, with nib/VERSION naming the Nib release and commit), else ../nib/dist/nib.js. The engine sits in its own
<script id="nib-engine"> between the `<!-- nib:begin` and `<!-- nib:end -->` markers, before the board's own script
(which reads the file's source at start-up for Export a copy, so the engine has to be in the page by then). The marker
names the release (and the commit, when a VERSION file sits beside the engine). Nothing else in the file is touched.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / 'Deckhand.html'
BEGIN, END = '<!-- nib:begin', '<!-- nib:end -->'
KIT = ROOT.parent / 'Windmill' / 'nib' / 'nib.js'
REPO = ROOT.parent / 'nib' / 'dist' / 'nib.js'


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else (KIT if KIT.exists() else REPO)
    js = src.read_text(encoding='utf-8')
    m = re.match(r'/\*! Nib (\d+\.\d+\.\d+)', js)
    if not m:
        sys.exit(f'{src} does not start with the Nib banner: not nib.js?')
    # inside a <script> element the text may not close it, nor open an HTML comment the parser would track
    if re.search(r'</script|<!--', js, re.I):
        sys.exit(f'{src} holds "</script" or "<!--": it cannot sit inside a script element as it is')
    version = m.group(1)
    origin = 'croix18/Nib dist/nib.js'
    vf = src.parent / 'VERSION'
    if vf.exists():
        lines = [l.strip() for l in vf.read_text(encoding='utf-8').splitlines() if l.strip()]
        if lines and lines[0] != f'Nib {version}':
            sys.exit(f'{vf} says "{lines[0]}" but the engine beside it is Nib {version}')
        origin = ', '.join(lines[1:]) + ' (by way of the Windmill kit)' if len(lines) > 1 else origin
    with open(PAGE, encoding='utf-8', newline='') as f:
        html = f.read()
    i, j = html.find(BEGIN), html.find(END)
    if i < 0 or j < i:
        sys.exit('Deckhand.html has no nib:begin / nib:end markers')
    block = (f'{BEGIN} Nib {version}: handwritten maths to LaTeX, {origin}; put here by tools/vendor_nib.py, '
             f'never edit it by hand -->\n<script id="nib-engine">\n{js.rstrip()}\n</script>\n{END}')
    html = html[:i] + block + html[j + len(END):]
    with open(PAGE, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print(f'Nib {version} ({len(js):,} bytes, {origin}) is in Deckhand.html')


if __name__ == '__main__':
    main()
