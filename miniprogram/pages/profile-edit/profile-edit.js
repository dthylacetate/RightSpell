const db = wx.cloud.database();

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
    styles: '', 
    gear: '',   
    bio: '',

    // ✨ 新增：设备图片本地预览列表
    gearImagesLocal: [] 
  },

  onLoad() {
    this.loadUserData();
  },

  // 0. 自动回填已有资料
  loadUserData() {
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
          bio: user.bio || '',
          // 回填已有的云端图片路径到预览列表
          gearImagesLocal: user.gearImages || []
        });
      }
      wx.hideLoading();
    });
  },

  // --- 1. 图片管理逻辑 ---

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  // 选择设备图片
  chooseGearImages() {
    const currentCount = this.data.gearImagesLocal.length;
    wx.chooseMedia({
      count: 3 - currentCount, // 动态计算剩余可传张数
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          gearImagesLocal: [...this.data.gearImagesLocal, ...newPaths]
        });
      }
    })
  },

  // 预览本地图片
  previewLocalImg(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.gearImagesLocal
    })
  },

  // 删除已选图片
  deleteImg(e) {
    const index = e.currentTarget.dataset.index;
    let list = this.data.gearImagesLocal;
    list.splice(index, 1);
    this.setData({ gearImagesLocal: list });
  },

  // --- 2. 输入监听 ---

  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  changeYears(e) { this.setData({ years: this.data.yearOptions[e.detail.value] }) },
  inputCampus(e) { this.setData({ campus: e.detail.value }) },
  inputStyles(e) { this.setData({ styles: e.detail.value }) },
  inputGear(e) { this.setData({ gear: e.detail.value }) },
  inputBio(e) { this.setData({ bio: e.detail.value }) },

  // --- 3. 核心：提交与上传逻辑 ---

  // 封装单个文件上传的 Promise
  uploadFilePromise(folder, filePath) {
    // 如果已经是云端路径，直接返回
    if (filePath.startsWith('cloud://')) return Promise.resolve(filePath);
    
    const extension = filePath.split('.').pop();
    const cloudPath = `${folder}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;
    
    return wx.cloud.uploadFile({
      cloudPath,
      filePath
    }).then(res => res.fileID);
  },

  // 终极提交函数
  async submitProfile() {
    const { avatarUrl, nickname, instrument, campus, years, styles, gear, bio, gearImagesLocal } = this.data;

    if (!nickname || !instrument) {
      wx.showToast({ title: '昵称和乐器必填哦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '名片同步中...' });

    try {
      // 🚀 A. 并发处理所有图片上传
      // 1. 头像任务
      const avatarTask = this.uploadFilePromise('avatars', avatarUrl);
      
      // 2. 设备图片任务阵列
      const gearTasks = gearImagesLocal.map(path => this.uploadFilePromise('gears', path));

      // 3. 等待所有任务完成
      const [finalAvatar, ...finalGearImages] = await Promise.all([avatarTask, ...gearTasks]);

      // 🚀 B. 存入数据库
      await this.saveToDatabase(finalAvatar, nickname, instrument, campus, years, styles, gear, bio, finalGearImages);
      
      this.finishSave();
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '资料同步失败', icon: 'none' });
    }
  },

  saveToDatabase(finalAvatar, nickname, instrument, campus, years, styles, gear, bio, gearImages) {
    const openid = wx.getStorageSync('userOpenId');
    const dataPack = {
      avatarUrl: finalAvatar,
      nickname,
      instrument,
      campus,
      years,
      styles,
      gear,
      bio,
      gearImages, // ✨ 存入图片数组
      updateTime: db.serverDate()
    };

    return db.collection('users').where({ _openid: openid }).get().then(res => {
      if (res.data.length > 0) {
        return db.collection('users').doc(res.data[0]._id).update({ data: dataPack });
      } else {
        return db.collection('users').add({ data: { ...dataPack, createTime: db.serverDate() } });
      }
    });
  },

  finishSave() {
    wx.hideLoading();
    wx.showToast({ title: '名片更新成功！', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1500);
  }
})