Page({
  data: {
    // 默认给一个微信的灰色默认头像链接
    avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    nickname: '',
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'],
    instrument: '',
    campus: ''
  },

  // 1. 获取用户选择的头像（此时图片还在手机本地）
  onChooseAvatar(e) {
    this.setData({
      avatarUrl: e.detail.avatarUrl
    })
  },

  // 2. 获取其他输入框的值
  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  inputCampus(e) { this.setData({ campus: e.detail.value }) },

  // 3. 终极提交函数
  submitProfile() {
    const { avatarUrl, nickname, instrument, campus } = this.data;

    if (!nickname || !instrument) {
      wx.showToast({ title: '昵称和乐器必填哦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    // === 核心逻辑 A：判断是否需要上传新头像 ===
    // 如果 avatarUrl 包含 'http://tmp/' 或者 'wxfile://'，说明是新选的本地图片，必须先上传
    if (avatarUrl.includes('tmp') || avatarUrl.includes('wxfile')) {
      const cloudPath = 'avatars/' + Date.now() + '-' + Math.floor(Math.random(0, 1) * 1000) + '.png'; // 随机起个文件名
      
      // 调用云存储 API 上传文件
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl, // 本地文件路径
        success: res => {
          // 上传成功后，拿到云端的 fileID
          this.saveToDatabase(res.fileID, nickname, instrument, campus);
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '图片上传失败', icon: 'none' });
        }
      })
    } else {
      // 没换头像，直接存数据库
      this.saveToDatabase(avatarUrl, nickname, instrument, campus);
    }
  },

  // === 核心逻辑 B：存入 users 数据库 ===
  saveToDatabase(finalAvatar, nickname, instrument, campus) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    // 我们去查一下 users 集合里有没有这个人
    db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        // 如果数据库里已经有他了，就用 update 更新资料
        const docId = res.data[0]._id;
        db.collection('users').doc(docId).update({
          data: { avatarUrl: finalAvatar, nickname, instrument, campus }
        }).then(() => this.finishSave());
      } else {
        // 如果没有，就用 add 新增一条记录
        db.collection('users').add({
          data: { avatarUrl: finalAvatar, nickname, instrument, campus, createTime: db.serverDate() }
        }).then(() => this.finishSave());
      }
    })
  },

  // 4. 保存完成的收尾动作
  finishSave() {
    wx.hideLoading();
    wx.showToast({ title: '名片更新成功！', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/mine/mine' }); // 回到我的页面
    }, 1500);
  }
})