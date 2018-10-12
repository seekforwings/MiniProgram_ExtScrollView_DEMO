//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
    items: [],
    scrollTop: 0,
    test: true,
    animationData: null,
  },

  onLoad() {
    let items = []
    for (let i = 0; i < 7; ++i) {
      items.push({ title: 'test' })
    }
    this.setData({
      items: items
    })

    if (!this.data.test) {
      let animation = wx.createAnimation({
        duration: 0,
        timingFunction: 'linear'
      })
      this.$data = {
        animation: animation
      }
      animation.translateY(1).step()
      this.setData({
        animationData: this.$data.animation.export()
      })

      setTimeout(() => {
        this.$data.animation.translateY(100).step({ duration: 0 })
        this.setData({
          animationData: this.$data.animation.export(),
        })
        // setTimeout(() => {
        //   this.$data.animation.translateY(0).step({ duration: 0 })
        //   this.setData({
        //     animationData: this.$data.animation.export(),
        //   })
        // }, 1000) 
      }, 2000)

      // setTimeout(() => {
      //   this.$data.animation.translateY(0).step({ duration: 1000 })
      //   this.setData({
      //     animationData: this.$data.animation.export(),
      //   })
      // }, 5000)
    }
  },

  lower(index) {
    console.log(index)
  },
  onScroll(e) {
    console.log(e)
    if (e.detail.scrollTop === 0) {
      this.setData({
        scrollTop: e.detail.scrollTop,
      })
    }
  },
  onScrollToUpper(e) {
    console.log(e)
    this.setData({
      scrollTop: 0,
    })
  },
  handleRefreshEvent(e) {
    console.log(e)
  }
})
