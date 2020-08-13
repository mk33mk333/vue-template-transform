"use strict";
// 模块入口
// {render:,staticRender:}
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const staticRender_1 = require("./staticRender");
const render_1 = require("./render");
function transform(str) {
    var func = new Function(`return ${str}`);
    var obj = func();
    var staticTpls = [];
    if (obj.staticRenderFns) {
        console.log('解析静态模板');
        obj.staticRenderFns.forEach((func) => {
            var sr = new staticRender_1.StaticRender(func);
            var tpl = sr.render();
            staticTpls.push(tpl);
        });
    }
    if (obj.render) {
        console.log('解析动态模板');
        // 组成符合js语法的函数表达式
        var renderStr = 'var _renderFunc = ' + obj.render.toString();
        // console.log(renderStr)
        var r = new render_1.Render(renderStr, staticTpls);
        var tpl = r.render();
        return tpl;
    }
    else {
        throw new Error("输入内容错误，没有 render 函数");
    }
}
exports.transform = transform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU87QUFDUCwwQkFBMEI7OztBQUUxQixpREFBbUQ7QUFDbkQscUNBQWtDO0FBRWxDLFNBQWdCLFNBQVMsQ0FBRSxHQUFVO0lBQ2pDLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxDQUFFLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUN6QyxJQUFJLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztJQUNqQixJQUFJLFVBQVUsR0FBWSxFQUFFLENBQUM7SUFDN0IsSUFBRyxHQUFHLENBQUMsZUFBZSxFQUFDO1FBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDckIsR0FBRyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFhLEVBQUUsRUFBRTtZQUMxQyxJQUFJLEVBQUUsR0FBRyxJQUFJLDJCQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0IsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3JCLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7S0FDTDtJQUNELElBQUcsR0FBRyxDQUFDLE1BQU0sRUFBQztRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDckIsaUJBQWlCO1FBQ2pCLElBQUksU0FBUyxHQUFHLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDNUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxHQUFHLElBQUksZUFBTSxDQUFDLFNBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztRQUN6QyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDcEIsT0FBTyxHQUFHLENBQUE7S0FDYjtTQUFJO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0tBQ3pDO0FBRUwsQ0FBQztBQXhCRCw4QkF3QkMifQ==