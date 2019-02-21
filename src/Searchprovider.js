const vscode = require('vscode')
const querystring = require('querystring')
const rgPath = require('./vscode-ripgrep/dist').rgPath
const path = require('path')
const {
  execSync
} = require('child_process')

const rootPath = vscode.workspace.rootPath

const execOpts = {
  cwd: rootPath,
  maxBuffer: 1024 * 10000     //（10M?）可以适当修改大小，如果搜索内容匹配过多的话可能会让搜索报错
}

//静态多文件的搜索
class SearchyProvider {
  constructor() {
    this.links = []
    this._subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {
      if(doc.uri.scheme == SearchyProvider.scheme)
      {
        this.links[doc.uri.toString()] = []
      }
    })
  }

  dispose() {
    this._subscriptions.dispose()
  }

  static get scheme() {
    return 'logspy'
  }

  provideTextDocumentContent(uri) {
    let uriString = uri.toString()
    this.links[uriString] = []
    const params = querystring.parse(uri.query)
    const cmd = params.cmd

    let searchQuery = parseSearchQuery(cmd);
    let searchResults = null
    try {
      searchResults = runCommandSync(searchQuery)
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
    let resultsByFile = {}
    let lastFormattedLine;

    var addFormattedLine = function(formattedLine) {
      if (! resultsByFile.hasOwnProperty(formattedLine.file)) {
         resultsByFile[formattedLine.file] = [];
      }
      
      resultsByFile[formattedLine.file].push(formattedLine);
    }

    resultsArray.forEach((searchResult) => {
     
      let formattedLine;
      if (searchResult == '--') {
        if (lastFormattedLine) {
          addFormattedLine({
            file: lastFormattedLine.file,
            seperator: true
          });
        }
      } else  if(searchResult.match(searchQuery.query)){
        let splitLine = searchResult.match(/(.*?):(\d+):(\d+):(.*)/);
        if (splitLine)
        {
          formattedLine = formatLine(splitLine)
        }
        
      } else  {
        let contextLine = searchResult.match(/(.*?)-(\d+)-(.*)/);
        if (contextLine) 
        {
          formattedLine = formatContextLine(contextLine)
        }
      }

      if (formattedLine === undefined) {
        return;
      }

      addFormattedLine(formattedLine);

      lastFormattedLine = formattedLine;
      
    });

    var removeTrailingSeperators = function() {
      for (var file in resultsByFile) {
        let lines = resultsByFile[file];
        if (lines[lines.length - 1].seperator) {
          lines.splice(lines.length - 1, 1);
          resultsByFile[file] = lines;
        }
      }
    };

    removeTrailingSeperators();

    let sortedFiles = Object.keys(resultsByFile).sort()
    let lineNumber = 0
    let searchconunt = 0
    let lines = sortedFiles.map((fileName) => {
      lineNumber += 1
      let resultsForFile = resultsByFile[fileName].map((searchResult, index) => {
        lineNumber += 1
        if (searchResult.seperator) {
          return '  ..';
        } else {
          if (this.createDocumentLink(searchResult, lineNumber, searchQuery, uriString))
          {
            searchconunt += 1            
          }
          return `  ${searchResult.line}: ${searchResult.result}`
        }
      }).join('\n')
      // lineNumber += 1
      return `${fileName}:\n${resultsForFile}`
    })

    let header = [`${searchconunt} search results found for "${searchQuery.query}"`]
    let content = header.concat(lines)

    return content.join('\n')
  }

  provideDocumentLinks(document) {
    return this.links[document.uri.toString()]
  }

  createDocumentLink(formattedLine, lineNumber, searchQuery, docURI) {
    const {
      file,
      line,
      column
    } = formattedLine
    const col = parseInt(column, 10)
    const preamble = `  ${line}:`.length
    const match = formattedLine.result.match(searchQuery.query)
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

    const uri = vscode.Uri.parse(`file:///${file}#${line}`)
    this.links[docURI].push(new vscode.DocumentLink(linkRange, uri))

    return true
  }
}

module.exports = SearchyProvider

function formatLine(splitLine) {
  return {
    file: splitLine[1],
    line: splitLine[2],
    column: splitLine[3],
    result: splitLine[4]
  }
}

function formatContextLine(splitLine) {
  return {
    file: splitLine[1],
    line: splitLine[2],
    column: undefined,
    result: splitLine[3]
  }
}

function parseSearchQuery(cmd)
{
  let searchParts = cmd.match(/^([^:]+):\s?(.*)/);
  let searchPath = searchParts[1];
  let searchQuery = searchParts[2];
  searchPath = path.join(vscode.workspace.rootPath, searchPath);

  return {
    path: searchPath,
    query: searchQuery
  };
}

function runCommandSync(query) {
  //大小写敏感，行号列号，允许搜索隐藏文件，显示搜索到的上下文n行，正则匹配(默认是启用的)
  // return execSync(`${rgPath} --case-sensitive --line-number --column --hidden --context=2 -e "${query.query}" ${query.path}`, execOpts)
  //不区别大小写，行号列号，显示上下文两行,正则匹配(默认是启用的)
  return execSync(`${rgPath} --ignore-case --line-number --column --context=2 -e "${query.query}" ${query.path}`, execOpts)
}
