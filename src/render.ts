import {parse, TSESTreeOptions,AST, AST_NODE_TYPES,TSESTree} from "@typescript-eslint/typescript-estree"
import { List } from "immutable"
import { ASTElement,  ASTNode } from "vue-template-compiler"
import { ContextStack,TransformError } from "./types";
import {  Exp } from "./exp";
import { html } from "js-beautify"
const selfClose = [ 'base','br','hr','img','input','col','frame','link','area','param','object','keygen','source']


export class Render {
    options:TSESTreeOptions = {
        errorOnUnknownASTType:true,
        loc:true,
        range:true,
    }
    code = ""
    ast:AST<TSESTreeOptions>
    root:ASTElement
    exp!:Exp
    $createElementFuncName = ""
    $thisName = ""
    staticTpls:string[]
    constructor (code:string,staticTpls:string[]) {
        this.code = code
        this.staticTpls = staticTpls
        this.ast = parse(code, this.options);
        this.root = {  // 变换后的根节点
            tag:'template',
            type:1,
            attrsList:[],
            attrsMap:{},
            children:[],
            parent:undefined
        }
    }

    render () {
        var portal = this.startProgram(this.ast);
        this.exp = new Exp(this.$thisName)
        // console.log(this.ast);
        var ele = this.parseElement(portal,List([]))
        this.root.children.push(ele)
        // console.log(this.root);
        debugger
        this.root = optimizeNode1(this.root)
        this.root = optimizeNode2(this.root)
        var tpl = this.nodeToTemplate(this.root);
        var fmtTpl = html(tpl,{preserve_newlines:false});
        return fmtTpl
    }

    startProgram (ast:AST<TSESTreeOptions>) { // 开始走节点
        if(ast.type == AST_NODE_TYPES.Program && ast.body.length == 1){
            var statement = ast.body[0]
            if(statement.type == AST_NODE_TYPES.VariableDeclaration){
                var declarations = statement.declarations;
                if(declarations.length > 0) {
                    var declaration = declarations[0];
                    if(declaration.type == AST_NODE_TYPES.VariableDeclarator){
                        var initExp = declaration.init;
                        if(initExp?.type == AST_NODE_TYPES.FunctionExpression){
                            var body = initExp.body.body;
                            if(body.length == 2 ){
                                var vd = body[0];
                                if(vd.type == AST_NODE_TYPES.VariableDeclaration){
                                    var declarationsInFunc = vd.declarations;
                                    if(declarationsInFunc.length == 3){
                                        // console.log(declarationsInFunc)
                                        debugger
                                        var thisDecl = declarationsInFunc[0]
                                        if(thisDecl.type == AST_NODE_TYPES.VariableDeclarator){
                                            var id = thisDecl.id
                                            if(thisDecl.init?.type == AST_NODE_TYPES.ThisExpression 
                                                && id.type == AST_NODE_TYPES.Identifier){
                                                    // console.log('this --> ',id.name)
                                                    this.$thisName = id.name
                                                }
                                        }

                                        var idDecl = declarationsInFunc[2]
                                        if(idDecl.type == AST_NODE_TYPES.VariableDeclarator){
                                            var id = idDecl.id;
                                            if(id.type == AST_NODE_TYPES.Identifier){
                                                // console.log('createElement --> ',id.name)
                                                this.$createElementFuncName = id.name;
                                            }
                                        }
                                    }
                                }
                                var rt = body[1];
                                if(rt.type == AST_NODE_TYPES.ReturnStatement){
                                    var arg =  rt.argument;
                                    if(arg?.type == AST_NODE_TYPES.CallExpression || arg?.type == AST_NODE_TYPES.ConditionalExpression){
                                        // var ele = this.parseElement(arg,List([]))
                                        // root.children.push(ele)
                                        return arg
                                    }else {
                                       throw new Error("未支持的节点入口")
                                    }
                                }
                            }
                        }
                    }
                }
        
            }
            throw new TransformError('数据错误',ast.loc)
        }else{
            throw new TransformError('数据错误',ast.loc)
        }
    }

    parseElement(exp:TSESTree.Expression,ctx:ContextStack){
        var retElement:ASTElement;
        if(exp.type == AST_NODE_TYPES.CallExpression ){
            // 这里应该返回一个ASTElement
            var callee = exp.callee;
            if(callee.type == AST_NODE_TYPES.Identifier && callee.name == this.$createElementFuncName){
                // 从参数中拿到 tag,属性，子节点

                var args = exp.arguments;
                // console.log('########',args);
                debugger
                retElement  = {
                    tag:'',
                    type:1,
                    attrsList:[],
                    attrsMap:{},
                    children:[],
                    parent:undefined
                }
                if(args[0].type == AST_NODE_TYPES.Literal && typeof args[0].value == "string"){
                    retElement.tag = args[0].value
                }else{
                    throw new TransformError("获取tag名失败",exp.loc);
                }
                if(args[1] && args[1].type == AST_NODE_TYPES.ObjectExpression){
                    retElement.attrsList = this.parseAttrList(args[1],ctx.push({type:'attr'}))
                }else if(args[1] && args[1].type == AST_NODE_TYPES.CallExpression){
                    var callee = args[1].callee;
                    var cArgs = args[1].arguments;
                    if(callee.type == AST_NODE_TYPES.MemberExpression){
                        var objectName = this.exp.expToString(callee.object,ctx.push({}))
                        var propertyName = this.exp.expToString(callee.property,ctx.push({}))
                         //  function bindObjectProps (data: any, tag: string, value: any,  asProp: boolean, isSync?: boolean)
                         //  arg[0] 属性对象  arg[2] v-bind对象
                        if(objectName == this.$thisName && propertyName == "_b" && cArgs.length >= 3) { 
                            if(cArgs[0].type == AST_NODE_TYPES.ObjectExpression){
                                retElement.attrsList = this.parseAttrList(cArgs[0],ctx.push({type:'attr'}))
                            }
                            if(cArgs[2].type == AST_NODE_TYPES.MemberExpression){
                                var bindName = this.exp.expToString(cArgs[2],ctx.push({type:'vbind'}))
                                // console.log( bindName )
                                retElement.attrsList.push({name:'v-bind',value: `"${bindName}"` })
                            }
                        }else{
                            throw new Error("未支持的特性")
                        }
                    }else{
                        throw new Error("未支持的特性")
                    }

                }else if(args[1] && args[1].type != AST_NODE_TYPES.Literal){ 
                    retElement.children = [this.parseElement(args[1],ctx.push({type:'element'}))];    
                }
                if(args[2] && args[2].type != AST_NODE_TYPES.Literal){ // 过滤掉最后的数字参数
                    retElement.children = [this.parseElement(args[2],ctx.push({type:'element'}))]; 
                } 
            }else if(callee.type == AST_NODE_TYPES.MemberExpression){
                
                if(callee.object.type == AST_NODE_TYPES.Identifier && callee.object.name == this.$thisName){
                    // t._v t._l t._m t._s t._e
                    if(callee.property.type == AST_NODE_TYPES.Identifier){
                        switch(callee.property.name){
                            case '_v':
                                var s = this.exp.expToString(exp.arguments[0],List([{type:'t._v'}]))
                                // 这里把 t._v 替换掉
                                retElement = textNode(s)
                                break;
                            case '_l':
                                if(exp.arguments.length == 2){
                                    var newCtx = ctx.push({type:'inObject'}) // 干掉没用的t
                                    var expStr = this.exp.expToString(exp.arguments[0],newCtx);
                                    var func = exp.arguments[1];
                                    if(func.type == AST_NODE_TYPES.FunctionExpression){
                                        var elementExp = getElementExpFromFuncExp(func);
                                        var funcParamStrs = func.params.map(param=>{
                                            return this.exp.parameterToString(param,ctx);
                                        });
                                        var newCtx2 = ctx.push({type:'params',value:funcParamStrs.join(',')})
                                        var ele = this.parseElement(elementExp,newCtx2)
                                        // console.log(expStr,func,funcParamStrs,ele);
                                        // debugger
                                        retElement = vForElement(expStr,funcParamStrs,ele)
                                    }else{
                                        throw new Error("解析vfor错误")
                                    }
                                    
                                }else{
                                    throw new Error(`vfor error:参数不对,${exp.arguments.length}`)
                                }
                                break;
                            case '_m':
                                // console.log(exp);
                                // debugger
                                if(exp.arguments.length == 1){
                                    retElement =  staticNode(exp.arguments[0])        
                                }else{
                                    throw new Error(`static node error:参数不对,${exp.arguments.length}`)
                                }
                                break;
                            case '_e': 
                                retElement = nonNode()    
                                break;  
                            case '_t': // 处理普通 slot
                                var args = exp.arguments;
                                retElement  = {
                                    tag:'slot',
                                    type:1,
                                    attrsList:[],
                                    attrsMap:{},
                                    children:[],
                                    parent:undefined
                                }
                                if(args[0].type == AST_NODE_TYPES.Literal && typeof args[0].value == "string"){
                                    retElement.attrsMap['name'] = args[0].value
                                }else{
                                    throw new TransformError("获取tag名失败",exp.loc);
                                }
                                if(args[1] && args[1].type != AST_NODE_TYPES.Literal){ 
                                    retElement.children = [this.parseElement(args[1],ctx.push({type:'element'}))];    
                                }  
                                break;    
                            case '_b': // _s 都在_v内部
                                throw new Error("_b不应出现在这里")
                            default:
                                // console.log(callee.property.name)
                                throw new TransformError('未支持类型',exp.loc)
    
                        }
                    }else{
                        throw new TransformError('未支持类型',exp.loc)
                    }
                }else{
                    // console.log(exp);
                    // debugger
                    throw new TransformError('解析特殊节点错误',exp.loc)
                }
            }else{
                // console.log(exp);
                // debugger
                throw new TransformError('解析节点错误',exp.loc)
            }
        }else if(exp.type == AST_NODE_TYPES.ConditionalExpression){
            var test = this.exp.expToString(exp.test,List([]));
            // 连续的 ifelse 才需要ctx标记
            var nextCtx1 = ctx.push({type:'test',role:'cons',exp:test})
            var nextCtx2 = ctx.push({type:'test',role:'alter',exp:test})
    
            var consElement = this.parseElement(exp.consequent,nextCtx1)
            var alterElement = this.parseElement(exp.alternate,nextCtx2)
            // 返回一个 wrap 节点
            var wrapNode = conditionElement(consElement,alterElement)
            this.checkIf(wrapNode,ctx)
            return wrapNode
        }else if(exp.type == AST_NODE_TYPES.ArrayExpression){
            var eles = exp.elements.map(element=>{
                var ele = this.parseElement(element,ctx.push({type:'array'}))
                return ele
            })
            var node = arrayElement(eles);
            this.checkIf(node,ctx)
            return node
    
        }else{
            // console.log(exp);
            debugger
            throw new TransformError('解析节点错误',exp.loc)
        }
        this.checkIf(retElement,ctx)
        return retElement
    }

    /**
     * $$text
     * $$static__${index}
     * $$null
     * $$vforwrap
     * $$condition_wrap
     * $$array_wrap
     */
    nodeToTemplate (_root:ASTElement) {
        var tag = _root.tag;
        var attrStr = _root.attrsList.map(attr=>{
            if(attr.name == 'v-else'){
                return 'v-else'
            }else{
                return `${attr.name}=${attr.value}`
            }
            
        }).join(' ')
        var childrenStr:string =`\n${_root.children.map(child=>{
            if(child.type == 1){
                return this.nodeToTemplate(child)
            }else{
                throw new Error('nodeToTemplate：类型错误')
            }
        }).join('\n')}\n` 
        switch (tag) {
            case '$$text':
                return `${_root.attrsMap.text}`
            case '$$null':
                return `<template ${attrStr}></template>`
            case '$$array_wrap':
                return `<template ${attrStr}>${childrenStr}</template>`
            case '$$condition_wrap':
                return `<template ${attrStr}>${childrenStr}</template>`
            case '$$vforwrap':
                return `<template v-for="(${_root.attrsMap.vforParamsStr}) in ${_root.attrsMap.vforListStr}">${childrenStr}</template>`
            default:
                if(tag.startsWith('$$static__')){ // t._m()
                    var index = Number(tag.replace('$$static__',''));
                    if(this.staticTpls[index]){
                        return this.staticTpls[index]
                    }else{
                        throw new Error("静态模板不存在")
                    }
                }else{
                    if(selfClose.indexOf(tag) != -1){ // 自闭合标签肯定没有子节点
                        return `<${tag} ${attrStr}/>`
                    }else{
                        return `<${tag} ${attrStr}>${childrenStr}</${tag}>`
                    }
                }   
        }
    }

    dynamicExpStrToAttrValue(expStr:string){
        // console.log('dynamicExpStrToAttrValue:',expStr);
        if(expStr.startsWith('{')){
            var obj = JSON.parse(expStr);
            var code = this.exp.objectToCode(obj)
            return `"${code.replace(/"/g,"'")}"`
            
        }
        if(expStr.startsWith('[')){
            try{
                var arr = JSON.parse(expStr);
                var code:string =`[${arr.map((item:any)=>{
                    if(typeof item == 'object'){
                        return this.exp.objectToCode(item)
                    }else{
                        return item
                    }
                }).join(',')}]`
                return `"${code.replace(/"/g,"'")}"`
            }catch(e){ 
                // 有可能为不能解析成 json 的数组，例如
                // class: ["el-date-editor--" + t.type, t.pickerSize ? "el-range-editor--" + t.pickerSize : ""]
                return `"${expStr.replace(/"/g,"'")}"`

            }
            
        }
        return `"${expStr.replace(/"/g,"'")}"`
    }

    // 这里要处理是否为动态属性
    // 一个property可能解析出多对属性
    parseProperty (_prop:TSESTree.Property,ctx:ContextStack) {
        var keyNode = _prop.key; // 表达式 -> 字符串
        var valueNode = _prop.value; // 复杂 -> 字符串
        var name = this.exp.expToString(keyNode,List([{type:'Property_key'}]))
        var nextCtx1 = ctx.push({type:'Property_value'})
        var value = this.exp.valueToString(valueNode,nextCtx1)
        // console.log('.................',name,valueNode.type,value)
        // 在这里要把动态属性、静态属性、监听、slot、ref 等除了 vif vfor 的所有属性准备好
        if(name == 'on'){  // 监听器
            var obj = JSON.parse(value);
            
            var ret = Object.keys(obj).map(key=>{
                var s = key;
                if(key.startsWith('"') && key.endsWith('"'))s = key.slice(1,-1) 
                return {name:`@${s}`,value:this.dynamicExpStrToAttrValue(obj[key])}
            })
            return ret;
        }

        if(name == 'model') {
            var obj = JSON.parse(value);
            return {name:`v-model`,value:this.dynamicExpStrToAttrValue(obj.value)}
        }

        if(name == 'directives'){
            var arr = JSON.parse(value);
            var retD:{name:string,value:any}[] = arr.map((obj:{rawName:string,value:string}) =>{
                var name = obj.rawName;
                if(name.startsWith('"'))name = name.slice(1,-1)
                var value = this.dynamicExpStrToAttrValue(obj.value);
                return {name:name,value:value}
            })
            
            return retD;

        }

        if(name == "domProps"){
            var obj = JSON.parse(value);
            var retD = Object.keys(obj).filter(key=>{
                return ["innerHTML","textContent","value"].indexOf(key) != -1
            }).map(key =>{
                var name = key;
                var value = obj[key];
                var _value = this.dynamicExpStrToAttrValue(value);
                _value = filter_s(_value)
                if(name == "innerHTML")name = "v-html"
                if(name == "textContent")name = "v-text"
                if(name == "value"){
                    name = ":value"
                    _value = `"${_value}"`
                }
               
                return {name:name,value:_value as any}
            })
            
            return retD;

        }

        if(name == 'attrs'){  // 静态属性合集
            var obj = JSON.parse(value);
            var retA = Object.keys(obj).map(key=>{
                var _key = key;
                var value = obj[key];
                if(key.startsWith('"'))_key = key.slice(1,-1)  // key 不需要双引号
                if(typeof value == 'string' && !value.startsWith('"')){
                    _key = `:${_key}`
                    value = this.dynamicExpStrToAttrValue(value)
                }
                return {name:`${_key}`,value:value}
            })
            return retA;
        }



        if(name == 'staticClass'){  // 普通class
            name = 'class'
        }else if(name == "staticStyle"){
            name = "style"
            value = dynamicExpStrToStyle(value)
        }else if(valueNode.type != AST_NODE_TYPES.Literal){
            name = `:${name}`
            value = this.dynamicExpStrToAttrValue(value)
        }


        return [{name:name,value:value}]
    }

    parseAttrList (objExp:TSESTree.ObjectExpression,ctx:ContextStack) {
        var newCtx = ctx.push({type:'inObject'})
        var attrList:{name:string,value:string}[] = [];
         objExp.properties.forEach(property=>{
            if(property.type == AST_NODE_TYPES.Property){
                var kva = this.parseProperty(property,newCtx)
                attrList = attrList.concat(kva);
            }else{
                // MethodDefinition | Property | SpreadElement | TSAbstractMethodDefinition
                throw new TransformError('解析属性错误，未处理类型',property.loc)
            }
            
        })
        return attrList;
    }

    checkIf(node:ASTElement,ctx:ContextStack){
        var l = ctx.size;
        if(l > 0){
            var last = ctx.get(l-1);
            // console.log('#####checkIf',last);
            if(last && last.type == 'test'){
                var vIfStr = this.dynamicExpStrToAttrValue(last.exp)
                if(last.role == 'cons'){
                    node.attrsList.push({name:'v-if', value:vIfStr})
                    node.attrsMap['v-if'] = vIfStr;
                }else if(last.role == 'alter'){
                    node.attrsList.push({name:'v-else',value:vIfStr})
                    node.attrsMap['v-else'] = vIfStr;
                }
            }
        }
    }
}

function filter_s (text:string) {
    var ret = text
    var re = /_s\((.*?)\)/g;
    if(re.test(text)){  // 处理 t._s ，t._s只会在 t._v内部
        ret =`{{${text.replace(re,(_a:string,b:any)=>{
            // console.log(a,b,c)
            return b
        })}}}` 
    }else{
        if(text.startsWith('"') && text.endsWith('"')){
            ret = text.slice(1,-1)
        }
    }
    return ret;
}

// 假设 _v 只有一个参数，并且只接受文本参数
function textNode (text:string) {
    // console.log('textNode:',text);
    var _text = filter_s(text)
    var element:ASTElement  = {
        tag:'$$text',
        type:1,
        attrsList:[],
        attrsMap:{text:_text},
        children:[],
        parent:undefined
    }
    return element
}

function staticNode (_exp:TSESTree.Expression) {
    if(_exp.type == AST_NODE_TYPES.Literal){
        var index = _exp.raw;
        var tag = `$$static__${index}`
        var element:ASTElement  = {
            tag:tag,
            type:1,
            attrsList:[],
            attrsMap:{},
            children:[],
            parent:undefined
        }
        return element
    }else{
        throw new Error("解析 static node 错误")
    }
    
}

function nonNode () {
    var element:ASTElement  = {
        tag:'$$null',
        type:1,
        attrsList:[],
        attrsMap:{},
        children:[],
        parent:undefined
    }
    return element
}
// _exp 表达式 _func 内含 return 语句，返回一个节点  _func 的 params 是上下文
function vForElement (expStr:string,funcParamStrs:string[],ele:ASTElement) {
    var element:ASTElement  = {
        tag:'$$vforwrap',
        type:1,
        attrsList:[],
        attrsMap:{
            vforListStr:expStr,
            vforParamsStr:funcParamStrs.join(',')
        },
        children:[ele],
        parent:undefined
    }
    return element
}

function conditionElement(_e1:ASTNode,_e2:ASTNode){
    var element:ASTElement  = {
        tag:'$$condition_wrap',
        type:1,
        attrsList:[],
        attrsMap:{},
        children:[_e1,_e2],
        parent:undefined
    }
    return element
}

function arrayElement(eles:ASTElement[]){
    var element:ASTElement  = {
        tag:'$$array_wrap',
        type:1,
        attrsList:[],
        attrsMap:{},
        children:eles,
        parent:undefined
    }
    return element
}

/**
 * 优化节点1
 * 删除能删除的空节点
 * @param _root 
 */
function optimizeNode1(_root:ASTElement){
    _root.children = _root.children.filter(child=>{
        if(child.type == 1 && child.tag == '$$null' && !child.attrsMap['v-if']){
                return false
        }else{
            return true;
        }
    }).map(child=>{
        if(child.type == 1){
            optimizeNode1(child)
        }
        return child;
    })
    return _root;
}


/**
 * 优化节点2
 * 将多层级wrap节点合并
 * @param _root 
 */
function optimizeNode2(_root:ASTElement){
    function loop () {
        if(_root.children.length == 1){
            var child = _root.children[0];
            if(child.type == 1 && ['$$condition_wrap','$$array_wrap'].indexOf(child.tag) != -1){
                return child
            }
        }
    }
    var _child;
    while (_child = loop()) {
        _root.children = _child.children
    }
    _root.children = _root.children.map(child=>{
        if(child.type == 1){
            return optimizeNode2(child)
        }else{
            throw new Error("优化错误")
        }
    })

    return _root
}




function dynamicExpStrToStyle(expStr:string){
    // console.log('dynamicExpStrToStyle:',expStr);
    var obj = JSON.parse(expStr);
    var ret = Object.keys(obj).map(key=>{
        var _key = key;
        var _value = obj[key];
        if(_key.startsWith('"') && _key.endsWith('"'))_key = _key.slice(1,-1)
        if(_value.startsWith('"') && _value.endsWith('"'))_value = _value.slice(1,-1)
        return `${_key}:${_value}`
    }).join(';')
    return `"${ret}"`;
}




function getElementExpFromFuncExp ( exp:TSESTree.FunctionExpression) {
    if(exp.body.type == AST_NODE_TYPES.BlockStatement){
        var sts = exp.body.body;
        if(sts.length == 1){
            var rets = sts[0];
            if(rets.type == AST_NODE_TYPES.ReturnStatement){
                var retsArg = rets.argument;
                if(retsArg){
                    if(retsArg.type == AST_NODE_TYPES.ArrayExpression 
                        || retsArg.type == AST_NODE_TYPES.ConditionalExpression
                        || retsArg.type == AST_NODE_TYPES.CallExpression
                        ){
                        return retsArg;
                    }
                }
            }
        
        }
    }
    
    throw new Error('从函数表达式中获取元素节点表达式错误')
}



