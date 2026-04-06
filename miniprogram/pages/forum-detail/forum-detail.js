const util = require('../../utils/util.js');

Page({
  data: {
    post: null,
    commentList: [],
    commentContent: ''
  },

  onLoad(options) {
    this.postId = options.id;
    if (this.postId) {
      this.getPostDetail();
      this.getComments();
    }
  },

  // 获取帖子详情
  getPostDetail() {
    wx.cloud.database().collection('forum').doc(this.postId).get({
      success: res => { this.setData({ post: res.data }) }
    })
  },

  // 获取评论列表 (带时间格式化)
  getComments() {
    wx.cloud.database().collection('comments')
      .where({ postId: this.postId })
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          const list = res.data.map(item => {
            item.dateStr = util.formatTime(item.createTime);
            return item;
          });
          this.setData({ commentList: list });
        }
      })
  },

  inputComment(e) { this.setData({ commentContent: e.detail.value }) },

  // === 核心修改：带安检的留言提交 ===
  submitComment() {
    const content = this.data.commentContent.trim();
    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '安全检测中...' });

    // 1. 发起安检“闯关”
    wx.cloud.callFunction({
      name: 'checkContent',
      data: { content: content }
    }).then(res => {
      // 2. 判断安检结果
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '回复内容包含违规信息，请修改。',
          showCancel: false
        });
      } else {
        // 3. 只有检测通过，才执行真正的存入数据库
        this.doRealSubmitComment(content);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '检测服务繁忙', icon: 'none' });
    })
  },




  goToProfile(e) {
    const openid = e.currentTarget.dataset.openid;
    if (openid) {
      wx.navigateTo({
        url: `/pages/profile-detail/profile-detail?openid=${openid}`
      });
    }
  },



  // 真正的数据库写入逻辑
  doRealSubmitComment(content) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    db.collection('users').where({ _openid: openid }).get().then(res => {
      const user = res.data[0] || { nickname: "匿名乐手", avatarUrl: "" };

      db.collection('comments').add({
        data: {
          postId: this.postId,
          content: content,
          authorName: user.nickname,
          authorAvatar: user.avatarUrl,
          createTime: db.serverDate()
        },
        success: () => {
          this.setData({ commentContent: '' }); // 发送成功后清空
          this.getComments(); // 刷新列表
          
          // 更新 forum 集合里的评论数
          db.collection('forum').doc(this.postId).update({
            data: { commentCount: db.command.inc(1) }
          });
          
          wx.hideLoading();
          wx.showToast({ title: '回复成功' });
        }
      })
    })
  }
})