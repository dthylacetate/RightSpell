import { requestNotice } from '../../utils/notice.js';
const NOTICE_TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'; 

Page({
  data: {
    // ✨ 新增状态控制
    isEdit: false, 
    postId: '',
    
    title: '',
    instruments: ['吉他', '贝斯', '架子鼓', '键盘', '主唱', '其他'],
    instrument: '',
    style: '',
    content: '',
    contact: '',
    typeOptions: ['招募乐手' , '个人求组队'],
    typeIndex: 0,
  },

  onLoad(options) {
    // ✨ 核心逻辑：判断是从“详情页”点编辑进来的，还是直接点“发布”进来的
    if (options.id) {
      this.setData({
        isEdit: true,
        postId: options.id
      });
      wx.setNavigationBarTitle({ title: '编辑我的招募' });
      this.loadOldData(options.id); // 去数据库搬旧数据
    }
  },

  // ✨ 编辑模式专用：把旧数据填回表单
  loadOldData(id) {
    const db = wx.cloud.database();
    wx.showLoading({ title: '加载中...' });
    db.collection('posts').doc(id).get().then(res => {
      const p = res.data;
      this.setData({
        title: p.title,
        instrument: p.instrument,
        style: p.style,
        content: p.content,
        contact: p.contact,
        // 自动匹配选择器的索引
        typeIndex: this.data.typeOptions.indexOf(p.type) || 0
      });
      wx.hideLoading();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '找不到帖子了', icon: 'none' });
    });
  },

  // 输入监听（保持你原有的逻辑不变）
  changeType(e) { this.setData({ typeIndex: e.detail.value }); },
  inputTitle(e) { this.setData({ title: e.detail.value }) },
  changeInstrument(e) { this.setData({ instrument: this.data.instruments[e.detail.value] }) },
  inputStyle(e) { this.setData({ style: e.detail.value }) },
  inputContent(e) { this.setData({ content: e.detail.value }) },
  inputContact(e) { this.setData({ contact: e.detail.value }) },

  // 提交按钮触发
  submitPost() {
    const { title, instrument, content } = this.data;
    if (!title || !instrument || !content) {
      wx.showToast({ title: '信息还没填全哦', icon: 'none' });
      return;
    }
    requestNotice(NOTICE_TEMPLATE_ID).then(() => {
      this.startSafetyCheck();
    });
  },

  // 安全检测（保持不变）
  startSafetyCheck() {
    const { title, content } = this.data;
    wx.showLoading({ title: '安全检测中...' });
    wx.cloud.callFunction({
      name: 'checkContent',
      data: { content: title + content } 
    }).then(res => {
      if (res.result.result && res.result.result.suggest !== 'pass') {
        wx.hideLoading();
        wx.showModal({ title: '提示', content: '内容违规，请修改', showCancel: false });
      } else {
        this.saveData(); // 进入保存逻辑
      }
    });
  },

  // ✨ 升级后的保存逻辑：区分 add 和 update
  saveData() {
    const db = wx.cloud.database();
    const { isEdit, postId, typeOptions, typeIndex } = this.data;

    // 提取公共数据包
    const postData = {
      type: typeOptions[typeIndex],
      title: this.data.title,
      instrument: this.data.instrument,
      style: this.data.style,
      content: this.data.content,
      contact: this.data.contact,
      updateTime: db.serverDate() // 记录修改时间
    };

    wx.showLoading({ title: isEdit ? '正在保存...' : '正在发布...' });

    if (isEdit) {
      // 📝 编辑模式：使用 update 修改单条记录
      db.collection('posts').doc(postId).update({
        data: postData,
        success: () => {
          this.onSuccess('修改成功！');
        },
        fail: err => { this.onFail(err); }
      });
    } else {
      // 🚀 发布模式：使用 add 新增记录
      const openid = wx.getStorageSync('userOpenId');
      db.collection('users').where({ _openid: openid }).get().then(res => {
        const user = res.data[0] || { nickname: "匿名乐手", avatarUrl: "" };
        db.collection('posts').add({
          data: {
            ...postData,
            authorName: user.nickname,
            authorAvatar: user.avatarUrl,
            commentCount: 0,
            createTime: db.serverDate()
          },
          success: () => { this.onSuccess('发布成功！'); },
          fail: err => { this.onFail(err); }
        });
      });
    }
  },

  onSuccess(msg) {
    wx.hideLoading();
    wx.showToast({ title: msg, icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1500);
  },

  onFail(err) {
    wx.hideLoading();
    console.error("操作失败", err);
    wx.showToast({ title: '操作失败', icon: 'none' });
  }
})