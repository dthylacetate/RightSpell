const util = require('../../utils/util.js');

Page({
  data: {
    myPosts: []
  },

  onShow() {
    this.fetchMyPosts();
  },

  // 1. 只拉取自己的帖子
  fetchMyPosts() {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    wx.showLoading({ title: '加载中...' });

    db.collection('posts')
      .where({
        _openid: openid // 云开发会自动处理 openid 权限，非常安全
      })
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          const list = res.data.map(item => {
            item.dateStr = util.formatTime(item.createTime);
            return item;
          });
          this.setData({ myPosts: list });
          wx.hideLoading();
        }
      })
  },

  // 2. 删除帖子功能
  deletePost(e) {
    const { id, title } = e.currentTarget.dataset;
    const db = wx.cloud.database();

    wx.showModal({
      title: '确认删除？',
      content: `确定要删除“${title}”吗？此操作不可撤销。`,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在删除...' });
          
          // 调用云数据库删除
          db.collection('posts').doc(id).remove({
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已删除', icon: 'success' });
              this.fetchMyPosts(); // 刷新列表
            },
            fail: err => {
              console.error("删除失败", err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          })
        }
      }
    })
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${e.currentTarget.dataset.id}` });
  },

  navToPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  }
})