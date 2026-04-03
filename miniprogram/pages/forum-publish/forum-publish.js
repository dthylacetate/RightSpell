// pages/forum-publish/forum-publish.js

Page({
  data: {
    title: '',
    content: ''
  },

  // 1. 实时获取输入内容
  inputTitle(e) {
    this.setData({ title: e.detail.value })
  },
  inputContent(e) {
    this.setData({ content: e.detail.value })
  },

  // 2. 发布按钮的主逻辑（第一阶段：安全校验）
  submitPost() {
    const { title, content } = this.data;

    // 非空校验
    if (!title.trim() || !content.trim()) {
      wx.showToast({
        title: '标题和内容都得填哦',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '内容安全检测中...' });

    // --- 调用云函数：内容安全检测 ---
    wx.cloud.callFunction({
      name: 'checkContent',
      data: {
        content: title + content // 组合标题和正文进行扫描
      }
    }).then(res => {
      // 检查检测结果 (微信 2.0 接口)
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({
          title: '温馨提示',
          content: '发帖内容包含违规或敏感信息，请修改后再试。',
          showCancel: false
        });
      } else {
        // 安全检测通过，进入发布阶段
        this.doRealPublish();
      }
    }).catch(err => {
      wx.hideLoading();
      console.error("检测失败", err);
      wx.showToast({
        title: '检测繁忙，请稍后再试',
        icon: 'none'
      });
    })
  },

  // 3. 发布按钮的主逻辑（第二阶段：实名信息抓取与入库）
  doRealPublish() {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    if (!openid) {
      wx.hideLoading();
      wx.showToast({ title: '登录信息失效', icon: 'none' });
      return;
    }

    // A. 先去查当前用户的“乐手名片”
    db.collection('users').where({
      _openid: openid
    }).get().then(res => {
      let authorName = "匿名乐手";
      let authorAvatar = "";

      // 如果用户完善过资料，就用真实的，否则用默认值
      if (res.data.length > 0) {
        authorName = res.data[0].nickname;
        authorAvatar = res.data[0].avatarUrl;
      }

      // B. 存入讨论区集合
      db.collection('forum').add({
        data: {
          title: this.data.title,
          content: this.data.content,
          authorName: authorName,
          authorAvatar: authorAvatar,
          commentCount: 0,
          createTime: db.serverDate() // 使用服务器时间，方便排序
        },
        success: () => {
          wx.hideLoading();
          wx.showToast({
            title: '发布成功！',
            icon: 'success'
          });
          // 成功后延迟返回，让用户看到提示
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        },
        fail: err => {
          wx.hideLoading();
          console.error("写入数据库失败", err);
          wx.showToast({ title: '发布失败，请重试', icon: 'none' });
        }
      })
    })
  }
})