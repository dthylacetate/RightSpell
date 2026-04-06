const util = require('../../utils/util.js'); 
import { requestNotice } from '../../utils/notice.js';
const NOTICE_TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'; 

Page({
  data: {
    post: null,           // 帖子详情
    commentList: [],      // 评论列表
    commentContent: '',   // 输入框内容
    isAuthor: false,      // 是否为作者本人
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
    const currentOpenId = wx.getStorageSync('userOpenId'); 

    db.collection('posts').doc(id).get({
      success: res => {
        const postData = res.data;
        this.setData({ 
          post: postData,
          isAuthor: currentOpenId === postData._openid 
        });
      },
      fail: err => {
        console.error("获取帖子详情失败", err);
        wx.showToast({ title: '内容已删除', icon: 'none' });
      }
    })
  },

  // 跳转到编辑页
  goToEdit() {
    if (!this.postId) return;
    wx.navigateTo({
      url: `/pages/publish/publish?id=${this.postId}`
    });
  },

  // 2. 获取评论列表
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

  // 4. 提交留言
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

  // ✨ 核心修改：使用云函数增加评论计数
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

          // 🚀 修改点：调用云函数 updateCounter 来增加计数
          // 云函数有管理员权限，可以修改非本人创建的帖子数据
          wx.cloud.callFunction({
            name: 'updateCounter',
            data: {
              collection: 'posts', // 指定集合
              postId: this.postId
            }
          }).then(res => {
            console.log('计数君增加成功', res);
          }).catch(err => {
            console.error('计数君罢工了', err);
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
  },

  // 查看乐手名片
  goToProfile(e) {
    const openid = e.currentTarget.dataset.openid;
    if (!openid) return;
    wx.navigateTo({
      url: `/pages/profile-detail/profile-detail?openid=${openid}`
    });
  }
})