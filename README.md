# loganalysis 日志分析

1. 预定一些正则的tag，统计日志中这些tag的数<br />
2. 提供了对应tag中每个出现位置的上下文，同时提供对应的跳转功能<br />
3. 一个多文本的搜索，但是只是针对一个tag（同样提供上述两个功能）<br />

## How to use

单文本的日志分析(`ctrl+l`)<br />
多文本的日志分析(`ctrl+shift+p`+输入`ndlog`+回车输入`搜索的tag（正则）`)<br />

## tags

默认四个tag已开启，可在对应设置界面中取消勾选<br />
可自定义tags在   设置(setting) -> 扩展(extension) -> 日志分析配置 -> Logtag:_Self -> 选中在 setting.json中编辑 <br />
注意：用户设置中修改为全局，工作区设置为当前文件夹或工作区          自动内容例子如下：<br />
```
"logtag._Self":
    {<br />
        "tag":"\\b(robotpet.*?\\d+)\\b",    //内容为正则
        "name":"robotpet"                   //tag的名称
    }
]
```
---
| `logtag._Self` | `Array<Object>` | `多个tag的数组`    <br />     

## suggest

建议当修改设置后重启窗口（会弹出重启窗口，请点击重启），因为内存文本的关闭暂时无法由插件完成 <br />
详情可查看：[https://github.com/Microsoft/vscode/issues/15178 ](https://github.com/Microsoft/vscode/issues/15178 ) <br />
因此可能在修改前对文本进行过分析的分析文件可能残留。当旧文本残留时不会进行新的分析操作，而是从内存中将旧分析文件取出显示 <br />

**Enjoy!**
