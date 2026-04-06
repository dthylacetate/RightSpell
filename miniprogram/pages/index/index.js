const app = getApp()

Page({
  data: {
    postList: [],
    currType: '',         // 全部 / 招募乐手 / 个人求组队
    currInstrument: '',   // 全部 / 吉他 / 贝斯...
    searchKey: '',        // ✨ 搜索关键词
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'], 
  },

  onShow() {
    // 每次回到首页都刷新数据，确保看到最新动态
    this.getPosts();
  },

  // --- 1. 搜索逻辑处理 ---

  // 监听输入框文字变化
  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value
    });
  },

  // 清除搜索词并重新加载
  clearSearch() {
    this.setData({ searchKey: '' }, () => {
      this.getPosts();
    });
  },

  // --- 2. 筛选逻辑处理 ---

  // 点击类型（招募/求组队）
  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    console.log('✅ 切换类型为:', type || '全部');
    this.setData({ currType: type }, () => {
      this.getPosts();
    });
  },

  // 点击乐器标签
  filterByIns(e) {
    const ins = e.currentTarget.dataset.ins;
    console.log('✅ 切换乐器为:', ins || '全乐器');
    this.setData({ currInstrument: ins }, () => {
      this.getPosts();
    });
  },

  // --- 3. 核心：高级查询函数 ---

  getPosts() {
    const db = wx.cloud.database();
    const _ = db.command; // 引入指令库，用于 or 查询
    const { currType, currInstrument, searchKey } = this.data;

    // A. 基础查询条件（乐器和类型）
    let queryObj = {};
    if (currType) queryObj.type = currType;
    if (currInstrument) queryObj.instrument = currInstrument;

    // B. 处理搜索关键词：使用正则表达式进行模糊匹配
    if (searchKey) {
      const reg = db.RegExp({
        regexp: searchKey,
        options: 'i', // 忽略大小写
      });

      // 重点：使用 _.and 组合现有条件，并使用 _.or 同时匹配标题和内容
      queryObj = _.and([
        queryObj,
        _.or([
          { title: reg },
          { content: reg }
        ])
      ]);
    }

    console.log('📡 [2.2 进阶查询] 条件:', JSON.stringify(queryObj));
    wx.showLoading({ title: '正在探测...' });

    // C. 执行数据库拉取
    db.collection('posts')
      .where(queryObj)
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          console.log('📥 搜索结果:', res.data.length, '条');
          this.setData({
            postList: res.data
          });
          wx.hideLoading();
        },
        fail: err => {
          console.error("❌ 搜索失败:", err);
          wx.hideLoading();
          wx.showToast({ title: '网络开小差了', icon: 'none' });
        }
      })
  },

  // --- 4. 页面跳转逻辑 ---

  // 点击悬浮按钮，去发布页（带登录校验）
  goToPublish() {
    const openid = wx.getStorageSync('userOpenId');
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '发布招募需要先登录，是否前往我的页面？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/mine/mine' });
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  // 点击卡片进入详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${id}` });
    }
  }
})