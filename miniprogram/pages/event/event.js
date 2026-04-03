Page({
  data: {
    eventList: []
  },

  onShow() {
    this.getEvents(); // 每次点进来都刷新，保证看到最新演出
  },

  getEvents() {
    wx.showLoading({ title: '加载活动中...' });
    const db = wx.cloud.database();
    
    db.collection('events').get({
      success: res => {
        wx.hideLoading();
        this.setData({
          eventList: res.data
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error("获取演出信息失败", err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    })
  }
})