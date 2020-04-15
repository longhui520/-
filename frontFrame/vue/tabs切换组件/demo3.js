function windowInit() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame']; // name has changed in Webkit
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16.7 - (currTime - lastTime));
            var interval = currTime - lastTime;
            var id = window.setTimeout(function() {
                callback(interval);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}
Vue.component('LyTabItem', {
    name: 'LyTabItem',
    computed: {
        activeStyle() {
            return {
                color: this.$parent.activeColor
            };
        }
    },
    data() {
        return {
            id: (this.$parent.$children.length || 1) - 1
        };
    },
    methods: {
        onItemClicked() {
            this.$parent.$emit('input', this.id);
        }
    },
    template: `<a
         class="ly-tab-item"
        :style="$parent.value === id ? activeStyle : {}"
        @click="onItemClicked">
            <div class="ly-tab-item-icon" v-if="$parent.fixBottom">
                <slot name="icon"></slot>
            </div>
            <div class="ly-tab-item-label">
                 <slot></slot>
            </div>
        </a>
      `
});

Vue.component('LyTabbar', {
    name: 'LyTabbar',
    props: {
        lineWidth: {
            type: Number,
            default: 3
        },
        activeColor: {
            type: String,
            default: 'red'
        },
        fixBottom: {
            type: Boolean,
            default: false
        },
        value: {
            type: Number,
            default: 0
        },

        // 近似等于超出边界时最大可拖动距离(px);
        additionalX: {
            type: Number,
            default: 50
        },
        // 惯性回弹指数(值越大，幅度越大，惯性回弹距离越长);
        reBoundExponent: {
            type: Number,
            default: 10,
            validator(value) {
                return value > 0;
            }
        },
        // 灵敏度(惯性滑动时的灵敏度,值越小，阻力越大),可近似认为速度减为零所需的时间(ms);
        sensitivity: {
            type: Number,
            default: 1000,
            validator(value) {
                return value > 0;
            }
        },
        // 回弹过程duration;
        reBoundingDuration: {
            type: Number,
            default: 360
        }
    },

    data() {
        return {
            activeBarX: 0,
            activeBarWidth: 0,
            speed: 0, // 滑动速度(正常滑动时一般不会超过10);
            touching: false, // 是否处于touch状态;
            reBounding: false, // 是否处于回弹过程;
            translateX: 0,
            startX: 0,
            lastX: 0,
            currentX: 0,
            startMoveTime: 0,
            endMoveTime: 0,
            frameTime: 16.7, // 每个动画帧的ms数
            frameStartTime: 0,
            frameEndTime: 0,
            inertiaFrame: 0,
            zeroSpeed: 0.001, // 当speed绝对值小于该值时认为速度为0 (可用于控制惯性滚动结束期的顺滑度)
            acceleration: 0 // 惯性滑动加速度;
        };
    },

    computed: {
        style() {
            if (this.fixBottom) return {};
            return {
                transitionTimingFunction: this.transitionTimingFunction,
                transitionDuration: `${this.transitionDuration}ms`,
                transform: `translate3d(${this.translateX}px, 0px, 0px)`
            };
        },
        activeBarStyle() {
            return {
                transition: `all 300ms`,
                width: `${this.activeBarWidth}px`,
                height: `${this.lineWidth}px`,
                transform: `translate3d(${this.activeBarX}px, 0, 0)`,
                backgroundColor: this.activeColor
            };
        },
        transitionDuration() {
            if (this.touching || (!this.reBounding && !this.touching)) {
                return 0;
            }
            if (this.reBounding && !this.touching) {
                return this.reBoundingDuration;
            }
        },
        transitionTimingFunction() {
            return this.reBounding ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'cubic-bezier(0.1, 0.57, 0.1, 1)';
        },
        // 可视区宽度;
        viewAreaWidth() {
            return this.$refs.viewArea.offsetWidth;
        },
        // 可视区与可滑动元素宽度差值;
        listWidth() {
            return this.$refs.list.offsetWidth - this.viewAreaWidth;
        },
        // 是否向左惯性滚动;
        isMoveLeft() {
            return this.currentX <= this.startX;
        },
        isMoveRight() {
            return this.currentX >= this.startX;
        }
    },

    watch: {
        value() {
            this.checkPosition();
            this.calcBarPosX();
        }
    },

    mounted() {
        this.bindEvent();
        this.checkPosition();
        this.calcBarPosX();
        windowInit();
    },

    destoryed() {
        this.removeEvent();
    },

    methods: {
        // start
        handleTouchStart(event) {
            event.stopPropagation();
            cancelAnimationFrame(this.inertiaFrame);
            this.lastX = event.touches[0].clientX;
        },

        // move
        handleTouchMove(event) {
            if (this.listWidth <= 0) return;
            event.preventDefault();
            event.stopPropagation();
            this.touching = true;
            this.startMoveTime = this.endMoveTime;
            this.startX = this.lastX;
            this.currentX = event.touches[0].clientX;
            this.moveFollowTouch();
            this.endMoveTime = event.timeStamp; // 每次触发touchmove事件的时间戳;
        },

        // end
        handleTouchEnd(event) {
            this.touching = false;
            if (this.checkReboundX()) {
                cancelAnimationFrame(this.inertiaFrame);
            } else {
                let silenceTime = event.timeStamp - this.endMoveTime;
                let timeStamp = this.endMoveTime - this.startMoveTime;
                timeStamp = timeStamp > 0 ? timeStamp : 8;
                if (silenceTime > 100) return; // 停顿时间超过100ms不产生惯性滑动;
                this.speed = (this.lastX - this.startX) / timeStamp;
                this.acceleration = this.speed / this.sensitivity;
                this.frameStartTime = new Date().getTime();
                this.inertiaFrame = requestAnimationFrame(this.moveByInertia);
            }
        },

        // 如果需要回弹则进行回弹操作并返回true;
        checkReboundX() {
            this.reBounding = false;
            if (this.translateX > 0) {
                this.reBounding = true;
                this.translateX = 0;
            } else if (this.translateX < -this.listWidth) {
                this.reBounding = true;
                this.translateX = -this.listWidth;
            }
            return this.translateX === 0 || this.translateX === -this.listWidth;
        },

        bindEvent() {
            this.$el.addEventListener('touchstart', this.handleTouchStart, false);
            this.$el.addEventListener('touchmove', this.handleTouchMove, false);
            this.$el.addEventListener('touchend', this.handleTouchEnd, false);
        },

        removeEvent() {
            this.$el.removeEventListener('touchstart', this.handleTouchStart);
            this.$el.removeEventListener('touchmove', this.handleTouchMove);
            this.$el.removeEventListener('touchend', this.handleTouchEnd);
        },

        // touch拖动
        moveFollowTouch() {
            if (this.isMoveLeft) {
                // 向左拖动
                if ((this.translateX <= 0 && this.translateX + this.listWidth > 0) || this.translateX > 0) {
                    this.translateX += this.currentX - this.lastX;
                } else if (this.translateX + this.listWidth <= 0) {
                    this.translateX += (this.additionalX * (this.currentX - this.lastX)) / (this.viewAreaWidth + Math.abs(this.translateX + this.listWidth));
                }
            } else {
                // 向右拖动
                if (this.translateX >= 0) {
                    this.translateX += (this.additionalX * (this.currentX - this.lastX)) / (this.viewAreaWidth + this.translateX);
                } else if ((this.translateX <= 0 && this.translateX + this.listWidth >= 0) || this.translateX + this.listWidth <= 0) {
                    this.translateX += this.currentX - this.lastX;
                }
            }
            this.lastX = this.currentX;
        },

        // 惯性滑动
        moveByInertia() {
            this.frameEndTime = new Date().getTime();
            this.frameTime = this.frameEndTime - this.frameStartTime;
            if (this.isMoveLeft) {
                // 向左惯性滑动;
                if (this.translateX <= -this.listWidth) {
                    // 超出边界的过程;
                    // 加速度指数变化;
                    this.acceleration *= (this.reBoundExponent + Math.abs(this.translateX + this.listWidth)) / this.reBoundExponent;
                    this.speed = Math.min(this.speed - this.acceleration, 0); // 为避免减速过程过短，此处加速度没有乘上frameTime;
                } else {
                    this.speed = Math.min(this.speed - this.acceleration * this.frameTime, 0);
                }
            } else if (this.isMoveRight) {
                // 向右惯性滑动;
                if (this.translateX >= 0) {
                    this.acceleration *= (this.reBoundExponent + this.translateX) / this.reBoundExponent;
                    this.speed = Math.max(this.speed - this.acceleration, 0);
                } else {
                    this.speed = Math.max(this.speed - this.acceleration * this.frameTime, 0);
                }
            }
            this.translateX += (this.speed * this.frameTime) / 2;
            if (Math.abs(this.speed) <= this.zeroSpeed) {
                this.checkReboundX();
                return;
            }
            this.frameStartTime = this.frameEndTime;
            this.inertiaFrame = requestAnimationFrame(this.moveByInertia);
        },

        // 计算activeBar的translateX
        calcBarPosX() {
            if (this.fixBottom || !this.$children.length) return;
            if (this.$children.length <= this.value) return;
            const item = this.$children[this.value].$el;
            const itemWidth = item.offsetWidth;
            const itemLeft = item.offsetLeft;
            this.activeBarWidth = Math.max(itemWidth * 0.6, 14);
            this.activeBarX = itemLeft + (itemWidth - this.activeBarWidth) / 2;
        },

        // 点击切换item时，调整位置使当前item尽可能往中间显示
        checkPosition() {
            if (this.fixBottom || !this.$children.length) return;
            if (this.$children.length <= this.value) return;
            const activeItem = this.$children[this.value].$el;
            const offsetLeft = activeItem.offsetLeft;
            const half = (this.viewAreaWidth - activeItem.offsetWidth) / 2;
            let changeX = 0;
            const absTransX = Math.abs(this.translateX);
            if (offsetLeft <= absTransX + half) {
                // item偏左，需要往右移
                let pageX = offsetLeft + this.translateX;
                changeX = half - pageX;
            } else {
                // item偏右，需要往左移
                changeX = -(offsetLeft - absTransX - half);
            }
            let lastX = changeX + this.translateX;
            // 两种边界情况
            lastX > 0 && (lastX = 0);
            lastX < -this.listWidth && (lastX = -this.listWidth);
            this.reBounding = true;
            this.translateX = lastX;
        }
    },
    template: `<div class="ly-tabbar"
        :class="{'ly-tabbar-fix-bottom': fixBottom}"
        ref="viewArea">
        <div class="ly-tab-list"
            :style="style"
            ref="list">
        <slot></slot>
        <div class="ly-tab-active-bar"
            v-if="!fixBottom"
            :style="activeBarStyle"
            ref="activeBar">
        </div>
        </div>
    </div>
    `
});
Vue.component('LyTab', {
    name: 'LyTab',
    props: {
        value: {
            type: Number,
            default: 0
        },
        items: {
            type: Array,
            default() {
                return [];
            }
        },
        options: {
            type: Object,
            default() {
                return {};
            }
        }
    },
    data() {
        return {
            selectedId: this.value
        };
    },
    computed: {
        labelKey() {
            return this.options.labelKey || 'label';
        }
    },
    watch: {
        value(value) {
            this.selectedId = value;
        },
        selectedId(value) {
            this.$emit('input', value);
            this.$emit('change', this.items[value], value);
        }
    },
    template: `
    <div class="ly-tab">
        <ly-tabbar
            v-model="selectedId"
            v-bind="options"
        >
            <ly-tab-item
            v-for="(item, index) in items"
            :key="index"
            >
            <span
                v-if="options.fixBottom && item.icon"
                slot="icon">
                <i :class="item.icon"></i>
            </span>
            <span>{{ item[labelKey] }}</span>
            </ly-tab-item>
        </ly-tabbar>
    </div>
    `
});
