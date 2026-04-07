Page({
  data: {
    user: null,
    loading: true
  },

  onLoad(options) {
    // 优先从 options 获取 openid，如果没有（比如自己点自己的名片），可以从缓存拿兜底
    const openid = options.openid || wx.getStorageSync('userOpenId');
    
    console.log("正在查看乐手名片，OpenID:", openid);

    if (openid) {
      this.fetchUserInfo(openid);
    } else {
      wx.showToast({ title: '参数缺失', icon: 'none' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  // 1. 核心：从云端拉取乐手数据
  fetchUserInfo(openid) {
    const db = wx.cloud.database();
    wx.showLoading({ title: '正在探测乐手...' });

    db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        const userData = res.data[0];
        
        // 🛠️ 兼容性处理：确保 gearImages 至少是个空数组，防止 WXML 报错
        if (!userData.gearImages) {
          userData.gearImages = [];
        }

        this.setData({
          user: userData,
          loading: false
        });
      } else {
        wx.showToast({ title: '该乐手还没完善名片哦', icon: 'none' });
        this.setData({ loading: false });
      }
      wx.hideLoading();
    }).catch(err => {
      console.error("拉取资料失败：", err);
      wx.hideLoading();
      wx.showToast({ title: '网络连接失败', icon: 'none' });
    });
  },

  // ✨ 新增：点击设备美照查看大图
  // 这个功能在乐手圈是刚需，方便大家互相“扒”设备参数
  previewGear(e) {
    const currentUrl = e.currentTarget.dataset.url; // 当前被点击的图片
    const allUrls = this.data.user.gearImages;    // 所有的设备图片列表

    if (!allUrls || allUrls.length === 0) return;

    wx.previewImage({
      current: currentUrl, // 当前显示图片的链接
      urls: allUrls,       // 需要预览的图片链接列表
      longPressActions: {
        itemList: ['发送给朋友', '保存图片', '收藏'],
        success: function(data) {
          console.log('用户长按了图片', data);
        }
      }
    });
  },

  // 转发功能（可选）：让用户可以把好乐手的名片转给队长看
  onShareAppMessage() {
    const { user } = this.data;
    return {
      title: user ? `推荐一位超棒的【${user.instrument}】乐手：${user.nickname}` : '发现一位硬核乐手！',
      path: `/pages/profile-detail/profile-detail?openid=${user._openid}`
    }
  }
})