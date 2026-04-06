const util = require('../../utils/util.js');

Page({
  data: {
    forumList: []
  },

  onShow() {
    this.getForumPosts(); // 每次切到这个 Tab 页都刷新数据
  },

  // 获取讨论帖列表
  // 获取讨论帖列表
getForumPosts() {
  const db = wx.cloud.database();
  
  db.collection('forum')
    .orderBy('createTime', 'desc') // 1. 增加排序，最新的在上
    .get({
      success: res => {
        // 2. ✨ 核心修改：通过 map 循环，给每一条数据塞进一个 dateStr
        const formattedList = res.data.map(item => {
          if (item.createTime) {
            // 将数据库的 Date 对象通过 util 工具类转为“2026/04/06 14:49:00”
            item.dateStr = util.formatTime(new Date(item.createTime));
          } else {
            item.dateStr = '刚刚'; // 兜底处理
          }
          return item;
        });

        // 3. 将加工后的列表渲染到页面
        this.setData({
          forumList: formattedList
        });
        
        console.log("时间格式化成功：", formattedList);
      },
      fail: err => {
        console.error("获取讨论帖失败", err);
      }
    })
},

  // ✨ 新增：全站统一的头像点击跳转
  goToProfile(e) {
    const openid = e.currentTarget.dataset.openid;
    if (openid) {
      wx.navigateTo({
        url: `/pages/profile-detail/profile-detail?openid=${openid}`
      });
    }
  },

  // 点击发帖按钮（保持拦截功能）
  goToPublishForum() {
    const openid = wx.getStorageSync('userOpenId');
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '参与讨论需要先验证身份哦，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/mine/mine' });
          }
        }
      });
      return; 
    }
    wx.navigateTo({
      url: '/pages/forum-publish/forum-publish',
    });
  },

  // 进入详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum-detail/forum-detail?id=${id}`,
    })
  }
})