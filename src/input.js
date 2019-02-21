const vscode = require("vscode")
const SearchyProvider = require('./Searchprovider')
const Activerprovider = require('./Activeprovider')

class InputOption {
    constructor(val) {
        this.value = val
        this.placeHolder = "put log key word you want to search"
        this.prompt = "LogAnalysis"
        this.ignoreFocusOut = true
    }

}

//确定时inputbox的回调  logspy:I0111.logspy?cmd%3DI0111
//工作区搜索 ok
function  SearchInPath (value){
   
    if (value && value.length) {
        //简单处理一下符号
        let formate = value.replace(/\*|\[|\]|\+/g,"\\$&")
        let cmd = " : " + formate 
        let uri = vscode.Uri.parse( SearchyProvider.scheme +
            `:${pathfileName(cmd)}.`+ SearchyProvider.scheme + `?cmd=${cmd}`)
        return vscode.workspace.openTextDocument(uri).then(doc =>
          vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: 1
          }).then( () => {
            vscode.commands.executeCommand('editor.foldLevel' + 1)
          },any => console.log(any))
          ,any => console.log(any)
        )
    }
}

//单文件搜索
function SearchInFile(){
    let { document } = vscode.window.activeTextEditor;
    let file = fileName(document.fileName)
    let uri = vscode.Uri.parse( Activerprovider.scheme +
        `:${file}.`+ Activerprovider.scheme)
    //会先查询是否已经打开过这个文本
    vscode.workspace.openTextDocument(uri).then(doc => {
      vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: 1
      }).then( () => {
        vscode.commands.executeCommand('editor.foldLevel' + 1)
      },any => console.log(any))
      
    },any => console.log(any))
}

//配置文件打开
function showConfigtags(){
    let config = ""
    config = config.concat(__dirname,"\\tags.json")

    vscode.workspace.openTextDocument(config).then(doc => (
        vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: 1
        })
    ),any => console.log(any))
}

function RejectedReason (reason){
    console.log(reason)
}

module.exports = {
    InputOption,
    SearchInPath,
    SearchInFile,
    showConfigtags,
    RejectedReason
}

function pathfileName(cmd) {
    return cmd.replace(/[^a-z0-9]/gi, '_').substring(0, 10)
}

function fileName(cmd) {
    return cmd.replace(/[^a-z0-9]/gi, '_').substring(cmd.length-23,cmd.length-4)
}