Page({
  data: {
    user: null,
    loading: true
  },

  onLoad(options) {
    const openid = options.openid;
    if (openid) {
      this.fetchUserInfo(openid);
    }
  },

  fetchUserInfo(openid) {
    const db = wx.cloud.database();
    wx.showLoading({ title: '正在探测乐手...' });

    db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({
          user: res.data[0],
          loading: false
        });
      } else {
        wx.showToast({ title: '该乐手还没完善名片哦', icon: 'none' });
        this.setData({ loading: false });
      }
      wx.hideLoading();
    }).catch(err => {
      console.error(err);
      wx.hideLoading();
    });
  }
})