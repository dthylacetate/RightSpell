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
    const _ = db.command; 
    const { currType, currInstrument, searchKey } = this.data;

    // 1. 基础过滤：类型（招募/求组队）
    // 注意：如果已经选了具体的乐器标签，我们依然保留它作为“硬过滤”
    let queryObj = {};
    if (currType) queryObj.type = currType;
    if (currInstrument) queryObj.instrument = currInstrument;

    // 2. 处理“全文本”搜索关键词
    if (searchKey) {
      const reg = db.RegExp({
        regexp: searchKey,
        options: 'i', // 忽略大小写
      });

      // ✨ 进阶：将搜索范围扩大到所有文本字段
      const searchConditions = _.or([
        { title: reg },      // 匹配标题
        { content: reg },    // 匹配详细说明
        { instrument: reg }, // 匹配乐器标签（即便没点上面的标签也能搜到）
        { style: reg },      // 匹配音乐风格字段
        { authorName: reg }  // 匹配作者昵称
      ]);

      // 组合条件：(类型和乐器硬过滤) AND (全文本模糊匹配)
      queryObj = _.and([
        queryObj,
        searchConditions
      ]);
    }

    console.log('📡 [全文本搜索启动] 条件:', JSON.stringify(queryObj));
    wx.showLoading({ title: '正在全站搜索...' });

    db.collection('posts')
      .where(queryObj)
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          console.log('📥 匹配结果:', res.data.length, '条');
          this.setData({
            postList: res.data
          });
          wx.hideLoading();
        },
        fail: err => {
          console.error("❌ 搜索失败:", err);
          wx.hideLoading();
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