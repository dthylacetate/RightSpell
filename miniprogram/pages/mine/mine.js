Page({
  data: {
    hasUserInfo: false,
    openid: '',
    userInfo: null // 新增：用来存放从数据库拉取下来的真实资料
  },

  onLoad() {
    // 页面加载时检查本地缓存有没有登录过
    const openid = wx.getStorageSync('userOpenId');
    if (openid) {
      this.setData({
        hasUserInfo: true,
        openid: openid
      });
    }
  },


// === 核心修改：增加 onShow，每次回到页面都刷新资料 ===
onShow() {
  if (this.data.hasUserInfo) {
    this.getUserProfile();
  }
},



// === 新增：去 users 集合查询当前用户的真实资料 ===
getUserProfile() {
  const db = wx.cloud.database();
  const openid = wx.getStorageSync('userOpenId');

  db.collection('users').where({
    _openid: openid
  }).get({
    success: res => {
      if (res.data.length > 0) {
        // 如果数据库里查到了这个人的资料，就存到页面的 data 里
        this.setData({
          userInfo: res.data[0]
        });
      }
    },
    fail: err => {
      console.error("获取个人资料失败", err);
    }
  })
},


  // 登录按钮的点击事件
  login() {
    wx.showLoading({ title: '登录中...' });
    
    // 调用云函数获取用户的 openid
    wx.cloud.callFunction({
      name: 'login', // 这是一个云开发的内置云函数，专门用来取 openid
      success: res => {
        wx.hideLoading();
        console.log("获取成功", res.result.openid);
        
        const openid = res.result.openid;
        
        // 存入页面数据，改变显示状态
        this.setData({
          hasUserInfo: true,
          openid: openid
        });

        // 存入手机本地缓存，下次进来就不用再点了
        wx.setStorageSync('userOpenId', openid);
        
        wx.showToast({ title: '登录成功' });
      },
      fail: err => {
        wx.hideLoading();
        console.error("登录失败", err);
        wx.showToast({ title: '登录失败', icon: 'none' });
      }

      


    });
  },
// 跳转到我的发帖页面
goToMyPosts() 
{
  // 增加一层防护：没登录不让进
  if (!this.data.hasUserInfo) {
    wx.showToast({ title: '请先登录哦', icon: 'none' });
    return;
  }
  wx.navigateTo({
    url: '/pages/my-posts/my-posts',
  })
},


// 跳转到修改资料页面
goToEditProfile() {
  // 同样加个防御，虽然能看到这个按钮大概率已经登录了
  if (!this.data.hasUserInfo) {
    wx.showToast({ title: '请先登录哦', icon: 'none' });
    return;
  }
  
  wx.navigateTo({
    url: '/pages/profile-edit/profile-edit',
  });
},



// 退出登录逻辑
logout() {
  wx.showModal({
    title: '提示',
    content: '确定要退出当前乐手身份吗？',
    confirmText: '确定退出',
    cancelText: '再想想',
    success: (res) => {
      if (res.confirm) {
        // 1. 清除本地存储的身份证 (OpenID)
        wx.removeStorageSync('userOpenId');
        
        // 2. 重置页面数据，让界面瞬间变回“请先登录”的状态
        this.setData({
          hasUserInfo: false,
          openid: '',
          userInfo: null // 清空拉取到的头像昵称名片
        });

        wx.showToast({
          title: '已退出登录',
          icon: 'success'
        });
      }
    }
  })
},




})