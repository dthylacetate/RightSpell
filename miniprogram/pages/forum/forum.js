Page({
  data: {
    forumList: []
  },

  onShow() {
    this.getForumPosts(); // 每次切到这个 Tab 页都刷新数据
  },

  // 获取讨论帖列表
  getForumPosts() {
    const db = wx.cloud.database();
    
    db.collection('forum')
      // 如果你之后加了 createTime 字段，可以在这里加上 .orderBy('createTime', 'desc')
      .get({
      success: res => {
        this.setData({
          forumList: res.data
        });
      },
      fail: err => {
        console.error("获取讨论帖失败", err);
      }
    })
  },

  // 点击发帖按钮，带有登录拦截功能
  goToForumPublish() {
    const openid = wx.getStorageSync('userOpenId');
    
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '参与讨论需要先验证身份哦，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/mine/mine'
            });
          }
        }
      });
      return; 
    }

    // 这里我们将跳到一个新的专门用于发讨论帖的页面
    wx.navigateTo({
      url: '/pages/forum-publish/forum-publish',
    });
  },

  goToDetail(e) 
  {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum-detail/forum-detail?id=${id}`,
    })
  }





})