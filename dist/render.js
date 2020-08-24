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
                                        throw new Error("未支持的节点入口");
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
                console.log('########', args);
                debugger;
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
                else if (args[1] && args[1].type == typescript_estree_1.AST_NODE_TYPES.CallExpression) {
                    var callee = args[1].callee;
                    var cArgs = args[1].arguments;
                    if (callee.type == typescript_estree_1.AST_NODE_TYPES.MemberExpression) {
                        var objectName = this.exp.expToString(callee.object, ctx.push({}));
                        var propertyName = this.exp.expToString(callee.property, ctx.push({}));
                        //  function bindObjectProps (data: any, tag: string, value: any,  asProp: boolean, isSync?: boolean)
                        //  arg[0] 属性对象  arg[2] v-bind对象
                        if (objectName == this.$thisName && propertyName == "_b" && cArgs.length >= 3) {
                            if (cArgs[0].type == typescript_estree_1.AST_NODE_TYPES.ObjectExpression) {
                                retElement.attrsList = this.parseAttrList(cArgs[0], ctx.push({ type: 'attr' }));
                            }
                            if (cArgs[2].type == typescript_estree_1.AST_NODE_TYPES.MemberExpression) {
                                var bindName = this.exp.expToString(cArgs[2], ctx.push({ type: 'vbind' }));
                                console.log(bindName);
                                retElement.attrsList.push({ name: 'v-bind', value: `"${bindName}"` });
                            }
                        }
                        else {
                            throw new Error("未支持的特性");
                        }
                    }
                    else {
                        throw new Error("未支持的特性");
                    }
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
                            case '_e':
                                retElement = nonNode();
                                break;
                            case '_t': // 处理普通 slot
                                var args = exp.arguments;
                                retElement = {
                                    tag: 'slot',
                                    type: 1,
                                    attrsList: [],
                                    attrsMap: {},
                                    children: [],
                                    parent: undefined
                                };
                                if (args[0].type == typescript_estree_1.AST_NODE_TYPES.Literal && typeof args[0].value == "string") {
                                    retElement.attrsMap['name'] = args[0].value;
                                }
                                else {
                                    throw new types_1.TransformError("获取tag名失败", exp.loc);
                                }
                                if (args[1] && args[1].type != typescript_estree_1.AST_NODE_TYPES.Literal) {
                                    retElement.children = [this.parseElement(args[1], ctx.push({ type: 'element' }))];
                                }
                                break;
                            case '_b': // _s 都在_v内部
                                throw new Error("_b不应出现在这里");
                            default:
                                console.log(callee.property.name);
                                throw new types_1.TransformError('未支持类型', exp.loc);
                        }
                    }
                    else {
                        throw new types_1.TransformError('未支持类型', exp.loc);
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
            this.checkIf(node, ctx);
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
            try {
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
            catch (e) {
                // 有可能为不能解析成 json 的数组，例如
                // class: ["el-date-editor--" + t.type, t.pickerSize ? "el-range-editor--" + t.pickerSize : ""]
                return `"${expStr.replace(/"/g, "'")}"`;
            }
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
        if (name == "domProps") {
            var obj = JSON.parse(value);
            var retD = Object.keys(obj).filter(key => {
                return ["innerHTML", "textContent", "value"].indexOf(key) != -1;
            }).map(key => {
                var name = key;
                var value = obj[key];
                var _value = this.dynamicExpStrToAttrValue(value);
                _value = filter_s(_value);
                if (name == "innerHTML")
                    name = "v-html";
                if (name == "textContent")
                    name = "v-text";
                if (name == "value") {
                    name = ":value";
                    _value = `"${_value}"`;
                }
                return { name: name, value: _value };
            });
            return retD;
        }
        if (name == 'attrs') { // 静态属性合集
            var obj = JSON.parse(value);
            var retA = Object.keys(obj).map(key => {
                var _key = key;
                var value = obj[key];
                if (key.startsWith('"'))
                    _key = key.slice(1, -1); // key 不需要双引号
                if (typeof value == 'string' && !value.startsWith('"')) {
                    _key = `:${_key}`;
                    value = this.dynamicExpStrToAttrValue(value);
                }
                return { name: `${_key}`, value: value };
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
function filter_s(text) {
    var ret = text;
    var re = /_s\((.*?)\)/g;
    if (re.test(text)) { // 处理 t._s ，t._s只会在 t._v内部
        ret = `{{${text.replace(re, (_a, b) => {
            // console.log(a,b,c)
            return b;
        })}}}`;
    }
    else {
        if (text.startsWith('"') && text.endsWith('"')) {
            ret = text.slice(1, -1);
        }
    }
    return ret;
}
// 假设 _v 只有一个参数，并且只接受文本参数
function textNode(text) {
    // console.log('textNode:',text);
    var _text = filter_s(text);
    var element = {
        tag: '$$text',
        type: 1,
        attrsList: [],
        attrsMap: { text: _text },
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