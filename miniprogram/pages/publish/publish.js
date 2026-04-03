Page({
  data: {
    title: '',
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'],
    instrument: '',
    style: '',
    content: '',
    contact: ''
  },

  // 1. 获取输入（保持不变）
  inputTitle(e) { this.setData({ title: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  inputStyle(e) { this.setData({ style: e.detail.value }) },
  inputContent(e) { this.setData({ content: e.detail.value }) },
  inputContact(e) { this.setData({ contact: e.detail.value }) },

  // 2. 第一步：点击发布的入口
  submitPost() {
    const { title, instrument, content } = this.data;
    
    // 基础验证
    if (!title || !instrument || !content) {
      wx.showToast({ title: '核心信息没填全哦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '安全检测中...' });

    // === 调用安全检测云函数 ===
    wx.cloud.callFunction({
      name: 'checkContent',
      data: { content: title + content } 
    }).then(res => {
      // 检查建议结果
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({
          title: '温馨提示',
          content: '内容包含敏感或违规信息，请修改后再试。',
          showCancel: false
        });
      } else {
        // 安全检测通过，进入真正的发布环节
        this.doRealPublish();
      }
    }).catch(err => {
      wx.hideLoading();
      console.error("检测失败", err);
      wx.showToast({ title: '安全检测超时，请重试', icon: 'none' });
    })
  },

  // 3. 第二步：真正的数据库存储逻辑
  doRealPublish() {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    // 拿到名片信息后再存入 posts
    db.collection('users').where({ _openid: openid }).get().then(res => {
      let authorName = "匿名乐手";
      let authorAvatar = "";

      if (res.data.length > 0) {
        authorName = res.data[0].nickname;
        authorAvatar = res.data[0].avatarUrl;
      }

      // 存储到 posts 集合
      db.collection('posts').add({
        data: {
          title: this.data.title,
          instrument: this.data.instrument,
          style: this.data.style,
          content: this.data.content,
          contact: this.data.contact,
          authorName: authorName,
          authorAvatar: authorAvatar,
          commentCount: 0,
          createTime: db.serverDate() // 使用服务器时间
        },
        success: () => {
          wx.hideLoading();
          wx.showToast({ title: '发布成功！', icon: 'success' });
          // 延迟跳转，让用户看一眼成功提示
          setTimeout(() => { wx.navigateBack(); }, 1500);
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '发布失败', icon: 'none' });
        }
      })
    })
  }
})