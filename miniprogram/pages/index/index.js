const app = getApp()

Page({
  data: {
    postList: [],
    currType: '',         // 当前类型：'' (全部), '招募乐手', '个人求组队'
    currInstrument: '',   // 当前选中的乐器
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'], 
  },

  onShow() {
    // 每次进入页面刷新数据
    this.getPosts();
  },

  // ✨ 筛选逻辑：点击类型
  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    console.log('✅ 类型切换为:', type || '全部');
    this.setData({ currType: type }, () => {
      this.getPosts(); // 确保状态更新后再查询
    });
  },

  // ✨ 筛选逻辑：点击乐器
  filterByIns(e) {
    const ins = e.currentTarget.dataset.ins;
    console.log('✅ 乐器切换为:', ins || '全乐器');
    this.setData({ currInstrument: ins }, () => {
      this.getPosts(); 
    });
  },

  // 🚀 核心：数据库获取函数
  getPosts() {
    const db = wx.cloud.database();
    const { currType, currInstrument } = this.data;

    // 1. 动态构建查询条件
    let queryObj = {};
    if (currType) {
      queryObj.type = currType;
    }
    if (currInstrument) {
      // ⚠️ 注意：请确保你数据库里的字段名确实叫 instrument
      queryObj.instrument = currInstrument; 
    }

    console.log('📡 正在请求云数据库，查询条件:', JSON.stringify(queryObj));
    wx.showLoading({ title: '找帖子中...' });

    // 2. 执行查询
    db.collection('posts')
      .where(queryObj)
      .orderBy('createTime', 'desc') 
      .get({
        success: res => {
          console.log('📥 成功拉取数据:', res.data.length, '条');
          this.setData({
            postList: res.data
          });
          wx.hideLoading();
        },
        fail: err => {
          console.error("❌ 数据库获取失败:", err);
          wx.hideLoading();
          wx.showToast({ title: '网络异常', icon: 'none' });
        }
      })
  },

  // 跳转到发布页
  goToPublish() {
    const openid = wx.getStorageSync('userOpenId');
    if (!openid) {
      wx.showModal({
        title: '身份验证',
        content: '发布招募需要登录哦，现在去登录吗？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/mine/mine' });
          }
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${id}` });
    }
  }
})