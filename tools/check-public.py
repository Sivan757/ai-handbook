"""公开前检查：扫描 docs 下的 Markdown 与配置，找出不该公开的内容。

内置规则只包含通用模式（凭据形态、IP、邮箱、手机号、内网域名）。
如需额外排查特定词表，可通过环境变量 HANDBOOK_DENYLIST 指定文本文件路径（一行一词）。

用法：python3 tools/check-public.py        退出码非 0 表示有命中，需要人工处理。
"""
import os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DOCS = os.path.join(ROOT, 'docs')
DENY = os.environ.get('HANDBOOK_DENYLIST', '')

RULES = [
    ('IPv4 地址', re.compile(r'(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])')),
    ('邮箱', re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}')),
    ('手机号', re.compile(r'(?<!\d)1[3-9]\d{9}(?!\d)')),
    ('令牌形态', re.compile(r'\b(?:sk|pk|at|ghp|gho|glpat|xox[baprs])[-_][A-Za-z0-9_-]{12,}')),
    ('Bearer 后跟真实值', re.compile(r'Bearer\s+(?!\$|<|\{)[A-Za-z0-9._-]{16,}')),
    ('JWT', re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}')),
    ('长十六进制串', re.compile(r'\b[0-9a-f]{32,}\b')),
    ('Webhook 地址', re.compile(r'https?://[^\s)]*(?:hook|webhook)[^\s)]*', re.I)),
    ('内网域名后缀', re.compile(r'\b[\w.-]+\.(?:internal|local|lan|corp|intranet)\b')),
    ('本机用户路径', re.compile(r'(?:/Users/|/home/|C:\\Users\\)[A-Za-z0-9._-]+')),
    ('脱敏占位符残留', re.compile(r'\{\{[A-Z_]+_[a-z0-9]{6,}\}\}')),
    ('带端口的主机', re.compile(r'\b[\w-]+(?:\.[\w-]+)+:\d{4,5}\b')),
]
# 文档里用作示例的合法写法
ALLOW = [re.compile(p) for p in (r'example\.(?:com|org)', r'localhost:\d+', r'127\.0\.0\.1', r'/home/coder\b')]

deny = []
if os.path.exists(DENY):
    for line in open(DENY, encoding='utf-8'):
        w = line.strip()
        if not w or w.startswith('#'): continue
        deny.append((w, re.compile(r'(?<![A-Za-z0-9])' + re.escape(w) + r'(?![A-Za-z0-9])', re.I) if re.fullmatch(r'[\x00-\x7f]+', w) else re.compile(re.escape(w))))

hits = []; files = 0
for d, _, fs in os.walk(DOCS):
    if 'node_modules' in d or os.sep + 'dist' in d or os.sep + 'cache' in d: continue
    for f in fs:
        if not f.endswith(('.md', '.mts', '.ts', '.json', '.yml', '.yaml')): continue
        files += 1
        p = os.path.join(d, f)
        for n, line in enumerate(open(p, encoding='utf-8'), 1):
            for name, rx in RULES:
                for m in rx.finditer(line):
                    s = m.group(0)
                    if any(a.search(s) for a in ALLOW): continue
                    if name in ('带端口的主机', 'Webhook 地址') and line.lstrip().startswith(('|', '-', '>')) is False and 'http' not in line: continue
                    hits.append((os.path.relpath(p, ROOT), n, name, s[:60]))
            for w, rx in deny:
                if rx.search(line): hits.append((os.path.relpath(p, ROOT), n, '私有词表', w))
print('files', files, 'private denylist entries', len(deny), 'hits', len(hits))
if not deny: print('提示：没有找到私有词表，只做了通用模式检查。')
for h in hits: print('  %s:%d  [%s]  %s' % h)
sys.exit(1 if hits else 0)
