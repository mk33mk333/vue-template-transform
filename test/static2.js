{
    render: function () {
        var t = this,
            e = t.$createElement,
            i = t._self._c || e;
        return t.selectTransition ? i("div", {
            staticClass: "leftEject"
        }, [i("div", {
            staticClass: "cont"
        }, [i("div", {
            staticClass: "title"
        }, t._l(t.category, function (e, s) {
            return i("a", {
                key: s,
                class: {
                    on: t.categoryIndex == s
                },
                on: {
                    click: function (e) {
                        t.categoryClick(s)
                    }
                }
            }, [t._v(t._s(e.name))])
        })), t._v(" "), 0 == t.categoryIndex ? i("div", {
            staticClass: "list clearfix"
        }, t._l(t.animations, function (e, s) {
            return i("div", {
                key: s,
                staticClass: "part",
                class: {
                    on: t.selectTransition.type == e.key
                },
                on: {
                    click: function (i) {
                        t.changeTransition(e)
                    }
                }
            }, [i("div", {
                staticClass: "cont"
            }, [i("img", {
                attrs: {
                    src: e.coverImageUrl
                }
            })])])
        })) : t._e(), t._v(" "), i("div", {
            directives: [{
                name: "show",
                rawName: "v-show",
                value: t.request,
                expression: "request"
            }],
            staticStyle: {
                width: "100%",
                "text-align": "center"
            }
        }, [i("spin")], 1)]), t._v(" "), t._m(0)]) : t._e()
    },
    staticRenderFns: [function () {
        var t = this.$createElement,
            e = this._self._c || t;
        return e("div", {
            staticClass: "btn on"
        }, [e("i", {
            staticClass: "icon iconfont"
        }),e("span", [this._v("下载")])])
    }]
}