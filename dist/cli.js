"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 命令行执行入口
const fs_1 = require("fs");
const index_1 = require("./index");
var code = fs_1.readFileSync('./test/t_q.js').toString('utf8');
var tpl = index_1.transform(code);
console.log(tpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLFVBQVU7QUFDViwyQkFBaUM7QUFDakMsbUNBQW9DO0FBQ3BDLElBQUksSUFBSSxHQUFHLGlCQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFELElBQUksR0FBRyxHQUFHLGlCQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQSJ9