Page({
  data: {
    myPostList: []
  },

  onLoad() {
    this.getMyPosts();
  },

  // === 1. 获取我的发帖列表 (之前的代码保持不变) ===
  getMyPosts() {
    wx.showLoading({ title: '加载中...' });
    const db = wx.cloud.database();
    const myOpenid = wx.getStorageSync('userOpenId'); 

    db.collection('posts').where({
      _openid: myOpenid
    }).get({
      success: res => {
        wx.hideLoading();
        this.setData({
          myPostList: res.data
        });
        if(res.data.length === 0) {
          wx.showToast({ title: '你还没有发过招募哦', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error("查询失败", err);
      }
    })
  },

  // === 2. 新增：点击卡片跳转到详情页的函数 ===
  goToDetail(e) {
    // 【关键拆解】
    // 1. 这里的参数 e 代表"事件对象"(Event)，包含了你点击时的各种信息。
    // 2. e.currentTarget.dataset 获取的就是你在 wxml 里写的 data-xxx 绑定的所有数据。
    // 3. 因为我们在 wxml 里写的是 data-id，所以这里用 .id 来提取。
    
    const clickedPostId = e.currentTarget.dataset.id; 
    
    console.log("准备跳转，带上的帖子ID是：", clickedPostId); // 可以在控制台看看有没有成功拿到

    // 使用 wx.navigateTo 进行跳转，并在 url 后面拼接参数
    // 格式是：页面路径 ? 变量名 = 变量值
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${clickedPostId}`, 
    })
  }

})