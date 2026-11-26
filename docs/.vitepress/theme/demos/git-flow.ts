// Git 分支演示的图形与步骤。
// 图是一次画完的，每一步只调整哪些元素点亮，所以不依赖脚本也能看懂（全亮状态即全图）。
const L = (x1: number, y1: number, x2: number, y2: number, n: string) =>
  '<line class="gll" data-n="' + n + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" />'
const C = (x: number, y: number, n: string, r = 8) =>
  '<circle class="gnn" data-n="' + n + '" cx="' + x + '" cy="' + y + '" r="' + r + '" />'
const T = (x: number, y: number, s: string) =>
  '<text class="glb" x="' + x + '" y="' + y + '">' + s + '</text>'

export const gitFlowSvg =
  '<svg viewBox="0 0 900 390" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Git 分支流程：master、release、dev、feature、hotfix 五条线">' +
  T(8, 74, 'master') +
  T(8, 144, 'release') +
  T(8, 214, 'dev') +
  T(8, 284, 'feature') +
  T(8, 344, 'hotfix') +
  // 两条长期分支
  L(90, 70, 860, 70, 'base') +
  L(90, 210, 810, 210, 'base') +
  C(90, 70, 'base') +
  C(90, 210, 'base') +
  T(72, 48, '线上') +
  T(72, 188, '集成') +
  // 拉特性分支
  L(180, 210, 180, 280, 'feat') +
  L(180, 280, 420, 280, 'feat') +
  L(420, 280, 420, 210, 'feat') +
  // 特性分支上的提交
  C(260, 280, 'featc') +
  C(340, 280, 'featc') +
  // 合回 dev
  C(420, 210, 'featm', 10) +
  // release
  L(500, 210, 500, 140, 'rel') +
  L(500, 140, 580, 140, 'rel') +
  L(580, 140, 580, 70, 'rel') +
  C(540, 140, 'rel') +
  // 合进 master 并打 tag
  C(580, 70, 'relm', 10) +
  '<rect class="gnt" data-n="relm" x="650" y="58" width="24" height="24" transform="rotate(45 662 70)" />' +
  T(640, 46, 'tag') +
  // hotfix
  L(700, 70, 700, 340, 'hf') +
  L(700, 340, 810, 340, 'hf') +
  C(810, 340, 'hfm', 10) +
  L(810, 340, 810, 70, 'hfm') +
  L(810, 340, 810, 210, 'hfm') +
  T(824, 300, '合回两条线') +
  '</svg>'

type Step = { title: string; text: string; hl: string[]; note?: string }

export const gitFlowSteps: Step[] = [
  {
    title: '起点：两条长期分支',
    text: 'master 上跑的是线上，dev 是集成的地方。两条都是保护分支，谁都别直接往上推。',
    hl: ['base'],
    note: '这一步画的是常态。后面所有改动，都是从这两条线上分出去、再合回来。',
  },
  {
    title: '从 dev 拉一条特性分支',
    text: '要做事了，从 dev 切一条特性分支出来。名字写清做什么，一步到位，别用 feat1、test 这种。',
    hl: ['base', 'feat'],
    note: '分支从哪切很重要。从 dev 切，合回 dev；从 dev 切却想直接进 master，中间就漏了集成这一步。',
  },
  {
    title: '在特性分支上提交',
    text: '一次提交只做一件事。提交信息写清楚为什么改，而不是改了哪些文件。',
    hl: ['base', 'feat', 'featc'],
    note: '这一步和 AI 协作最密集。让它改，但每个提交你自己看得懂再往下走。',
  },
  {
    title: '合回 dev',
    text: '特性分支做完，走合并请求回 dev。代码评审就发生在这一步。',
    hl: ['base', 'feat', 'featc', 'featm'],
    note: '合完把特性分支删掉。留着不删，半年后没人敢动。',
  },
  {
    title: '从 dev 拉 release',
    text: 'dev 上攒够了一批改动，拉一条 release 分支出来。这一轮只修缺陷，不加新功能。',
    hl: ['base', 'featm', 'rel'],
    note: 'release 存在的意义是把「还在改的」和「准备发的」分开。',
  },
  {
    title: '合进 master，打 tag 发版',
    text: 'release 上测过了，合进 master，打个版本号。这一下线上才算换了东西。',
    hl: ['base', 'featm', 'rel', 'relm'],
    note: 'tag 不是为了好看。出了事要能一句话说清「现在跑的是哪一个提交」。',
  },
  {
    title: '线上出事，从 master 拉 hotfix',
    text: '发版之后发现严重缺陷，从 master 直接拉 hotfix。它必须从 master 拉，因为 master 才是线上那一份。',
    hl: ['base', 'relm', 'hf'],
    note: '从 dev 拉 hotfix 是常见错误：dev 上有还没发版的改动，一起带上去等于二次事故。',
  },
  {
    title: 'hotfix 合回两条线',
    text: '修完合回 master 发个补丁版本，同时合回 dev。少合一边，下次发版就把这个修复覆盖掉了。',
    hl: ['base', 'relm', 'hf', 'hfm'],
    note: '两条线都要合，这是 hotfix 唯一容易漏的地方。',
  },
];