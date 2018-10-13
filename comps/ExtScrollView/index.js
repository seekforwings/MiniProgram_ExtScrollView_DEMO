/*
 1. touch-start > touch-move... > scroll... > [touch-move... > scroll...] > touch-move... > touch-end > [scroll...]
 2. ... > touch-move > disallowScrollY > touch-move... > disallowScrollYDone > ...
 */
Component({
  options: {
    multipleSlots: true
  },

  properties: {
    headerHeight: {
      type: Number,
      value: 200
    },
    footerHeight: {
      type: Number,
      value: 200
    },
  },

  data: {
    className: '',
    animationData: {},
    allowScrollY: true,
    scrollTop: 0,
    headerHeight: 0,
    footerHeight: 0,
  },

  created() {
    this.$data = {}

    let animation = wx.createAnimation({
      duration: 0,
      timingFunction: 'linear'
    })
    this.$data.animation = animation

    // scroll-view
    this.$data.realAllowScrollY = true // setData will syncly set this.data, but view's property will be set asyncly
    this.$data.scrolledAfterTouchStart = false
    this.$data.scrollToTop = true// as this.data.scrollTop = 0
    this.$data.scrollToBottom = false
    this.$data.lastScrollTop = 0

    // view#touch-move
    this.$data.touchStarted = false
    this.$data.firstTouchY = 0
    this.$data.lastMovedDeletaY = 0
    this.$data.lastMovedAnimationOrigianlDeltaY = 0

    this.$data.performingAnimation = false// use animation to fluently translate the root-view
    this.$data.needPerformAutoAnimation = false// auto hide the header/footer or show them completly
    this.$data.headerShown = false
    this.$data.footerShown = false

    this.setData({
      headerHeight: this.properties.headerHeight,
      footerHeight: this.properties.footerHeight,
    })
  },

  methods: {
    onScroll(e) {
      if (!this.data.allowScrollY) {
        this.setData({
          scrollTop: this.$data.lastScrollTop
        })
        return
      }
      if (!this.$data.touchStarted && (this.$data.scrollToTop || this.$data.scrollToBottom)) {
        // ios's falling back is unable to disable yet
        // ios should act like this: onscroll[scrolltop:4->1->0]->onscrolltoupper->onscroll[-1 -> -3 -> -8 -> ... -> -2 -> 0]
        // but after tested: onscroll[scrolltop:4->0 -> -3]->onscrolltoupper->onscroll[-8 -> ... -> -2 -> 0]
        // this make it really hard to handle the scrolling state well. I can only say: fuck the mather wechat
       
        // once it has scrolled to top/bottom without touch-started, it should be the falling-back action above.
        // but when touch-start while it is in falling-back action, it seems to show the header/footer very soon.
        // I think wechat may have to provide the scroll-view's falling-back disability.
        return
      }
      this.$data.scrolledAfterTouchStart = true
      this.$data.scrollToTop = false
      this.$data.scrollToBottom = false
      this.$data.lastScrollTop = e.detail.scrollTop
    },

    onScrollToUpper(e) {
      this.$data.scrollToTop = true
      this.$data.scrollToBottom = false
    },

    onScrollToLower(e) {
      this.$data.scrollToTop = false
      this.$data.scrollToBottom = true
    },

    touchstart(ev) {
      // avoid touchStarted when it is still performing any animation
      if (this.$data.performingAnimation) { return }
      // we should make sure that scoll-view set data.allowScrollY done before we can translate the root-view
      // otherwise, scroll-view may keep scrolling after we have translated the root-view
      if (this.data.allowScrollY ^ this.$data.realAllowScrollY) { return }

      this.$data.touchStarted = true
      this.$data.firstTouchY = parseInt(ev.touches[0].clientY)
      // this.$data.lastMovedDeletaY = 0
      // this.$data.lastMovedAnimationOrigianlDeltaY = 0

      this.$data.scrolledAfterTouchStart = false
    },
    touchmove(ev) {
      if (!this.$data.touchStarted) { return }

      let moveDeltaY = parseInt(ev.touches[0].clientY) - this.$data.firstTouchY
      // update this.$data.lastMovedDeltaY in real-time, try to translate the root-view correctly
      if (this.data.allowScrollY) {
        this.$data.lastMovedDeletaY = moveDeltaY
      } else {
        let deltaY = moveDeltaY
        let minMoveDeltaY = 0
        if (this.$data.scrollToTop) {
          let maxMoveDeltaY = this.properties.headerHeight
          if (this.$data.headerShown) {
            minMoveDeltaY = this.properties.headerHeight
          }
          deltaY = moveDeltaY + minMoveDeltaY
          if (deltaY < 0) {
            deltaY = 0
          } else if (deltaY > maxMoveDeltaY) {
            deltaY = maxMoveDeltaY
          }
        } else if (this.$data.scrollToBottom) {
          let maxMoveDeltaY = -this.properties.footerHeight
          if (this.$data.footerShown) {
            minMoveDeltaY = -this.properties.footerHeight
          }
          deltaY = moveDeltaY + minMoveDeltaY
          if (deltaY > 0) {
            deltaY = 0
          } else if (deltaY < maxMoveDeltaY) {
            deltaY = maxMoveDeltaY
          }
        }
        this.$data.lastMovedDeletaY = deltaY
      }

      // user may just want to goto the top of the scroll-view content
      // users may not like to trigger pulldown when they are scrolling to read the list
      // so I think it is best to trigger it when touch-move without scrolling ever before
      if (this.$data.scrolledAfterTouchStart) { return }

      // check if need to disallow the scrollY of the scroll-view
      if (
        this.data.allowScrollY &&
        ((this.$data.scrollToTop && moveDeltaY > 0)// pull down on top
          || (this.$data.scrollToBottom && moveDeltaY < 0)))// pull up on bottom
      {
        this.setData({ allowScrollY: false }, () => { this.$data.realAllowScrollY = false })
      }

      if (!this.data.allowScrollY) {
        this.performAnimationIfNeed()
      }
    },

    touchend(ev) {
      if (!this.$data.touchStarted) { return }
      this.$data.touchStarted = false

      if (!this.data.allowScrollY && !this.$data.needPerformAutoAnimation) {
        this.$data.needPerformAutoAnimation = true
        this.performAnimationIfNeed()
      }
    },

    performAnimationIfNeed() {
      if (this.$data.performingAnimation) {
        return
      }
      if (this.$data.needPerformAutoAnimation) {
        // if need perform auto animation, bandon other animation
        this.$data.performingAnimation = true
        setTimeout(() => {
          let translatedY = 0
          if (this.$data.scrollToTop) {
            if (this.$data.lastMovedDeletaY > this.properties.headerHeight / 2) {
              translatedY = this.properties.headerHeight
            }
          } else {
            if (-this.$data.lastMovedDeletaY > this.properties.footerHeight / 2) {
              translatedY = -this.properties.footerHeight
            }
          }
          this.processAnimation(translatedY, 320, 'easy-out')
          setTimeout(() => {
            this.processAnimation(translatedY, 0)
            this.$data.needPerformAutoAnimation = false
            this.$data.performingAnimation = false
            this.$data.headerShown = false
            this.$data.footerShown = false
            if (translatedY == 0) {
              this.setData({ allowScrollY: true }, () => { this.$data.realAllowScrollY = true })
            } else {
              if (translatedY > 0) {
                this.$data.headerShown = true
              } else {
                this.$data.footerShown = true
              }
            }
          }, 320)
        }, 10)
        return
      }

      // handle the other animations
      if (this.$data.lastMovedAnimationOrigianlDeltaY != this.$data.lastMovedDeletaY) {
        this.$data.lastMovedAnimationOrigianlDeltaY = this.$data.lastMovedDeletaY
        this.$data.performingAnimation = true
        setTimeout(() => {
          this.processAnimation(this.$data.lastMovedAnimationOrigianlDeltaY, 160)
          setTimeout(() => {
            this.$data.performingAnimation = false
            this.performAnimationIfNeed()
          }, 160)
        }, 10)
      }
    },

    processAnimation(translatedY, duration, timingFunction = 'linear') {
      this.$data.animation.translateY(translatedY).step({ duration: duration, timingFunction: timingFunction })
      this.setData({ animationData: this.$data.animation.export() })
    }
  }
})
