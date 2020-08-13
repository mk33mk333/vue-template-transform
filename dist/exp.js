"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exp = void 0;
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
const types_1 = require("./types");
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
class Exp {
    constructor(thisName) {
        this.$thisName = "";
        this.$thisName = thisName;
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
    expToString(_exp, _ctx) {
        switch (_exp.type) {
            case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
                var ret = `${this.expToString(_exp.left, _ctx)} ${_exp.operator} ${this.expToString(_exp.right, _ctx)}`;
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
                var expressions = _exp.expressions;
                // 这里会不会遇到节点上下文
                var ret = expressions.map(exp => {
                    return this.expToString(exp, _ctx);
                }).join(',');
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.UnaryExpression: // 一元运算符
                // x  !0 !1
                return `${_exp.operator}${this.expToString(_exp.argument, _ctx)}`;
            case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
                var ret = `${this.expToString(_exp.left, _ctx)} ${_exp.operator} ${this.expToString(_exp.right, _ctx)}`;
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
                var test = this.expToString(_exp.test, _ctx);
                var alternate = this.expToString(_exp.alternate, _ctx); // 成功
                var consequent = this.expToString(_exp.consequent, _ctx); // 失败
                return `(${test} ? ${consequent || ''} : ${alternate || ''})`;
            case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
                if (_exp.operator == '==' || _exp.operator == '!=' || _exp.operator == '!==' || _exp.operator == '===') { // == 就把左右互换
                    var ret = `${this.expToString(_exp.right, _ctx)} ${_exp.operator} ${this.expToString(_exp.left, _ctx)}`;
                    return ret;
                }
                else {
                    var ret = `${this.expToString(_exp.left, _ctx)} ${_exp.operator} ${this.expToString(_exp.right, _ctx)}`;
                    return ret;
                }
            case typescript_estree_1.AST_NODE_TYPES.ObjectExpression:
                var properties = _exp.properties;
                var obj = {};
                var newCtx = _ctx.push({ type: 'inObject' });
                properties.forEach(propertyNode => {
                    var property = this.objectExpressionToString(propertyNode, newCtx);
                    console.log('========>', property.key, property.value);
                    obj[property.key] = property.value;
                });
                return JSON.stringify(obj);
            // return objectToCode(obj); 
            case typescript_estree_1.AST_NODE_TYPES.ArrayExpression:
                return `[${_exp.elements.map(node => {
                    return this.expToString(node, _ctx);
                }).join(',')}]`;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                var object = this.expToString(_exp.object, _ctx);
                var property = this.expToString(_exp.property, _ctx);
                var computed = _exp.computed;
                // 如果 object 是 t.x  , t 可能需要去掉
                var r = types_1.findInCtx(_ctx, { type: 'eventId' });
                if (r.index > -1 && r.data.value == object)
                    object = '$event'; // 处理原本应为 $event.value 的情况
                // var isInObject = findInCtx(_ctx,{type:'inObject'}).index;
                var isInObject = 1;
                var _params = types_1.findInCtx(_ctx, { type: 'params' });
                // console.log(_ctx.toJSON(),object,property)
                // 对象中，在函数内，函数有参数，参数中没有t， object是t，
                if (isInObject > -1 // 有 params 的情形
                    && _params.index > -1
                    && _params.data.value.split(',').indexOf(this.$thisName) == -1
                    && object == this.$thisName) {
                    return `${property}`;
                }
                else if (isInObject > -1 && _params.index == -1 && object == this.$thisName) { // 无参数的场景
                    return `${property}`;
                }
                else if (computed) {
                    return `${object}[${property}]`;
                }
                else {
                    return `${object}.${property}`;
                }
            case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
                var params = _exp.params.map(node => { return this.parameterToString(node, _ctx); });
                console.log(params, _ctx, types_1.findInCtx(_ctx, { type: 'Property_value' }).index);
                if (types_1.findInCtx(_ctx, { type: 'Property_value' }).index != -1 && params.length > 0) {
                    var eventId = params[0];
                    var nextCtx1 = _ctx.push({ type: 'eventId', value: eventId });
                    console.log('eventId:', eventId, _exp.body);
                    debugger;
                    var bodyStr = this.statementToString(_exp.body, nextCtx1);
                    return bodyStr;
                }
                // t 作为 参数时， t.x 的 t 不能去掉
                var nextCtx2 = _ctx.push({ type: 'params', value: params.join(',') });
                var body = this.statementToString(_exp.body, nextCtx2);
                return `{ ${body} }`;
            case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
                var expressions = _exp.expressions;
                // 这里会不会遇到节点上下文
                var ret = expressions.map(exp => {
                    return this.expToString(exp, _ctx);
                }).join(',');
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                // 也需要处理 eventId
                var r = types_1.findInCtx(_ctx, { type: 'eventId' });
                var ret = _exp.name;
                if (ret == 'arguments[0]')
                    ret = '$event';
                if (r.index > -1 && r.data.value == ret)
                    ret = '$event';
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.Literal:
                return _exp.raw;
            case typescript_estree_1.AST_NODE_TYPES.CallExpression:
                var callee = _exp.callee;
                var args = _exp.arguments;
                var r = types_1.findInCtx(_ctx, { type: 'eventId' });
                var argStrs = args.map(arg => {
                    var argStr = this.expToString(arg, _ctx);
                    if (argStr == 'arguments[0]')
                        argStr = '$event';
                    if (r.index > -1 && r.data.value == argStr)
                        argStr = '$event';
                    return argStr;
                });
                var ret = `${this.expToString(callee, _ctx)}(${argStrs.join(',')})`;
                return ret;
            default:
                throw new Error(`未知的表达式:${_exp.type}`);
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
    objectExpressionToString(property, _ctx) {
        switch (property.type) {
            case typescript_estree_1.AST_NODE_TYPES.Property:
                var key = this.expToString(property.key, _ctx);
                var nextCtx1 = _ctx.push({ type: 'Property_value' });
                var value = this.valueToString(property.value, nextCtx1);
                var computed = property.computed;
                var method = property.method;
                var shorthand = property.shorthand;
                return { key, value, computed, method, shorthand };
            default:
                throw new Error(`objectExpressionToString:未知类型:${property.type}`);
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
    parameterToString(param, _ctx) {
        switch (param.type) {
            case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
            case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
            case typescript_estree_1.AST_NODE_TYPES.RestElement:
            case typescript_estree_1.AST_NODE_TYPES.TSParameterProperty:
                return '';
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                return param.name;
            default:
                throw new Error(`parameterToString:未知类型:${param.type}`);
        }
    }
    valueToString(value, _ctx) {
        switch (value.type) {
            case typescript_estree_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression:
            case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
            case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
            case typescript_estree_1.AST_NODE_TYPES.ObjectPattern:
                throw new Error(`valueToString:未知类型:${value.type}`);
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                return value.name;
            default:
                return this.expToString(value, _ctx);
        }
    }
    objectToCode(obj) {
        var s = `{ ${Object.keys(obj).map(key => {
            return `${key}:${obj[key]}`;
        }).join(',')}}`;
        return s;
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
    statementToString(statement, _ctx) {
        switch (statement.type) {
            case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
                var ret = statement.body.map(_statement => {
                    return this.statementToString(_statement, _ctx);
                }).join(';');
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
                var ret = this.expToString(statement.expression, _ctx);
                return ret;
            case typescript_estree_1.AST_NODE_TYPES.ReturnStatement:
                var arg = statement.argument;
                if (arg) {
                    var ret = this.expToString(arg, _ctx);
                    return ret;
                }
                else {
                    return '';
                }
            case typescript_estree_1.AST_NODE_TYPES.VariableDeclaration:
                var kind = statement.kind;
                // console.log(statement);
                var s = statement.declarations.map(declaration => {
                    var id = declaration.id;
                    var init = declaration.init;
                    var _initCode = '';
                    if (init)
                        _initCode = this.expToString(init, _ctx);
                    var _idStr = this.bindingNameToString(id, _ctx);
                    return `${_idStr}${_initCode ? '=' : ''}${_initCode}`;
                });
                var vs = `${kind} ${s.join(',')}`;
                // console.log(vs);
                debugger;
                return vs;
            default:
                throw new Error(`statementToString:未知类型:${statement.type}`);
        }
    }
    bindingNameToString(binding, _ctx) {
        switch (binding.type) {
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                return binding.name;
            default:
        }
        throw new Error(`bindingNameToString:未知类型:${binding.type}`);
    }
}
exports.Exp = Exp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0RUFBNkU7QUFDN0UsbUNBQWlEO0FBRWpEOzs7Ozs7Ozs7R0FTRztBQUdGLE1BQWEsR0FBRztJQUVaLFlBQWEsUUFBZTtRQUQ3QixjQUFTLEdBQUcsRUFBRSxDQUFBO1FBRVQsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7SUFDN0IsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQW9CRjtJQUNELFdBQVcsQ0FBRyxJQUF3QixFQUFDLElBQWlCO1FBQ2xELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUVmLEtBQUssa0NBQWMsQ0FBQyxvQkFBb0I7Z0JBQ3BDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7Z0JBQ3JHLE9BQU8sR0FBRyxDQUFDO1lBRWYsS0FBSyxrQ0FBYyxDQUFDLGtCQUFrQjtnQkFDbEMsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDbkMsZUFBZTtnQkFDZixJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQSxFQUFFO29CQUMzQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ1osT0FBTyxHQUFHLENBQUE7WUFFZCxLQUFLLGtDQUFjLENBQUMsZUFBZSxFQUFHLFFBQVE7Z0JBQzFDLFdBQVc7Z0JBQ1gsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7WUFFcEUsS0FBSyxrQ0FBYyxDQUFDLGlCQUFpQjtnQkFDakMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQTtnQkFDckcsT0FBTyxHQUFHLENBQUM7WUFFZixLQUFLLGtDQUFjLENBQUMscUJBQXFCO2dCQUNyQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7Z0JBQzVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLEtBQUs7Z0JBQy9ELE9BQU8sSUFBSSxJQUFJLE1BQU0sVUFBVSxJQUFJLEVBQUUsTUFBTSxTQUFTLElBQUksRUFBRSxHQUFHLENBQUE7WUFFakUsS0FBSyxrQ0FBYyxDQUFDLGdCQUFnQjtnQkFDaEMsSUFBRyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssRUFBQyxFQUFFLFlBQVk7b0JBQ2hILElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7b0JBQ3JHLE9BQU8sR0FBRyxDQUFDO2lCQUNkO3FCQUFJO29CQUNELElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7b0JBQ3JHLE9BQU8sR0FBRyxDQUFDO2lCQUNkO1lBQ0wsS0FBSyxrQ0FBYyxDQUFDLGdCQUFnQjtnQkFDaEMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDakMsSUFBSSxHQUFHLEdBQXlCLEVBQUUsQ0FBQTtnQkFDbEMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFBO2dCQUN6QyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQSxFQUFFO29CQUM3QixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxFQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBQyxRQUFRLENBQUMsR0FBRyxFQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDckQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFBO2dCQUN0QyxDQUFDLENBQUMsQ0FBQTtnQkFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDM0IsNkJBQTZCO1lBQ2pDLEtBQUssa0NBQWMsQ0FBQyxlQUFlO2dCQUMvQixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFBLEVBQUU7b0JBQy9CLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3RDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFBO1lBQ25CLEtBQUssa0NBQWMsQ0FBQyxnQkFBZ0I7Z0JBQ2hDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUM3Qiw4QkFBOEI7Z0JBQzlCLElBQUksQ0FBQyxHQUFHLGlCQUFTLENBQUMsSUFBSSxFQUFDLEVBQUMsSUFBSSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUM7Z0JBQ3pDLElBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxNQUFNO29CQUFDLE1BQU0sR0FBRyxRQUFRLENBQUEsQ0FBQywwQkFBMEI7Z0JBQ3RGLDREQUE0RDtnQkFDNUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLE9BQU8sR0FBRyxpQkFBUyxDQUFDLElBQUksRUFBQyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDO2dCQUM5Qyw2Q0FBNkM7Z0JBQzdDLG1DQUFtQztnQkFDbkMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUcsZUFBZTt1QkFDOUIsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7dUJBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt1QkFDM0QsTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQzlCO29CQUNHLE9BQU8sR0FBRyxRQUFRLEVBQUUsQ0FBQTtpQkFDdkI7cUJBQUssSUFBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBQyxFQUFJLFNBQVM7b0JBQ3JGLE9BQU8sR0FBRyxRQUFRLEVBQUUsQ0FBQTtpQkFDdkI7cUJBQUssSUFBRyxRQUFRLEVBQUM7b0JBQ2QsT0FBTyxHQUFHLE1BQU0sSUFBSSxRQUFRLEdBQUcsQ0FBQTtpQkFDbEM7cUJBQUk7b0JBQ0QsT0FBTyxHQUFHLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQTtpQkFDakM7WUFDTCxLQUFLLGtDQUFjLENBQUMsa0JBQWtCO2dCQUNsQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUEsRUFBRSxHQUFDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsQ0FBQSxDQUFBLENBQUMsQ0FBQyxDQUFBO2dCQUM5RSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxJQUFJLEVBQUMsaUJBQVMsQ0FBQyxJQUFJLEVBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN0RSxJQUFHLGlCQUFTLENBQUMsSUFBSSxFQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFnQixFQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7b0JBQ3hFLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBQyxTQUFTLEVBQUMsS0FBSyxFQUFDLE9BQU8sRUFBQyxDQUFDLENBQUE7b0JBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3pDLFFBQVEsQ0FBQTtvQkFDUixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxRQUFRLENBQUMsQ0FBQztvQkFDekQsT0FBTyxPQUFPLENBQUE7aUJBQ2pCO2dCQUNELHlCQUF5QjtnQkFDekIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsS0FBSyxFQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFBO2dCQUNoRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEQsT0FBTyxLQUFLLElBQUksSUFBSSxDQUFBO1lBQ3hCLEtBQUssa0NBQWMsQ0FBQyxrQkFBa0I7Z0JBQ2xDLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLGVBQWU7Z0JBQ2YsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUEsRUFBRTtvQkFDL0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNaLE9BQU8sR0FBRyxDQUFBO1lBQ2QsS0FBSyxrQ0FBYyxDQUFDLFVBQVU7Z0JBQzFCLGdCQUFnQjtnQkFDaEIsSUFBSSxDQUFDLEdBQUcsaUJBQVMsQ0FBQyxJQUFJLEVBQUMsRUFBQyxJQUFJLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtnQkFDbkIsSUFBRyxHQUFHLElBQUksY0FBYztvQkFBQyxHQUFHLEdBQUcsUUFBUSxDQUFBO2dCQUN2QyxJQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRztvQkFBQyxHQUFHLEdBQUcsUUFBUSxDQUFBO2dCQUNyRCxPQUFPLEdBQUcsQ0FBQTtZQUNkLEtBQUssa0NBQWMsQ0FBQyxPQUFPO2dCQUN2QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDcEIsS0FBSyxrQ0FBYyxDQUFDLGNBQWM7Z0JBQzlCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ3pCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxHQUFHLGlCQUFTLENBQUMsSUFBSSxFQUFDLEVBQUMsSUFBSSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFBLEVBQUU7b0JBQ3hCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLElBQUksQ0FBQyxDQUFBO29CQUN2QyxJQUFHLE1BQU0sSUFBSSxjQUFjO3dCQUFDLE1BQU0sR0FBRyxRQUFRLENBQUE7b0JBQzdDLElBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxNQUFNO3dCQUFDLE1BQU0sR0FBRyxRQUFRLENBQUE7b0JBQzNELE9BQU8sTUFBTSxDQUFBO2dCQUNqQixDQUFDLENBQUMsQ0FBQTtnQkFDRixJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQTtnQkFDbEUsT0FBTyxHQUFHLENBQUM7WUFDZjtnQkFDSSxNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7U0FDN0M7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILHdCQUF3QixDQUFFLFFBQTBDLEVBQUMsSUFBaUI7UUFDbEYsUUFBUSxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ25CLEtBQUssa0NBQWMsQ0FBQyxRQUFRO2dCQUN4QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzdDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3ZELElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQ2pDLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQzdCLElBQUksU0FBUyxHQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUM7Z0JBQ2xDLE9BQU8sRUFBQyxHQUFHLEVBQUMsS0FBSyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsU0FBUyxFQUFDLENBQUE7WUFDaEQ7Z0JBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7U0FDeEU7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUVILGlCQUFpQixDQUFDLEtBQXdCLEVBQUMsSUFBaUI7UUFDeEQsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ2hCLEtBQUssa0NBQWMsQ0FBQyxZQUFZLENBQUM7WUFDakMsS0FBSyxrQ0FBYyxDQUFDLGlCQUFpQixDQUFDO1lBQ3RDLEtBQUssa0NBQWMsQ0FBQyxXQUFXLENBQUM7WUFDaEMsS0FBSyxrQ0FBYyxDQUFDLG1CQUFtQjtnQkFDbkMsT0FBTyxFQUFFLENBQUE7WUFDYixLQUFLLGtDQUFjLENBQUMsVUFBVTtnQkFDMUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFBO1lBQ3JCO2dCQUNJLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1NBQzlEO0lBRUwsQ0FBQztJQUVELGFBQWEsQ0FBRSxLQUFzSCxFQUFDLElBQWlCO1FBQ25KLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRTtZQUNoQixLQUFLLGtDQUFjLENBQUMsNkJBQTZCLENBQUM7WUFDbEQsS0FBSyxrQ0FBYyxDQUFDLGlCQUFpQixDQUFDO1lBQ3RDLEtBQUssa0NBQWMsQ0FBQyxZQUFZLENBQUM7WUFDakMsS0FBSyxrQ0FBYyxDQUFDLGFBQWE7Z0JBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELEtBQUssa0NBQWMsQ0FBQyxVQUFVO2dCQUMxQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFDckI7Z0JBQ0ksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBQyxJQUFJLENBQUMsQ0FBQTtTQUMxQztJQUNMLENBQUM7SUFFRCxZQUFZLENBQUUsR0FBeUI7UUFDdkMsSUFBSSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUEsRUFBRTtZQUMvQixPQUFPLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFBO1FBQ2YsT0FBTyxDQUFDLENBQUE7SUFDWixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FtQkc7SUFFSCxpQkFBaUIsQ0FBRSxTQUE0QixFQUFDLElBQWlCO1FBQzdELFFBQVEsU0FBUyxDQUFDLElBQUksRUFBRTtZQUNwQixLQUFLLGtDQUFjLENBQUMsY0FBYztnQkFDOUIsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFBLEVBQUU7b0JBQ3JDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNaLE9BQU8sR0FBRyxDQUFDO1lBQ2YsS0FBSyxrQ0FBYyxDQUFDLG1CQUFtQjtnQkFDbkMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNyRCxPQUFPLEdBQUcsQ0FBQztZQUNmLEtBQUssa0NBQWMsQ0FBQyxlQUFlO2dCQUMvQixJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO2dCQUM3QixJQUFHLEdBQUcsRUFBQztvQkFDSCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxJQUFJLENBQUMsQ0FBQTtvQkFDcEMsT0FBTyxHQUFHLENBQUM7aUJBQ2Q7cUJBQUk7b0JBQ0QsT0FBTyxFQUFFLENBQUE7aUJBQ1o7WUFDTCxLQUFLLGtDQUFjLENBQUMsbUJBQW1CO2dCQUNuQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO2dCQUMxQiwwQkFBMEI7Z0JBQzFCLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUM3QyxJQUFJLEVBQUUsR0FBSSxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUN6QixJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO29CQUM1QixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7b0JBQ25CLElBQUcsSUFBSTt3QkFBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUE7b0JBQy9DLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUE7b0JBQzlDLE9BQU8sR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFBLENBQUMsQ0FBQSxHQUFHLENBQUEsQ0FBQyxDQUFBLEVBQUUsR0FBRyxTQUFTLEVBQUUsQ0FBQTtnQkFDckQsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxFQUFFLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO2dCQUNqQyxtQkFBbUI7Z0JBQ25CLFFBQVEsQ0FBQTtnQkFDUixPQUFPLEVBQUUsQ0FBQTtZQUNiO2dCQUNJLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1NBQ2xFO0lBQ0wsQ0FBQztJQUVELG1CQUFtQixDQUFFLE9BQTRCLEVBQUMsSUFBaUI7UUFDL0QsUUFBUSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2xCLEtBQUssa0NBQWMsQ0FBQyxVQUFVO2dCQUMxQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUE7WUFDdkIsUUFBUTtTQUNYO1FBQU8sTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDdkUsQ0FBQztDQUNKO0FBOVJBLGtCQThSQSJ9