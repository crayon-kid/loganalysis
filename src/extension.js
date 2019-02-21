// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const {
	Disposable,
	languages,
	workspace
} = require('vscode')
const vscode = require('vscode')
const SearchyProvider = require('./Searchprovider')
const Activeprovider = require('./Activeprovider')
const Input = require('./input')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
	// console.log("active....");
	let searchprovider = new SearchyProvider()
	let activeprovider = new Activeprovider()
	//文件类型操控 ok
	const providerRegistrations = Disposable.from(
		//多文件搜索
		workspace.registerTextDocumentContentProvider(SearchyProvider.scheme, searchprovider),	//文本显示
		languages.registerDocumentLinkProvider({	//链接跳转
		  scheme: SearchyProvider.scheme
		}, searchprovider),
		//单文件搜索
		workspace.registerTextDocumentContentProvider(Activeprovider.scheme, activeprovider),	//文本显示
		languages.registerDocumentLinkProvider({	//链接跳转
		  scheme: Activeprovider.scheme
		}, activeprovider)
	)

	//全局搜索 ok
	const commandpathsearch = vscode.commands.registerCommand('extension.LogPathAnalysis', function () {
		//TODO 可以增加默认值，但是没找到如何直接获取当前文本的选中内容
		if (!vscode.window.activeTextEditor) {
			return; // no editor
		}
		let { document,selection } = vscode.window.activeTextEditor;
		let word = document.getText(document.getWordRangeAtPosition(selection.active));
		let options = new Input.InputOption(word)
				
		//加载
		let inputbox = vscode.window.showInputBox(options);
		inputbox.then(Input.SearchInPath,Input.RejectedReason);
	})
	

	//当前文本，多个预设tag搜索
	const commandfilesearch = vscode.commands.registerCommand('extension.LogFileAnalysis', function () {
		//TODO 可以增加默认值，但是没找到如何直接获取当前文本的选中内容
		if (!vscode.window.activeTextEditor) {
			return; // no editor
		}

		Input.SearchInFile()
	})

	//预设tag配置显示
	const commandshowtagsconfig = vscode.commands.registerCommand('extension.LogConfigFile', function () {
		//TODO 可以增加默认值，但是没找到如何直接获取当前文本的选中内容
		Input.showConfigtags()
	})

	vscode.workspace.onDidChangeConfiguration

	//监听的事件
	context.subscriptions.push(
		providerRegistrations,
		commandfilesearch,
		commandpathsearch,
		commandshowtagsconfig
	)
}

// this method is called when your extension is deactivated
function deactivate() {
	// console.log("deactivate....");
}

module.exports = {
	activate,
	deactivate
}
