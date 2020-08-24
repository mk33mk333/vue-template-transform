// 命令行执行入口
import { readFileSync } from "fs"
import { transform } from "./index";
var code = readFileSync('./test/static2.js').toString('utf8');
var tpl = transform(code)
console.log(tpl)