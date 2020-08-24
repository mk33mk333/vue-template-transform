import { html } from "js-beautify"
const selfClose = [ 'base','br','hr','img','input','col','frame','link','area','param','object','keygen','source']
export interface TextNode {
    type:'text'
    text:string
}

export interface Element {
    type:'element'
    tag:string
    attrMap?:{[key:string]:any}
    children:Node[]
}

export type Node = Element | TextNode 

export class StaticRender {
    _self = {}
    renderFunc:()=>Node
    constructor (renderFunc:()=>Node) {
        this._self = {}
        this.renderFunc = renderFunc
    }
    render () {
        var root = this.renderFunc ()
        // 转换成html
        // console.log(root);
        var _html = this.toHtml(root)
        _html = html(_html,{preserve_newlines:false});
        // console.log(_html)
        return _html
    }
    toHtml (root:Node):string {
        if(root.type == "text")return root.text
        if(selfClose.indexOf(root.tag) == -1){
            return `<${root.tag} ${this.attrToString(root.attrMap||{})}>
              ${root.children.map(child=>{
                  return this.toHtml(child)
              }).join('\r')} </${root.tag}>`
        }else{
            return `<${root.tag} ${this.attrToString(root.attrMap||{})} />`
        }     
    }
    attrToString  (obj:{[key:string]:any}) {
        var ret = Object.keys(obj).map(key=>{
            var _key = key;
            var _value = obj[key];
            if(_key == "attrs") {
                _value = Object.keys(_value).map(key => {
                    var __key = key;
                    var __value = _value[key];
                    return `${__key}="${__value}"`
                }).join(" ")
                return _value
            }
            if(key == "staticClass")_key = "class"
            if(key == "staticStyle"){
                _key = "style"
                _value = Object.keys(_value).map(key=>{
                    var __key = key;
                    var __value = _value[key];
                    return `${__key}:${__value}`
                }).join(';')
            }
            return `${_key}="${_value}"`
        }).join(" ")
        return ret;
    }

    _v  (str:string) {
        return {
            text:str,
            type:'text'
        }
    }

    $createElement (tag:string,attrMap:{[key:string]:any},children:Node[]) {
        var _tag, _attrMap, _children;
        _tag = tag;
        if(Array.isArray(attrMap)){
            _children = attrMap
        }else{
            _attrMap = attrMap
        }
        if(Array.isArray(children)){
            _children = children
        }
        var ret = {
            tag:_tag,
            type:'element',
            attrMap:_attrMap || {},
            children:_children || []
        }
        return ret;
    }


}
