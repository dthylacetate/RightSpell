const util = require('../../utils/util.js'); 
import { requestNotice } from '../../utils/notice.js';
const NOTICE_TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'; 

Page({
  data: {
    post: null,           // 帖子详情
    commentList: [],      // 评论列表
    commentContent: '',   // 输入框内容
    isAuthor: false,      // ✨ 新增：是否为作者本人
  },

  onLoad(options) {
    const id = options.id;
    console.log("正在加载帖子详情，ID:", id);

    if (id && id !== "undefined") {
      this.postId = id; 
      this.getDetailData(id);
      this.getComments(id);
    } else {
      wx.showToast({ title: '参数异常', icon: 'none' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  // 1. 获取帖子主表数据
  getDetailData(id) {
    const db = wx.cloud.database();
    const currentOpenId = wx.getStorageSync('userOpenId'); // ✨ 获取当前登录用户的openid

    db.collection('posts').doc(id).get({
      success: res => {
        const postData = res.data;
        this.setData({ 
          post: postData,
          // ✨ 核心逻辑：比对当前用户ID与帖子作者ID
          isAuthor: currentOpenId === postData._openid 
        });
      },
      fail: err => {
        console.error("获取帖子详情失败", err);
        wx.showToast({ title: '内容已删除', icon: 'none' });
      }
    })
  },

  // ✨ 新增：跳转到编辑页
  goToEdit() {
    if (!this.postId) return;
    wx.navigateTo({
      url: `/pages/publish/publish?id=${this.postId}`
    });
  },

  // 2. 获取评论列表 (保持不变)
  getComments(id) {
    const db = wx.cloud.database();
    db.collection('comments')
      .where({ postId: id })
      .orderBy('createTime', 'desc') 
      .get({
        success: res => {
          const formattedList = res.data.map(item => {
            item.dateStr = util.formatTime(item.createTime);
            return item;
          });
          this.setData({ commentList: formattedList });
        }
      })
  },

  inputComment(e) {
    this.setData({ commentContent: e.detail.value });
  },

  // 4. 提交留言 (保持不变)
  submitComment() {
    const content = this.data.commentContent.trim();
    if (!content) {
      wx.showToast({ title: '写点什么再发送吧', icon: 'none' });
      return;
    }

    requestNotice(NOTICE_TEMPLATE_ID).then(() => {
      wx.showLoading({ title: '安全检测中...' });
      wx.cloud.callFunction({
        name: 'checkContent',
        data: { content: content }
      }).then(res => {
        if (res.result.result && res.result.result.suggest !== 'pass') {
          wx.hideLoading();
          wx.showModal({ title: '提示', content: '内容不符合规范', showCancel: false });
        } else {
          this.doRealSubmitComment(content);
        }
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '检测异常', icon: 'none' });
      })
    });
  },

  doRealSubmitComment(content) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    db.collection('users').where({ _openid: openid }).get().then(res => {
      const user = res.data[0] || { nickname: "匿名乐手", avatarUrl: "" };
      db.collection('comments').add({
        data: {
          postId: this.postId,
          content: content,
          authorName: user.nickname,
          authorAvatar: user.avatarUrl,
          createTime: db.serverDate()
        },
        success: () => {
          this.setData({ commentContent: '' });
          this.getComments(this.postId); 
          db.collection('posts').doc(this.postId).update({
            data: { commentCount: db.command.inc(1) }
          });
          this.pushNoticeToAuthor(content, user.nickname);
          wx.hideLoading();
          wx.showToast({ title: '留言成功', icon: 'success' });
        }
      })
    })
  },

  pushNoticeToAuthor(content, replyName) {
    if (this.data.post._openid === wx.getStorageSync('userOpenId')) return;
    wx.cloud.callFunction({
      name: 'sendNotice', 
      data: {
        targetOpenId: this.data.post._openid, 
        postId: this.postId, content, replyUser: replyName, time: "刚刚" 
      }
    });
  }
})