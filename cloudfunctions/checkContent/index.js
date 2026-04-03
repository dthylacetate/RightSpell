const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CA })

exports.main = async (event, context) => {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: event.content, // 要检查的文本
      version: 2,            // 使用 2.0 版本，识别率更高
      scene: 1,              // 1 场景为资料/社交，2 场景为论坛/评论
      openid: cloud.getWXContext().OPENID
    })
    return result
  } catch (err) {
    return err
  }
}