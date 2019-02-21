const vscode = require('vscode')
const rgPath = require('./vscode-ripgrep/dist').rgPath
const {
  execSync
} = require('child_process')
const rootPath = vscode.workspace.rootPath
var fs = require('fs')
const execOpts = {
  cwd: rootPath,
  maxBuffer: 1024 * 10000    //（1M?）可以适当修改大小，如果搜索内容匹配过多的话可能会让搜索报错
}

//单文件搜索内容
class Activeprovider{
  constructor() {
    this.links = []
    this.loadConfig()
    vscode.workspace.onDidChangeConfiguration(() =>{
      this.loadConfig()
      vscode.window.showInformationMessage("日志分析插件配置更新，建议重启", { title: "Restart vscode" })
        .then(function (item) {
        if (!item)
            return;
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      })
    })
      
    this._subscriptions = vscode.Disposable.from(
      vscode.workspace.onDidCloseTextDocument((doc => {
      if(doc.uri.scheme == Activeprovider.scheme)
      {
        this.links[doc.uri.toString()] = []
      }
      }))
      
      //监听config文件的变化
      // vscode.workspace.onDidSaveTextDocument(
      //   doc => {
      //     if (doc.fileName.toUpperCase() == this.config.toUpperCase())
      //     {
      //       //重新加载tags
      //       let tags_info = fs.readFileSync(this.config)
      //       this.tags = JSON.parse(tags_info.toString());
      //     }
      // })
    )
    
  }

  //关于关闭时间 经大量查证，目前没有api可以直接关闭这种内存式的文本  
    //具体可以参看  https://github.com/Microsoft/vscode/issues/15178 
    //onDidCloseTextDocument的启动时机由系统的内存分配决定。。。
  loadConfig(){
    //json配置
    this.config = vscode.workspace.getConfiguration('logtag');
    // this.config = this.config.concat(__dirname,"\\tags.json")
    // let temp_tags = fs.readFileSync(this.config)
    // this.tags = JSON.parse(temp_tags.toString());
    this.tags = []

    if (this.config.Debug){
      this.tags.push({tag:"\\b(D|d)[0-9]{4}\\b",name:"Debug"})
    }
    if (this.config.Error){
      this.tags.push({tag:"\\b(E|e)[0-9]{4}\\b",name:"Error"})
    }
    if (this.config.Trans){
      this.tags.push({tag:"\\b(T|t)[0-9]{4}\\b",name:"Trans"})
    }
    if (this.config.Info){
      this.tags.push({tag:"\\b(I|i)[0-9]{4}\\b",name:"Info"})
    }
    if(this.config._Self.length > 0){
      this.tags = this.tags.concat(this.config._Self)
    }
  }

  dispose() {
    this._subscriptions.dispose()
  }
 
  static get scheme() {
    return 'filespy'
  }

  provideTextDocumentContent(uri) {
    let uriString = uri.toString()
    this.links[uriString] = []
    let { document } = vscode.window.activeTextEditor;
    let searchPath = document.fileName;

    let allcontent = [`${searchPath} tags：`]
    let lineNumber = 0

    this.tags.forEach( query => {
      let searchResults = null
      if (query == null){
        return  //跳过这个关键词
      }
      try {
        searchResults = runCommandSync(searchPath,query.tag)
      } catch (err) {
        return `${err}`
      }
  
      if (searchResults == null || !searchResults.length) {
        return 'There was an error during your search!'
      }
      let resultsArray = searchResults.toString().split('\n')
      resultsArray = resultsArray.filter((item) => {
        return item != null && item.length > 0
      })
      let resultsByFile = []

      resultsArray.forEach((searchResult) => {
        let formattedLine;
        if (searchResult == '--') {
          resultsByFile.push({seperator: true})
        }else if(searchResult.match(query.tag))
        {
          let splitLine = searchResult.match(/(\d+):(\d+):(.*)/)
          if (splitLine) {
            formattedLine = formatLine(splitLine)
          } 
        } else {
          let contextLine = searchResult.match(/(\d+)-(.*)/)
          if (contextLine) {
            formattedLine = formatContextLine(contextLine)
          }
        }

        if (formattedLine === undefined) {
          return
        }

        resultsByFile.push(formattedLine)
      })
      
      let searchconunt = 0
      lineNumber += 1
      let resultsForFile = resultsByFile.map((searchResult) => {
        lineNumber += 1
        if (searchResult.seperator) {
          return '  ..';
        } else {
          if (this.createDocumentLink(searchResult, lineNumber, searchPath, query.tag, uriString))
          {
            searchconunt += 1
          }
          return `  ${searchResult.line}: ${searchResult.result}`
        }
      }).join('\n')
      let searchcontent = `${resultsForFile}`

      let header = [`${searchconunt} search results found for "${query.name}"`]
      let content = header.concat(searchcontent) 
      content.join('\n')
      allcontent = allcontent.concat(content)
    }) 
    return allcontent.join('\n')
  }
    
  provideDocumentLinks(document) {
    return this.links[document.uri.toString()]
  }
    
  createDocumentLink(formattedLine, lineNumber, filename,query, docURI) {
    const {
      line,
      column
    } = formattedLine
    const col = parseInt(column, 10)
    const preamble = `  ${line}:`.length
    const match = formattedLine.result.match(query)
    if (match == null) {
      return false
    }
    const searchTerm = match[0].length
    const linkRange = new vscode.Range(
      lineNumber,
      preamble + col,
      lineNumber,
      preamble + col + searchTerm
    )

    const uri = vscode.Uri.parse(`file:///${filename}#${line}`)
    this.links[docURI].push(new vscode.DocumentLink(linkRange, uri))

    return true
  }
   
}

module.exports = Activeprovider


function formatLine(splitLine) {
    return {
      line: splitLine[1],
      column: splitLine[2],
      result: splitLine[3]
    }
  }
  
  function formatContextLine(splitLine) {
    return {
      line: splitLine[1],
      column: undefined,
      result: splitLine[2]
    }
  }

  
  function runCommandSync(path,query) {
    //不区别大小写，行号列号，显示上下文两行,正则匹配(默认是启用的)
    // return execSync(`${rgPath} --ignore-case --line-number --column --context=2 -e "${query.query}" --file ${document.fileName}` , execOpts)
    return execSync(`${rgPath} --ignore-case --line-number --column --context=2 -e "${query}" ${path}` , execOpts)
  }