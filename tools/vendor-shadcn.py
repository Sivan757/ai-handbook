"""把 shadcn-vue 的组件源码复制到 docs/.vitepress/theme/ui/。

界面层的 Button、Badge、Tabs 是 shadcn-vue 官方仓库里的副本，
按 MIT 协议直接用。需要升级或加组件时改下面的 COMPONENTS，再跑一次：

    python3 tools/vendor-shadcn.py

脚本只改 ui/ 下的文件，不会碰 theme 里别的代码。组件里的 `cn` 引用会被改成
本地的 ../../lib/utils。
"""
import json
import os
import urllib.request

REGISTRY = "https://shadcn-vue.com/r/styles/new-york-v4/{name}.json"
COMPONENTS = ["button", "badge", "tabs"]

THEME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", ".vitepress", "theme")


def main():
    for name in COMPONENTS:
        with urllib.request.urlopen(REGISTRY.format(name=name), timeout=30) as resp:
            data = json.load(resp)
        outdir = os.path.join(THEME, "ui", name)
        os.makedirs(outdir, exist_ok=True)
        for item in data["files"]:
            target = os.path.join(outdir, os.path.basename(item["path"]))
            content = item["content"].replace('from "cn"', 'from "../../lib/utils"')
            with open(target, "w", encoding="utf-8") as fh:
                fh.write(content)
            print("wrote", os.path.relpath(target, THEME))


if __name__ == "__main__":
    main()
