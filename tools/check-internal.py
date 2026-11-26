"""检查站内链接与锚点。先 pnpm build，再运行：python3 tools/check-internal.py"""
import os, re, sys, html
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')
dist = os.path.join(root, '.vitepress', 'dist')
bad = []; n = 0; pages = 0
for d, _, fs in os.walk(root):
    if '.vitepress' in d: continue
    for f in fs:
        if not f.endswith('.md'): continue
        pages += 1
        p = os.path.join(d, f); text = open(p, encoding='utf-8').read()
        body = re.sub(r'```[\s\S]*?```', '', text)
        if re.search(r'\{\{', re.sub(r'`[^`\n]*`', '', body)): bad.append((p, 'Vue 插值 {{ 出现在代码块之外'))
        for m in re.finditer(r'\]\((/[^)\s]*)\)', body):
            n += 1
            link = m.group(1); path, _, anchor = link.partition('#')
            target = os.path.join(dist, path.strip('/'), 'index.html') if path.endswith('/') else os.path.join(dist, path.strip('/') + '.html')
            if not os.path.exists(target): bad.append((p, '页面不存在 ' + link)); continue
            if anchor:
                h = open(target, encoding='utf-8').read()
                ids = set(html.unescape(x) for x in re.findall(r'id="([^"]+)"', h))
                if anchor not in ids: bad.append((p, '锚点不存在 ' + link))
print('pages', pages, 'internal links', n, 'problems', len(bad))
for p, why in bad: print(' ', os.path.relpath(p, root), '->', why)
sys.exit(1 if bad else 0)
