"""章节写法检查。参数在 tools/style-rules.json。

用法：python3 tools/check-conventions.py
退出码非 0 表示存在违反写作规范的页面。
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DOCS = os.path.join(ROOT, 'docs')
R = json.load(open(os.path.join(ROOT, 'tools', 'style-rules.json'), encoding='utf-8'))
C = R['conventions']
DEF = [(k, re.compile(p)) for k, v in R['defensive'].items() if isinstance(v, list) for p in v]
FENCE = '```'


def page_type(rel):
    d = rel.split('/')[0] if '/' in rel else ''
    return '方法章' if d in C['方法章目录'] else '角色页' if d in C['角色页目录'] else '参考页'


def analyse(rel):
    t = open(os.path.join(DOCS, rel), encoding='utf-8').read()
    t = re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S)
    t = re.sub(FENCE + r'.*?' + FENCE, '', t, flags=re.S)
    t = re.sub(r'<[A-Z][A-Za-z]*[\s\S]*?/>', '', t)
    t = re.sub(r'<figure[\s\S]*?</figure>', '', t)
    lines = t.split('\n')
    prose = '\n'.join(l for l in lines if not l.lstrip().startswith(('>', '|', '<', ':::')))
    h1 = re.search(r'^# .+$', prose, flags=re.M)
    opener = (prose[h1.end():] if h1 else prose).split('\n## ')[0]
    first = lambda s: '我' in s.replace('我们', '')
    sents = [s for s in re.split(r'[。！？\n]', prose) if s.strip()]
    h2 = re.findall(r'^## (.+)$', t, flags=re.M)
    reading = t.split('\n## 延伸阅读', 1)[1].split('\n## ')[0] if '\n## 延伸阅读' in t else ''
    r_items = len(re.findall(r'^- ', reading, flags=re.M)) + max(0, len(re.findall(r'^\|', reading, flags=re.M)) - 2)
    defs = [(k, m.group(0)) for k, rx in DEF for m in rx.finditer(prose)]
    return dict(
        type=page_type(rel),
        opener_i=first(opener),
        i=sum(1 for s in sents if first(s)),
        h2=len(h2),
        banned=[x for x in h2 if x.strip() in C['不设的小节']],
        reading=r_items,
        reading_table=bool(re.search(r'^\|', reading, flags=re.M)),
        defs=defs,
    )


rows, fails = [], []
for d, _, fs in os.walk(DOCS):
    if '.vitepress' in d or 'node_modules' in d:
        continue
    for f in sorted(fs):
        if not f.endswith('.md'):
            continue
        rel = os.path.relpath(os.path.join(d, f), DOCS)
        a = analyse(rel)
        a['rel'] = rel
        v = []
        if a['opener_i']:
            v.append('开头用了第一人称')
        if a['defs']:
            v.append('防御性的话：' + '、'.join(sorted({x[1] for x in a['defs']})))
        if a['type'] == '方法章':
            if a['h2'] > C['二级标题上限']:
                v.append('二级标题 %d 个，上限 %d' % (a['h2'], C['二级标题上限']))
            if a['banned']:
                v.append('不设的小节：' + '、'.join(a['banned']))
            if a['reading_table']:
                v.append('延伸阅读用了表格')
            if a['reading'] > C['延伸阅读上限']:
                v.append('延伸阅读 %d 条，上限 %d' % (a['reading'], C['延伸阅读上限']))
        if v:
            fails.append((rel, v))
        rows.append(a)

order = {'方法章': 0, '角色页': 1, '参考页': 2}
rows.sort(key=lambda a: (order[a['type']], a['rel']))
print('页面 | 类型 | 开头有我 | 带我的句子 | 二级标题 | 防御性的话 | 延伸阅读')
for a in rows:
    print(' | '.join([
        a['rel'],
        a['type'],
        '是' if a['opener_i'] else '否',
        str(a['i']),
        str(a['h2']),
        str(len(a['defs'])),
        str(a['reading']),
    ]))

print('\n共检查 %d 页' % len(rows))
for t in order:
    g = [a for a in rows if a['type'] == t]
    print('  %s：%d 页，开头有第一人称 %d' % (t, len(g), sum(a['opener_i'] for a in g)))

if fails:
    print('\n发现违反项：')
    for rel, v in fails:
        for x in v:
            print('  %s  %s' % (rel, x))
sys.exit(1 if fails else 0)
