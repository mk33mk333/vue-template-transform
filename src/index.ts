// 模块入口
// {render:,staticRender:}

import { StaticRender,Node } from "./staticRender";
import { Render } from "./render";

export function transform (str:string) {
    var func = new Function (`return ${str}`)
    var obj = func();
    var staticTpls:string[] = [];
    if(obj.staticRenderFns){
        console.log('解析静态模板')
        obj.staticRenderFns.forEach((func:()=>Node) => {
            var sr = new StaticRender(func)
            var tpl = sr.render()
            console.log(tpl)
            staticTpls.push(tpl)
        })
    }
    if(obj.render){
        console.log('解析动态模板')
        // 组成符合js语法的函数表达式
        var renderStr = 'var _renderFunc = ' + obj.render.toString()
        // console.log(renderStr)
        var r = new Render(renderStr,staticTpls);
        var tpl = r.render()
        return tpl
    }else{
        throw new Error("输入内容错误，没有 render 函数")
    }
    
}