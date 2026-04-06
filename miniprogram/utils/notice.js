// utils/notice.js
// 这是我们的“攒次数”神器
export const requestNotice = (templateId) => {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        // 如果用户勾选了“总是保持以上选择”，这里会直接返回 accept 且不弹窗
        if (res[templateId] === 'accept') {
          console.log('✅ 成功预存 1 条通知额度');
          resolve(true);
        } else {
          console.log('❌ 用户拒绝或额度耗尽');
          resolve(false);
        }
      },
      fail: (err) => {
        console.error('🛠️ 订阅请求失败', err);
        resolve(false);
      }
    });
  });
};