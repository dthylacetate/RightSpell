const util = require('../../utils/util.js'); // 引入时间格式化工具类
// 1. 引入攒次数工具
import { requestNotice } from '../../utils/notice.js';

// 2. 依然是那个模板 ID
const NOTICE_TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'; 

Page({
  data: {
    post: null,           // 帖子详情
    commentList: [],      // 评论列表
    commentContent: '',   // 输入框内容
  },

  onLoad(options) {
    const id = options.id;
    console.log("正在加载帖子详情，ID:", id);

    if (id && id !== "undefined") {
      this.postId = id; 
      this.getDetailData(id);
      this.getComments(id);

      // --- 动作一已从此处移除，因为它无法在 onLoad 这种非人工触发的环境下运行 ---
      
    } else {
      wx.showToast({ title: '参数异常', icon: 'none' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  // 1. 获取帖子主表数据
  getDetailData(id) {
    const db = wx.cloud.database();
    db.collection('posts').doc(id).get({
      success: res => {
        this.setData({ post: res.data });
      },
      fail: err => {
        console.error("获取帖子详情失败", err);
        wx.showToast({ title: '内容已删除', icon: 'none' });
      }
    })
  },

  // 2. 获取该帖子的评论列表
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

  // 4. 提交留言（✨ 已加入订阅授权逻辑）
  submitComment() {
    const content = this.data.commentContent.trim();
    if (!content) {
      wx.showToast({ title: '写点什么再发送吧', icon: 'none' });
      return;
    }

    // ✨ 核心修改：在提交前先请求订阅权限
    // 此时处于用户点击按钮的同步时间线内，微信会允许弹窗
    requestNotice(NOTICE_TEMPLATE_ID).then(() => {
      console.log('留言前的订阅处理完成（已尝试攒次数）');
      
      // 订阅处理完后，再开始安全检测
      wx.showLoading({ title: '安全检测中...' });

      wx.cloud.callFunction({
        name: 'checkContent',
        data: { content: content }
      }).then(res => {
        if (res.result.result && res.result.result.suggest !== 'pass') {
          wx.hideLoading();
          wx.showModal({
            title: '提示',
            content: '留言内容不符合社区规范，请修改。',
            showCancel: false
          });
        } else {
          this.doRealSubmitComment(content);
        }
      }).catch(err => {
        wx.hideLoading();
        console.error("安检失败", err);
        wx.showToast({ title: '检测服务异常', icon: 'none' });
      })
    });
  },

  // 5. 提交留言（第二关：实名抓取与入库）
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

          // ✨ 动作二：出门发信
          this.pushNoticeToAuthor(content, user.nickname);

          wx.hideLoading();
          wx.showToast({ title: '留言成功', icon: 'success' });
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '发送失败', icon: 'none' });
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
        postId: this.postId,                 
        content: content,                     
        replyUser: replyName,                 
        time: "刚刚"                          
      }
    }).then(res => {
      console.log('🚀 推送请求已发出', res);
    }).catch(err => {
      console.error('❌ 推送请求失败', err);
    });
  }
})