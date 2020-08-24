import { List } from "immutable"
import {TSESTree} from "@typescript-eslint/typescript-estree"
type Context = {
    [key:string]:string
}
export type ContextStack = List<Context>

// 倒着查找ctx
export function findInCtx (ctx:List<Context>,match:{[key:string]:string}) {
    var size = ctx.size;
    for (var i = size; i>=0;i--){
        var keys = Object.keys(match);
        var count = 0;
        var curCtx = ctx.get(i);
        keys.some(key=>{
            if(curCtx != undefined && match[key] == curCtx[key]){
                count ++ 
            }
        })
        if(count == keys.length){
            return {index:i,data:curCtx||{}}
        }
    }
    return {index:-1,data:{}}
} 

export class TransformError extends Error {
    loc:TSESTree.SourceLocation
    msg:string
    constructor (msg:string,loc:TSESTree.SourceLocation) {
        super()
        this.loc = loc
        this.msg = `${msg}，开始于${loc.start.line}行，${loc.start.column}列，结束于${loc.end.line}行，${loc.end.column}`
    }
    toString () {
        return this.msg
    }
}