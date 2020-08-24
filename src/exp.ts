import {TSESTree, AST_NODE_TYPES} from "@typescript-eslint/typescript-estree"
import { ContextStack, findInCtx } from "./types"

/**
 * 表达式中需要处理的逻辑
 * t.x 的 this 引用 应干掉 t
 * $event 存在于参数
 * $event.x 存在于 member表达式中
 * 函数表达式应去掉函数壳，都是事件监听函数
 * 属性键值对的值如果是函数表达式，要拆掉外括号，并且，键+@
 * 属性键值对的值如果是对象，则返回对象，如果是数组，则返回数组
 * 
 */


 export class Exp {
    $thisName = ""
     constructor (thisName:string) {
         this.$thisName = thisName
     }

     /**
 * ArrowFunctionExpression
 * AssignmentExpression  处理
 * BinaryExpression  处理
 * ConditionalExpression  处理
 * ImportExpression
 * JSXClosingElement
 * JSXClosingFragment
 * JSXExpressionContainer
 * JSXOpeningElement
 * JSXOpeningFragment
 * JSXSpreadChild
 * LogicalExpression  处理
 * NewExpression
 * RestElement
 * SequenceExpression  处理
 * SpreadElement
 * TSAsExpression
 * TSUnaryExpression
 * YieldExpression
 */
  expToString ( _exp:TSESTree.Expression,_ctx:ContextStack):string {
        switch (_exp.type) {

            case AST_NODE_TYPES.AssignmentExpression:
                var ret = `${this.expToString(_exp.left,_ctx)} ${_exp.operator} ${this.expToString(_exp.right,_ctx)}`
                return ret;

            case AST_NODE_TYPES.SequenceExpression:
                var expressions = _exp.expressions;
                // 这里会不会遇到节点上下文
                var ret = expressions.map(exp=>{
                    return this.expToString(exp,_ctx);
                }).join(',')
                return ret

            case AST_NODE_TYPES.UnaryExpression:  // 一元运算符
                // x  !0 !1
                return `${_exp.operator}${this.expToString(_exp.argument,_ctx)}`

            case AST_NODE_TYPES.LogicalExpression:
                var ret = `${this.expToString(_exp.left,_ctx)} ${_exp.operator} ${this.expToString(_exp.right,_ctx)}`
                return ret;

            case AST_NODE_TYPES.ConditionalExpression:   
                var test = this.expToString(_exp.test,_ctx);   
                var alternate = this.expToString(_exp.alternate,_ctx); // 成功
                var consequent = this.expToString(_exp.consequent,_ctx);  // 失败
                return `(${test} ? ${consequent || ''} : ${alternate || ''})`

            case AST_NODE_TYPES.BinaryExpression:
                if(_exp.operator == '==' || _exp.operator == '!=' || _exp.operator == '!==' || _exp.operator == '==='){ // == 就把左右互换
                    var ret = `${this.expToString(_exp.right,_ctx)} ${_exp.operator} ${this.expToString(_exp.left,_ctx)}`
                    return ret;
                }else{
                    var ret = `${this.expToString(_exp.left,_ctx)} ${_exp.operator} ${this.expToString(_exp.right,_ctx)}`
                    return ret;
                }
            case AST_NODE_TYPES.ObjectExpression:
                var properties = _exp.properties;
                var obj:{[key:string]:string} = {}
                var newCtx = _ctx.push({type:'inObject'})
                properties.forEach(propertyNode=>{
                    var property = this.objectExpressionToString(propertyNode,newCtx)
                    // console.log('========>',property.key,property.value);
                    obj[property.key] = property.value
                })
                return JSON.stringify(obj); 
                // return objectToCode(obj); 
            case AST_NODE_TYPES.ArrayExpression:
                return `[${_exp.elements.map(node=>{
                    return this.expToString(node,_ctx)
                }).join(',')}]` 
            case AST_NODE_TYPES.MemberExpression:
                var object = this.expToString(_exp.object,_ctx);
                var property = this.expToString(_exp.property,_ctx);
                var computed = _exp.computed;
                // 如果 object 是 t.x  , t 可能需要去掉
                var r = findInCtx(_ctx,{type:'eventId'});
                if(r.index > -1 && r.data.value == object)object = '$event' // 处理原本应为 $event.value 的情况
                // var isInObject = findInCtx(_ctx,{type:'inObject'}).index;
                var isInObject = 1;
                var _params = findInCtx(_ctx,{type:'params'});
                // console.log(_ctx.toJSON(),object,property)
                // 对象中，在函数内，函数有参数，参数中没有t， object是t，
                if( isInObject > -1   // 有 params 的情形
                    && _params.index > -1 
                    && _params.data.value.split(',').indexOf(this.$thisName) == -1 
                    && object == this.$thisName
                ){
                    return `${property}`
                }else if(isInObject > -1 && _params.index == -1 && object == this.$thisName){   // 无参数的场景
                    return `${property}`
                }else if(computed){
                    return `${object}[${property}]`
                }else{
                    return `${object}.${property}`
                }
            case AST_NODE_TYPES.FunctionExpression: 
                var params = _exp.params.map(node=>{return this.parameterToString(node,_ctx)})
                // console.log(params,_ctx,findInCtx(_ctx,{type:'Property_value'}).index)
                if(findInCtx(_ctx,{type:'Property_value'}).index != -1 && params.length > 0){
                    var eventId = params[0];
                    var nextCtx1 = _ctx.push({type:'eventId',value:eventId}) 
                    // console.log('eventId:',eventId,_exp.body)
                    debugger
                    var bodyStr = this.statementToString(_exp.body,nextCtx1);
                    return bodyStr
                }
                // t 作为 参数时， t.x 的 t 不能去掉
                var nextCtx2 = _ctx.push({type:'params',value:params.join(',')})
                var body = this.statementToString(_exp.body,nextCtx2);
                return `{ ${body} }`
            case AST_NODE_TYPES.SequenceExpression:
                var expressions = _exp.expressions;
                // 这里会不会遇到节点上下文
                var ret = expressions.map(exp=>{
                return this.expToString(exp,_ctx);
                }).join(',')
                return ret
            case AST_NODE_TYPES.Identifier:
                // 也需要处理 eventId
                var r = findInCtx(_ctx,{type:'eventId'});
                var ret = _exp.name
                if(ret == 'arguments[0]')ret = '$event'
                if(r.index > -1 && r.data.value == ret)ret = '$event'
                return ret
            case AST_NODE_TYPES.Literal:
                return _exp.raw;
            case AST_NODE_TYPES.CallExpression:
                var callee = _exp.callee;
                var args = _exp.arguments;
                var r = findInCtx(_ctx,{type:'eventId'});
                var argStrs = args.map(arg=>{  // 处理参数中应为 $event 的情况
                    var argStr = this.expToString(arg,_ctx)
                    if(argStr == 'arguments[0]')argStr = '$event'
                    if(r.index > -1 && r.data.value == argStr)argStr = '$event'
                    return argStr
                })
                var ret = `${this.expToString(callee,_ctx)}(${argStrs.join(',')})`
                return ret;
            default:
                throw new Error(`未知的表达式:${_exp.type}`)
        }
    }

    /**
     * MethodDefinition 
     * Property
     * SpreadElement
     * TSAbstractMethodDefinition
     * objectExpression应转化为普通对象，保留数组、对象、函数去壳、区分动态属性
     * @param property 
     */
    objectExpressionToString (property:TSESTree.ObjectLiteralElementLike,_ctx:ContextStack) {
        switch (property.type) {
            case AST_NODE_TYPES.Property:
                var key = this.expToString(property.key,_ctx)
                var nextCtx1 = _ctx.push({type:'Property_value'})
                var value = this.valueToString(property.value,nextCtx1)
                var computed = property.computed;
                var method = property.method;
                var shorthand= property.shorthand;
                return {key,value,computed,method,shorthand}
            default:
                throw new Error(`objectExpressionToString:未知类型:${property.type}`)
        }
    }

    /**
     * ArrayPattern
     * AssignmentPattern 
     * Identifier
     * ObjectPattern
     * RestElement
     * TSParameterProperty;
     */

    parameterToString(param:TSESTree.Parameter,_ctx:ContextStack) {
        switch (param.type) {
            case AST_NODE_TYPES.ArrayPattern:
            case AST_NODE_TYPES.AssignmentPattern:
            case AST_NODE_TYPES.RestElement:
            case AST_NODE_TYPES.TSParameterProperty:
                return ''
            case AST_NODE_TYPES.Identifier:
                return param.name
            default:
                throw new Error(`parameterToString:未知类型:${param.type}`)
        }
        
    }

    valueToString (value:TSESTree.Expression | TSESTree.AssignmentPattern | TSESTree.BindingName | TSESTree.TSEmptyBodyFunctionExpression,_ctx:ContextStack){
        switch (value.type) {
            case AST_NODE_TYPES.TSEmptyBodyFunctionExpression:
            case AST_NODE_TYPES.AssignmentPattern:
            case AST_NODE_TYPES.ArrayPattern:
            case AST_NODE_TYPES.ObjectPattern:
                throw new Error(`valueToString:未知类型:${value.type}`)
            case AST_NODE_TYPES.Identifier:
                return value.name
            default:
                return this.expToString(value,_ctx)
        }
    }

    objectToCode (obj:{[key:string]:string}) {
    var s = `{ ${Object.keys(obj).map(key=>{
            return `${key}:${obj[key]}`
        }).join(',')}}`
        return s
    }

    /**
     * BlockStatement
     * BreakStatement
     * ContinueStatement
     * DebuggerStatement
     * DeclarationStatement 不处理
     * EmptyStatement
     * ExpressionStatement
     * IfStatement
     * IterationStatement
     * ImportDeclaration
     * LabeledStatement
     * TSModuleBlock
     * ReturnStatement
     * SwitchStatement
     * ThrowStatement
     * TryStatement 
     * VariableDeclaration
     * WithStatement;
     */

    statementToString (statement:TSESTree.Statement,_ctx:ContextStack):string {
        switch (statement.type) {
            case AST_NODE_TYPES.BlockStatement:
                var ret = statement.body.map(_statement=>{
                    return this.statementToString(_statement,_ctx)
                }).join(';')
                return ret;
            case AST_NODE_TYPES.ExpressionStatement:
                var ret = this.expToString(statement.expression,_ctx)
                return ret;
            case AST_NODE_TYPES.ReturnStatement:
                var arg = statement.argument;
                if(arg){
                    var ret = this.expToString(arg,_ctx)
                    return ret;
                }else{
                    return ''
                }
            case AST_NODE_TYPES.VariableDeclaration:
                var kind = statement.kind;
                // console.log(statement);
                var s = statement.declarations.map(declaration => {
                    var id  = declaration.id;
                    var init = declaration.init;
                    var _initCode = '';
                    if(init)_initCode = this.expToString(init,_ctx)
                    var _idStr = this.bindingNameToString(id,_ctx)
                    return `${_idStr}${_initCode?'=':''}${_initCode}`
                })
                var vs = `${kind} ${s.join(',')}`
                // console.log(vs);
                debugger
                return vs
            default:
                throw new Error(`statementToString:未知类型:${statement.type}`)
        }
    }

    bindingNameToString (binding:TSESTree.BindingName,_ctx:ContextStack) {
        switch (binding.type) {
            case AST_NODE_TYPES.Identifier:
                return binding.name
            default:
        }       throw new Error(`bindingNameToString:未知类型:${binding.type}`)
    }
}










