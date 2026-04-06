Page({
  data: {
    // 基础信息
    avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    nickname: '',
    campus: '',
    
    // 乐手核心信息
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'],
    instrument: '',
    yearOptions: ['1年以下', '1-3年', '3-5年', '5-10年', '10年以上'],
    years: '',
    styles: '', // 擅长风格
    gear: '',   // 核心设备
    bio: ''     // 个人简介
  },

  onLoad() {
    this.loadUserData(); // 进来先看看数据库里有没有旧资料
  },

  // 0. 自动回填已有资料
  loadUserData() {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');
    
    wx.showLoading({ title: '加载中...' });
    db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          avatarUrl: user.avatarUrl,
          nickname: user.nickname,
          instrument: user.instrument,
          campus: user.campus || '',
          years: user.years || '',
          styles: user.styles || '',
          gear: user.gear || '',
          bio: user.bio || ''
        });
      }
      wx.hideLoading();
    });
  },

  // 1. 获取用户选择的头像
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  // 2. 输入监听（保持你原有的并增加新字段）
  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  changeYears(e) { this.setData({ years: this.data.yearOptions[e.detail.value] }) },
  inputCampus(e) { this.setData({ campus: e.detail.value }) },
  inputStyles(e) { this.setData({ styles: e.detail.value }) },
  inputGear(e) { this.setData({ gear: e.detail.value }) },
  inputBio(e) { this.setData({ bio: e.detail.value }) },

  // 3. 提交函数
  submitProfile() {
    const { avatarUrl, nickname, instrument, campus, years, styles, gear, bio } = this.data;

    if (!nickname || !instrument) {
      wx.showToast({ title: '昵称和乐器必填哦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '名片同步中...' });

    // 判断是否需要上传新头像（逻辑和你原来一致）
    if (avatarUrl.includes('tmp') || avatarUrl.includes('wxfile')) {
      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
      wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl,
        success: res => {
          this.saveToDatabase(res.fileID, nickname, instrument, campus, years, styles, gear, bio);
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '图片上传失败', icon: 'none' });
        }
      })
    } else {
      this.saveToDatabase(avatarUrl, nickname, instrument, campus, years, styles, gear, bio);
    }
  },

  // 4. 存入数据库
  saveToDatabase(finalAvatar, nickname, instrument, campus, years, styles, gear, bio) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');
    
    // 准备要存的数据包
    const dataPack = {
      avatarUrl: finalAvatar,
      nickname,
      instrument,
      campus,
      years,
      styles,
      gear,
      bio,
      updateTime: db.serverDate() // 记录最后修改时间
    };

    db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: dataPack
        }).then(() => this.finishSave());
      } else {
        db.collection('users').add({
          data: { ...dataPack, createTime: db.serverDate() }
        }).then(() => this.finishSave());
      }
    })
  },

  finishSave() {
    wx.hideLoading();
    wx.showToast({ title: '名片更新成功！', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1500); // 建议用 back，用户体验更连贯
  }
})