"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticRender = void 0;
const js_beautify_1 = require("js-beautify");
const selfClose = ['base', 'br', 'hr', 'img', 'input', 'col', 'frame', 'link', 'area', 'param', 'object', 'keygen', 'source'];
class StaticRender {
    constructor(renderFunc) {
        this._self = {};
        this._self = {};
        this.renderFunc = renderFunc;
    }
    render() {
        var root = this.renderFunc();
        // 转换成html
        console.log(root);
        var _html = this.toHtml(root);
        _html = js_beautify_1.html(_html, { preserve_newlines: false });
        console.log(_html);
        return _html;
    }
    toHtml(root) {
        if (root.type == "text")
            return root.text;
        if (selfClose.indexOf(root.tag) == -1) {
            return `<${root.tag} ${this.attrToString(root.attrMap || {})}>
              ${root.children.map(child => {
                return this.toHtml(child);
            }).join('\r')} </${root.tag}>`;
        }
        else {
            return `<${root.tag} ${this.attrToString(root.attrMap || {})} />`;
        }
    }
    attrToString(obj) {
        var ret = Object.keys(obj).map(key => {
            var _key = key;
            var _value = obj[key];
            if (key == "staticClass")
                _key = "class";
            if (key == "staticStyle") {
                _key = "style";
                _value = Object.keys(_value).map(key => {
                    var __key = key;
                    var __value = _value[key];
                    return `${__key}:${__value}`;
                }).join(';');
            }
            return `${_key}="${_value}"`;
        }).join(" ");
        return ret;
    }
    _v(str) {
        return {
            text: str,
            type: 'text'
        };
    }
    $createElement(tag, attrMap, children) {
        var _tag, _attrMap, _children;
        _tag = tag;
        if (Array.isArray(attrMap)) {
            _children = attrMap;
        }
        else {
            _attrMap = attrMap;
        }
        if (Array.isArray(children)) {
            _children = children;
        }
        var ret = {
            tag: _tag,
            type: 'element',
            attrMap: _attrMap || {},
            children: _children || []
        };
        return ret;
    }
}
exports.StaticRender = StaticRender;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljUmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3N0YXRpY1JlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBa0M7QUFDbEMsTUFBTSxTQUFTLEdBQUcsQ0FBRSxNQUFNLEVBQUMsSUFBSSxFQUFDLElBQUksRUFBQyxLQUFLLEVBQUMsT0FBTyxFQUFDLEtBQUssRUFBQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sRUFBQyxPQUFPLEVBQUMsUUFBUSxFQUFDLFFBQVEsRUFBQyxRQUFRLENBQUMsQ0FBQTtBQWVsSCxNQUFhLFlBQVk7SUFHckIsWUFBYSxVQUFtQjtRQUZoQyxVQUFLLEdBQUcsRUFBRSxDQUFBO1FBR04sSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsTUFBTTtRQUNGLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUcsQ0FBQTtRQUM3QixVQUFVO1FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLEtBQUssR0FBRyxrQkFBSSxDQUFDLEtBQUssRUFBQyxFQUFDLGlCQUFpQixFQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQixPQUFPLEtBQUssQ0FBQTtJQUNoQixDQUFDO0lBQ0QsTUFBTSxDQUFFLElBQVM7UUFDYixJQUFHLElBQUksQ0FBQyxJQUFJLElBQUksTUFBTTtZQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtRQUN2QyxJQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDO1lBQ2pD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