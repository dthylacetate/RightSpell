// pages/post-detail/post-detail.js
const util = require('../../utils/util.js'); // 引入时间格式化工具类

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
      this.postId = id; // 将 ID 挂载到 this 上方便后续调用
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
      .orderBy('createTime', 'desc') // 最新的评论排在最上面
      .get({
        success: res => {
          // 使用工具类处理时间显示
          const formattedList = res.data.map(item => {
            item.dateStr = util.formatTime(item.createTime);
            return item;
          });
          this.setData({ commentList: formattedList });
        }
      })
  },

  // 3. 监听输入框
  inputComment(e) {
    this.setData({ commentContent: e.detail.value });
  },

  // 4. 提交留言（第一关：安检）
  submitComment() {
    const content = this.data.commentContent.trim();
    if (!content) {
      wx.showToast({ title: '写点什么再发送吧', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '安全检测中...' });

    // 调用安全检测云函数
    wx.cloud.callFunction({
      name: 'checkContent',
      data: { content: content }
    }).then(res => {
      // 检查检测结果
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '留言内容不符合社区规范，请修改。',
          showCancel: false
        });
      } else {
        // 安全检测通过，执行真正的存储
        this.doRealSubmitComment(content);
      }
    }).catch(err => {
      wx.hideLoading();
      console.error("安检失败", err);
      wx.showToast({ title: '检测服务异常', icon: 'none' });
    })
  },

  // 5. 提交留言（第二关：实名抓取与入库）
  doRealSubmitComment(content) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('userOpenId');

    // 抓取当前发帖人的资料
    db.collection('users').where({ _openid: openid }).get().then(res => {
      const user = res.data[0] || { nickname: "匿名乐手", avatarUrl: "" };

      // A. 存入评论集合
      db.collection('comments').add({
        data: {
          postId: this.postId,
          content: content,
          authorName: user.nickname,
          authorAvatar: user.avatarUrl,
          createTime: db.serverDate()
        },
        success: () => {
          // B. 成功后更新 UI
          this.setData({ commentContent: '' });
          this.getComments(this.postId); // 重新拉取列表

          // C. 进阶：更新 posts 表的评论计数字段
          db.collection('posts').doc(this.postId).update({
            data: { commentCount: db.command.inc(1) }
          });

          wx.hideLoading();
          wx.showToast({ title: '留言成功', icon: 'success' });
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '发送失败', icon: 'none' });
        }
      })
    })
  }
})