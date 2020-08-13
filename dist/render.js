"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Render = void 0;
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
const immutable_1 = require("immutable");
const types_1 = require("./types");
const exp_1 = require("./exp");
const js_beautify_1 = require("js-beautify");
const selfClose = ['base', 'br', 'hr', 'img', 'input', 'col', 'frame', 'link', 'area', 'param', 'object', 'keygen', 'source'];
class Render {
    constructor(code, staticTpls) {
        this.options = {
            errorOnUnknownASTType: true,
            loc: true,
            range: true,
        };
        this.code = "";
        this.$createElementFuncName = "";
        this.$thisName = "";
        this.code = code;
        this.staticTpls = staticTpls;
        this.ast = typescript_estree_1.parse(code, this.options);
        this.root = {
            tag: 'template',
            type: 1,
            attrsList: [],
            attrsMap: {},
            children: [],
            parent: undefined
        };
    }
    render() {
        var portal = this.startProgram(this.ast);
        this.exp = new exp_1.Exp(this.$thisName);
        // console.log(this.ast);
        var ele = this.parseElement(portal, immutable_1.List([]));
        this.root.children.push(ele);
        console.log(this.root);
        debugger;
        this.root = optimizeNode1(this.root);
        this.root = optimizeNode2(this.root);
        var tpl = this.nodeToTemplate(this.root);
        var fmtTpl = js_beautify_1.html(tpl, { preserve_newlines: false });
        return fmtTpl;
    }
    startProgram(ast) {
        var _b;
        if (ast.type == typescript_estree_1.AST_NODE_TYPES.Program && ast.body.length == 1) {
            var statement = ast.body[0];
            if (statement.type == typescript_estree_1.AST_NODE_TYPES.VariableDeclaration) {
                var declarations = statement.declarations;
                if (declarations.length > 0) {
                    var declaration = declarations[0];
                    if (declaration.type == typescript_estree_1.AST_NODE_TYPES.VariableDeclarator) {
                        var initExp = declaration.init;
                        if ((initExp === null || initExp === void 0 ? void 0 : initExp.type) == typescript_estree_1.AST_NODE_TYPES.FunctionExpression) {
                            var body = initExp.body.body;
                            if (body.length == 2) {
                                var vd = body[0];
                                if (vd.type == typescript_estree_1.AST_NODE_TYPES.VariableDeclaration) {
                                    var declarationsInFunc = vd.declarations;
                                    if (declarationsInFunc.length == 3) {
                                        console.log(declarationsInFunc);
                                        debugger;
                                        var thisDecl = declarationsInFunc[0];
                                        if (thisDecl.type == typescript_estree_1.AST_NODE_TYPES.VariableDeclarator) {
                                            var id = thisDecl.id;
                                            if (((_b = thisDecl.init) === null || _b === void 0 ? void 0 : _b.type) == typescript_estree_1.AST_NODE_TYPES.ThisExpression
                                                && id.type == typescript_estree_1.AST_NODE_TYPES.Identifier) {
                                                console.log('this --> ', id.name);
                                                this.$thisName = id.name;
                                            }
                                        }
                                        var idDecl = declarationsInFunc[2];
                                        if (idDecl.type == typescript_estree_1.AST_NODE_TYPES.VariableDeclarator) {
                                            var id = idDecl.id;
                                            if (id.type == typescript_estree_1.AST_NODE_TYPES.Identifier) {
                                                console.log('createElement --> ', id.name);
                                                this.$createElementFuncName = id.name;
                                            }
                                        }
                                    }
                                }
                                var rt = body[1];
                                if (rt.type == typescript_estree_1.AST_NODE_TYPES.ReturnStatement) {
                                    var arg = rt.argument;
                                    if ((arg === null || arg === void 0 ? void 0 : arg.type) == typescript_estree_1.AST_NODE_TYPES.CallExpression || (arg === null || arg === void 0 ? void 0 : arg.type) == typescript_estree_1.AST_NODE_TYPES.ConditionalExpression) {
                                        // var ele = this.parseElement(arg,List([]))
                                        // root.children.push(ele)
                                        return arg;
                                    }
                                    else {
                                        throw new Error("未知的节点入口");
                                    }
                                }
                            }
                        }
                    }
                }
            }
            throw new types_1.TransformError('数据错误', ast.loc);
        }
        else {
            throw new types_1.TransformError('数据错误', ast.loc);
        }
    }
    parseElement(exp, ctx) {
        var retElement;
        if (exp.type == typescript_estree_1.AST_NODE_TYPES.CallExpression) {
            // 这里应该返回一个ASTElement
            var callee = exp.callee;
            if (callee.type == typescript_estree_1.AST_NODE_TYPES.Identifier && callee.name == this.$createElementFuncName) {
                // 从参数中拿到 tag,属性，子节点
                var args = exp.arguments;
                retElement = {
                    tag: '',
                    type: 1,
                    attrsList: [],
                    attrsMap: {},
                    children: [],
                    parent: undefined
                };
                if (args[0].type == typescript_estree_1.AST_NODE_TYPES.Literal && typeof args[0].value == "string") {
                    retElement.tag = args[0].value;
                }
                else {
                    throw new types_1.TransformError("获取tag名失败", exp.loc);
                }
                if (args[1] && args[1].type == typescript_estree_1.AST_NODE_TYPES.ObjectExpression) {
                    retElement.attrsList = this.parseAttrList(args[1], ctx.push({ type: 'attr' }));
                }
                else if (args[1] && args[1].type != typescript_estree_1.AST_NODE_TYPES.Literal) {
                    retElement.children = [this.parseElement(args[1], ctx.push({ type: 'element' }))];
                }
                if (args[2] && args[2].type != typescript_estree_1.AST_NODE_TYPES.Literal) { // 过滤掉最后的数字参数
                    retElement.children = [this.parseElement(args[2], ctx.push({ type: 'element' }))];
                }
            }
            else if (callee.type == typescript_estree_1.AST_NODE_TYPES.MemberExpression) {
                if (callee.object.type == typescript_estree_1.AST_NODE_TYPES.Identifier && callee.object.name == this.$thisName) {
                    // t._v t._l t._m t._s t._e
                    if (callee.property.type == typescript_estree_1.AST_NODE_TYPES.Identifier) {
                        switch (callee.property.name) {
                            case '_v':
                                var s = this.exp.expToString(exp.arguments[0], immutable_1.List([{ type: 't._v' }]));
                                // 这里把 t._v 替换掉
                                retElement = textNode(s);
                                break;
                            case '_l':
                                if (exp.arguments.length == 2) {
                                    var newCtx = ctx.push({ type: 'inObject' }); // 干掉没用的t
                                    var expStr = this.exp.expToString(exp.arguments[0], newCtx);
                                    var func = exp.arguments[1];
                                    if (func.type == typescript_estree_1.AST_NODE_TYPES.FunctionExpression) {
                                        var elementExp = getElementExpFromFuncExp(func);
                                        var funcParamStrs = func.params.map(param => {
                                            return this.exp.parameterToString(param, ctx);
                                        });
                                        var newCtx2 = ctx.push({ type: 'params', value: funcParamStrs.join(',') });
                                        var ele = this.parseElement(elementExp, newCtx2);
                                        console.log(expStr, func, funcParamStrs, ele);
                                        // debugger
                                        retElement = vForElement(expStr, funcParamStrs, ele);
                                    }
                                    else {
                                        throw new Error("解析vfor错误");
                                    }
                                }
                                else {
                                    throw new Error(`vfor error:参数不对,${exp.arguments.length}`);
                                }
                                break;
                            case '_m':
                                console.log(exp);
                                // debugger
                                if (exp.arguments.length == 1) {
                                    retElement = staticNode(exp.arguments[0]);
                                }
                                else {
                                    throw new Error(`static node error:参数不对,${exp.arguments.length}`);
                                }
                                break;
                            case '_e': // _s 都在_v内部
                                retElement = nonNode();
                                break;
                            default:
                                // todo: _s
                                throw new types_1.TransformError('未知类型', exp.loc);
                        }
                    }
                    else {
                        throw new types_1.TransformError('未知类型', exp.loc);
                    }
                }
                else {
                    console.log(exp);
                    // debugger
                    throw new types_1.TransformError('解析特殊节点错误', exp.loc);
                }
            }
            else {
                console.log(exp);
                // debugger
                throw new types_1.TransformError('解析节点错误', exp.loc);
            }
        }
        else if (exp.type == typescript_estree_1.AST_NODE_TYPES.ConditionalExpression) {
            var test = this.exp.expToString(exp.test, immutable_1.List([]));
            // 连续的 ifelse 才需要ctx标记
            var nextCtx1 = ctx.push({ type: 'test', role: 'cons', exp: test });
            var nextCtx2 = ctx.push({ type: 'test', role: 'alter', exp: test });
            var consElement = this.parseElement(exp.consequent, nextCtx1);
            var alterElement = this.parseElement(exp.alternate, nextCtx2);
            // 返回一个 wrap 节点
            var wrapNode = conditionElement(consElement, alterElement);
            this.checkIf(wrapNode, ctx);
            return wrapNode;
        }
        else if (exp.type == typescript_estree_1.AST_NODE_TYPES.ArrayExpression) {
            var eles = exp.elements.map(element => {
                var ele = this.parseElement(element, ctx.push({ type: 'array' }));
                return ele;
            });
            var node = arrayElement(eles);
            return node;
        }
        else {
            console.log(exp);
            debugger;
            throw new types_1.TransformError('解析节点错误', exp.loc);
        }
        this.checkIf(retElement, ctx);
        return retElement;
    }
    /**
     * $$text
     * $$static__${index}
     * $$null
     * $$vforwrap
     * $$condition_wrap
     * $$array_wrap
     */
    nodeToTemplate(_root) {
        var tag = _root.tag;
        var attrStr = _root.attrsList.map(attr => {
            if (attr.name == 'v-else') {
                return 'v-else';
            }
            else {
                return `${attr.name}=${attr.value}`;
            }
        }).join(' ');
        var childrenStr = `\n${_root.children.map(child => {
            if (child.type == 1) {
                return this.nodeToTemplate(child);
            }
            else {
                throw new Error('nodeToTemplate：类型错误');
            }
        }).join('\n')}\n`;
        switch (tag) {
            case '$$text':
                return `${_root.attrsMap.text}`;
            case '$$null':
                return `<template ${attrStr}></template>`;
            case '$$array_wrap':
                return `<template ${attrStr}>${childrenStr}</template>`;
            case '$$condition_wrap':
                return `<template ${attrStr}>${childrenStr}</template>`;
            case '$$vforwrap':
                return `<template v-for="(${_root.attrsMap.vforParamsStr}) in ${_root.attrsMap.vforListStr}">${childrenStr}</template>`;
            default:
                if (tag.startsWith('$$static__')) { // t._m()
                    var index = Number(tag.replace('$$static__', ''));
                    if (this.staticTpls[index]) {
                        return this.staticTpls[index];
                    }
                    else {
                        throw new Error("静态模板不存在");
                    }
                }
                else {
                    if (selfClose.indexOf(tag) != -1) { // 自闭合标签肯定没有子节点
                        return `<${tag} ${attrStr}/>`;
                    }
                    else {
                        return `<${tag} ${attrStr}>${childrenStr}</${tag}>`;
                    }
                }
        }
    }
    dynamicExpStrToAttrValue(expStr) {
        console.log('dynamicExpStrToAttrValue:', expStr);
        if (expStr.startsWith('{')) {
            var obj = JSON.parse(expStr);
            var code = this.exp.objectToCode(obj);
            return `"${code.replace(/"/g, "'")}"`;
        }
        if (expStr.startsWith('[')) {
            var arr = JSON.parse(expStr);
            var code = `[${arr.map((item) => {
                if (typeof item == 'object') {
                    return this.exp.objectToCode(item);
                }
                else {
                    return item;
                }
            }).join(',')}]`;
            return `"${code.replace(/"/g, "'")}"`;
        }
        return `"${expStr.replace(/"/g, "'")}"`;
    }
    // 这里要处理是否为动态属性
    // 一个property可能解析出多对属性
    parseProperty(_prop, ctx) {
        var keyNode = _prop.key; // 表达式 -> 字符串
        var valueNode = _prop.value; // 复杂 -> 字符串
        var name = this.exp.expToString(keyNode, immutable_1.List([{ type: 'Property_key' }]));
        var nextCtx1 = ctx.push({ type: 'Property_value' });
        var value = this.exp.valueToString(valueNode, nextCtx1);
        console.log('.................', name, valueNode.type, value);
        // 在这里要把动态属性、静态属性、监听、slot、ref 等除了 vif vfor 的所有属性准备好
        if (name == 'on') { // 监听器
            var obj = JSON.parse(value);
            var ret = Object.keys(obj).map(key => {
                var s = key;
                if (key.startsWith('"') && key.endsWith('"'))
                    s = key.slice(1, -1);
                return { name: `@${s}`, value: this.dynamicExpStrToAttrValue(obj[key]) };
            });
            return ret;
        }
        if (name == 'model') {
            var obj = JSON.parse(value);
            return { name: `v-model`, value: this.dynamicExpStrToAttrValue(obj.value) };
        }
        if (name == 'directives') {
            var arr = JSON.parse(value);
            var retD = arr.map((obj) => {
                var name = obj.rawName;
                if (name.startsWith('"'))
                    name = name.slice(1, -1);
                var value = this.dynamicExpStrToAttrValue(obj.value);
                return { name: name, value: value };
            });
            return retD;
        }
        if (name == 'attrs') { // 静态属性合集
            var obj = JSON.parse(value);
            var retA = Object.keys(obj).map(key => {
                var value = obj[key];
                if (typeof value == 'string' && !value.startsWith('"')) {
                    key = `:${key}`;
                    value = this.dynamicExpStrToAttrValue(value);
                }
                else {
                    if (key.startsWith('"'))
                        key = key.slice(1, -1); // key 不需要双引号
                }
                return { name: `${key}`, value: value };
            });
            return retA;
        }
        if (name == 'staticClass') { // 普通class
            name = 'class';
        }
        else if (name == "staticStyle") {
            name = "style";
            value = dynamicExpStrToStyle(value);
        }
        else if (valueNode.type != typescript_estree_1.AST_NODE_TYPES.Literal) {
            name = `:${name}`;
            value = this.dynamicExpStrToAttrValue(value);
        }
        return [{ name: name, value: value }];
    }
    parseAttrList(objExp, ctx) {
        var newCtx = ctx.push({ type: 'inObject' });
        var attrList = [];
        objExp.properties.forEach(property => {
            if (property.type == typescript_estree_1.AST_NODE_TYPES.Property) {
                var kva = this.parseProperty(property, newCtx);
                attrList = attrList.concat(kva);
            }
            else {
                // MethodDefinition | Property | SpreadElement | TSAbstractMethodDefinition
                throw new types_1.TransformError('解析属性错误，未处理类型', property.loc);
            }
        });
        return attrList;
    }
    checkIf(node, ctx) {
        var l = ctx.size;
        if (l > 0) {
            var last = ctx.get(l - 1);
            console.log('#####checkIf', last);
            if (last && last.type == 'test') {
                var vIfStr = this.dynamicExpStrToAttrValue(last.exp);
                if (last.role == 'cons') {
                    node.attrsList.push({ name: 'v-if', value: vIfStr });
                    node.attrsMap['v-if'] = vIfStr;
                }
                else if (last.role == 'alter') {
                    node.attrsList.push({ name: 'v-else', value: vIfStr });
                    node.attrsMap['v-else'] = vIfStr;
                }
            }
        }
    }
}
exports.Render = Render;
// 假设 _v 只有一个参数，并且只接受文本参数
function textNode(text) {
    // console.log('textNode:',text);
    var re = /_s\((.*?)\)/g;
    if (re.test(text)) { // 处理 t._s ，t._s只会在 t._v内部
        text = `{{${text.replace(re, (_a, b) => {
            // console.log(a,b,c)
            return b;
        })}}}`;
    }
    else {
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
    }
    var element = {
        tag: '$$text',
        type: 1,
        attrsList: [],
        attrsMap: { text: text },
        children: [],
        parent: undefined
    };
    return element;
}
function staticNode(_exp) {
    if (_exp.type == typescript_estree_1.AST_NODE_TYPES.Literal) {
        var index = _exp.raw;
        var tag = `$$static__${index}`;
        var element = {
            tag: tag,
            type: 1,
            attrsList: [],
            attrsMap: {},
            children: [],
            parent: undefined
        };
        return element;
    }
    else {
        throw new Error("解析 static node 错误");
    }
}
function nonNode() {
    var element = {
        tag: '$$null',
        type: 1,
        attrsList: [],
        attrsMap: {},
        children: [],
        parent: undefined
    };
    return element;
}
// _exp 表达式 _func 内含 return 语句，返回一个节点  _func 的 params 是上下文
function vForElement(expStr, funcParamStrs, ele) {
    var element = {
        tag: '$$vforwrap',
        type: 1,
        attrsList: [],
        attrsMap: {
            vforListStr: expStr,
            vforParamsStr: funcParamStrs.join(',')
        },
        children: [ele],
        parent: undefined
    };
    return element;
}
function conditionElement(_e1, _e2) {
    var element = {
        tag: '$$condition_wrap',
        type: 1,
        attrsList: [],
        attrsMap: {},
        children: [_e1, _e2],
        parent: undefined
    };
    return element;
}
function arrayElement(eles) {
    var element = {
        tag: '$$array_wrap',
        type: 1,
        attrsList: [],
        attrsMap: {},
        children: eles,
        parent: undefined
    };
    return element;
}
/**
 * 优化节点1
 * 删除能删除的空节点
 * @param _root
 */
function optimizeNode1(_root) {
    _root.children = _root.children.filter(child => {
        if (child.type == 1 && child.tag == '$$null' && !child.attrsMap['v-if']) {
            return false;
        }
        else {
            return true;
        }
    }).map(child => {
        if (child.type == 1) {
            optimizeNode1(child);
        }
        return child;
    });
    return _root;
}
/**
 * 优化节点2
 * 将多层级wrap节点合并
 * @param _root
 */
function optimizeNode2(_root) {
    function loop() {
        if (_root.children.length == 1) {
            var child = _root.children[0];
            if (child.type == 1 && ['$$condition_wrap', '$$array_wrap'].indexOf(child.tag) != -1) {
                return child;
            }
        }
    }
    var _child;
    while (_child = loop()) {
        _root.children = _child.children;
    }
    _root.children = _root.children.map(child => {
        if (child.type == 1) {
            return optimizeNode2(child);
        }
        else {
            throw new Error("优化错误");
        }
    });
    return _root;
}
function dynamicExpStrToStyle(expStr) {
    console.log('dynamicExpStrToStyle:', expStr);
    var obj = JSON.parse(expStr);
    var ret = Object.keys(obj).map(key => {
        var _key = key;
        var _value = obj[key];
        if (_key.startsWith('"') && _key.endsWith('"'))
            _key = _key.slice(1, -1);
        if (_value.startsWith('"') && _value.endsWith('"'))
            _value = _value.slice(1, -1);
        return `${_key}:${_value}`;
    }).join(';');
    return `"${ret}"`;
}
function getElementExpFromFuncExp(exp) {
    if (exp.body.type == typescript_estree_1.AST_NODE_TYPES.BlockStatement) {
        var sts = exp.body.body;
        console.log(1);
        if (sts.length == 1) {
            console.log(1);
            var rets = sts[0];
            if (rets.type == typescript_estree_1.AST_NODE_TYPES.ReturnStatement) {
                console.log(1);
                var retsArg = rets.argument;
                if (retsArg) {
                    if (retsArg.type == typescript_estree_1.AST_NODE_TYPES.ArrayExpression
                        || retsArg.type == typescript_estree_1.AST_NODE_TYPES.ConditionalExpression
                        || retsArg.type == typescript_estree_1.AST_NODE_TYPES.CallExpression) {
                        return retsArg;
                    }
                }
            }
        }
    }
    throw new Error('从函数表达式中获取元素节点表达式错误');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0RUFBd0c7QUFDeEcseUNBQWdDO0FBRWhDLG1DQUFzRDtBQUN0RCwrQkFBNkI7QUFDN0IsNkNBQWtDO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLENBQUUsTUFBTSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsS0FBSyxFQUFDLE9BQU8sRUFBQyxLQUFLLEVBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLEVBQUMsT0FBTyxFQUFDLFFBQVEsRUFBQyxRQUFRLEVBQUMsUUFBUSxDQUFDLENBQUE7QUFHbEgsTUFBYSxNQUFNO0lBYWYsWUFBYSxJQUFXLEVBQUMsVUFBbUI7UUFaNUMsWUFBTyxHQUFtQjtZQUN0QixxQkFBcUIsRUFBQyxJQUFJO1lBQzFCLEdBQUcsRUFBQyxJQUFJO1lBQ1IsS0FBSyxFQUFDLElBQUk7U0FDYixDQUFBO1FBQ0QsU0FBSSxHQUFHLEVBQUUsQ0FBQTtRQUlULDJCQUFzQixHQUFHLEVBQUUsQ0FBQTtRQUMzQixjQUFTLEdBQUcsRUFBRSxDQUFBO1FBR1YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLEdBQUcsR0FBRyx5QkFBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksR0FBRztZQUNSLEdBQUcsRUFBQyxVQUFVO1lBQ2QsSUFBSSxFQUFDLENBQUM7WUFDTixTQUFTLEVBQUMsRUFBRTtZQUNaLFFBQVEsRUFBQyxFQUFFO1lBQ1gsUUFBUSxFQUFDLEVBQUU7WUFDWCxNQUFNLEVBQUMsU0FBUztTQUNuQixDQUFBO0lBQ0wsQ0FBQztJQUVELE1BQU07UUFDRixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFD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