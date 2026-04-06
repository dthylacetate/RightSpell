// 1. 引入刚才创建的“攒次数”神器
import { requestNotice } from '../../utils/notice.js';

// 2. 这里填入你在微信后台申请的模板 ID
const NOTICE_TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'; 

Page({
  data: {
    title: '',
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'],
    instrument: '',
    style: '',
    content: '',
    contact: '',
    typeOptions: ['招募乐手' , '个人求组队'],
    typeIndex: 0,
  },

  changeType(e) {
    this.setData({ typeIndex: e.detail.value });
  },

  inputTitle(e) { this.setData({ title: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  inputStyle(e) { this.setData({ style: e.detail.value }) },
  inputContent(e) { this.setData({ content: e.detail.value }) },
  inputContact(e) { this.setData({ contact: e.detail.value }) },

  // === 核心逻辑修改 ===
  submitPost() {
    const { title, instrument, content } = this.data;
    
    // 基础验证（这部分是同步的，不影响点击手势）
    if (!title || !instrument || !content) {
      wx.showToast({ title: '核心信息没填全哦', icon: 'none' });
      return;
    }

    // ✨ 关键点：在任何异步操作（云函数/数据库）之前，先发起订阅请求
    // 此时仍然处于用户 TAP 手势的同步作用域内
    requestNotice(NOTICE_TEMPLATE_ID).then(() => {
      console.log('订阅请求处理完成，开始发布流程');
      // 无论用户点允许还是拒绝，我们都继续发布流程
      this.startSafetyCheck();
    });
  },

  // 将原来的发布流程封装成独立函数
  startSafetyCheck() {
    const { title, content } = this.data;
    wx.showLoading({ title: '安全检测中...' });

    wx.cloud.callFunction({
      name: 'checkContent',
      data: { content: title + content } 
    }).then(res => {
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({
          title: '温馨提示',
          content: '内容包含敏感或违规信息，请修改后再试。',
          showCancel: false
        });
      } else {
        // 安全检测通过，执行发布
        this.doRealPublish();
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '安全检测超时', icon: 'none' });
    })
  },

  doRealPublish() {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    db.collection('users').where({ _openid: openid }).get().then(res => {
      let authorName = "匿名乐手";
      let authorAvatar = "";

      if (res.data.length > 0) {
        authorName = res.data[0].nickname;
        authorAvatar = res.data[0].avatarUrl;
      }

      db.collection('posts').add({
        data: {
          type: this.data.typeOptions[this.data.typeIndex],
          title: this.data.title,
          instrument: this.data.instrument,
          style: this.data.style,
          content: this.data.content,
          contact: this.data.contact,
          authorName: authorName,
          authorAvatar: authorAvatar,
          commentCount: 0,
          createTime: db.serverDate()
        },
        success: () => {
          wx.hideLoading();
          wx.showToast({ title: '发布成功！', icon: 'success' });
          // 延迟跳转
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