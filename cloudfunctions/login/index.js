// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 “上传并部署”

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取 WX Context (微信调用上下文)，里面包含了用户的身份信息
  const wxContext = cloud.getWXContext()

  // 把用户的 openid 返回给前端的小程序
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}