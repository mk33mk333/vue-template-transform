"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformError = exports.findInCtx = void 0;
// 倒着查找ctx
function findInCtx(ctx, match) {
    var size = ctx.size;
    for (var i = size; i >= 0; i--) {
        var keys = Object.keys(match);
        var count = 0;
        var curCtx = ctx.get(i);
        keys.some(key => {
            if (curCtx != undefined && match[key] == curCtx[key]) {
                count++;
            }
        });
        if (count == keys.length) {
            return { index: i, data: curCtx || {} };
        }
    }
    return { index: -1, data: {} };
}
exports.findInCtx = findInCtx;
class TransformError extends Error {
    constructor(msg, loc) {
        super();
        this.loc = loc;
        this.msg = `${msg}，开始于${loc.start.line}行，${loc.start.column}列，结束于${loc.end.line}行，${loc.end.column}`;
    }
    toString() {
        return this.msg;
    }
}
exports.TransformError = TransformError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBT0EsVUFBVTtBQUNWLFNBQWdCLFNBQVMsQ0FBRSxHQUFpQixFQUFDLEtBQTJCO0lBQ3BFLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztRQUN4QixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUEsRUFBRTtZQUNYLElBQUcsTUFBTSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO2dCQUNoRCxLQUFLLEVBQUcsQ0FBQTthQUNYO1FBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFDO1lBQ3BCLE9BQU8sRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxNQUFNLElBQUUsRUFBRSxFQUFDLENBQUE7U0FDbkM7S0FDSjtJQUNELE9BQU8sRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxDQUFBO0FBQzdCLENBQUM7QUFoQkQsOEJBZ0JDO0FBRUQsTUFBYSxjQUFlLFNBQVEsS0FBSztJQUdyQyxZQUFhLEdBQVUsRUFBQyxHQUEyQjtRQUMvQyxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2QsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3hHLENBQUM7SUFDRCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFBO0lBQ25CLENBQUM7Q0FDSjtBQVhELHdDQVdDIn0=