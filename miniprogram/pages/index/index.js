Page({
  data: {
    postList: [] // 用来存放从云端拉取下来的帖子列表
  },


/*
  onLoad() {
    this.getPosts(); // 页面加载时执行拉取函数
  },
*/
  // 获取招募帖的函数

onShow()
{
  this.getPosts();
},

// 点击悬浮按钮，跳转到发布页
// 点击悬浮按钮，准备跳转到发布页
goToPublish() {
  // 1. 去本地缓存查一下有没有登录过
  const openid = wx.getStorageSync('userOpenId');
  
  // 2. 如果没有查到 openid，说明没登录
  if (!openid) {
    wx.showModal({
      title: '提示',
      content: '发布招募需要先验证乐手身份哦，是否前往登录？',
      confirmText: '去登录',
      cancelText: '再逛逛',
      success: (res) => {
        if (res.confirm) {
          // 用户点击了“去登录”，跳转到“我的”页面
          // 注意：因为 mine 已经是底部 Tab 页了，必须用 switchTab
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }
      }
    });
    return; // 拦截成功，停止往下执行
  }

  // 3. 如果查到了 openid，说明已登录，正常放行
  wx.navigateTo({
    url: '/pages/publish/publish',
  });
},

getPosts() 
{
  const db = wx.cloud.database();
  
  // 这里加了一个 .orderBy()，让最新的帖子排在最上面！
  db.collection('posts')
    .orderBy('createTime', 'desc') 
    .get({
    success: res => {
      this.setData({
        postList: res.data
      });
    },
    fail: err => {
      console.error("获取失败", err);
    }
  })
},

// === 新增：首页卡片的点击跳转逻辑 ===
goToDetail(e) 
{
  const clickedPostId = e.currentTarget.dataset.id;
  
  // 增加一个防错机制，如果你在控制台看到打印出 undefined，就说明 wxml 里的 data-id 没写对
  console.log("首页准备跳转，帖子ID是：", clickedPostId); 
  
  if (!clickedPostId) {
    wx.showToast({ title: '帖子数据异常', icon: 'none' });
    return;
  }

  wx.navigateTo({
    url: `/pages/post-detail/post-detail?id=${clickedPostId}`,
  })
}




})
