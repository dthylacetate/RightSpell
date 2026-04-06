const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CA })

const TEMPLATE_ID = 'l7LPYggn6eytBnp47wf5kZYh2IkbbQ6Pb4-hv8qLUOs'

// ✨ 新增：格式化北京时间的工具函数
function getCSTTime() {
  const now = new Date();
  // 偏移 8 小时得到北京时间
  const cst = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const fullIso = cst.toISOString(); // 得到 2026-04-06T15:30:00.000Z
  // 转换成微信要求的格式：2026-04-06 15:30:00
  return fullIso.replace('T', ' ').substring(0, 19);
}

exports.main = async (event, context) => {
  const timeStr = getCSTTime(); // 获取当前动态时间
  
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      "touser": event.targetOpenId,
      "page": 'pages/post-detail/post-detail?id=' + event.postId,
      "templateId": TEMPLATE_ID,
      "data": {
        "thing1": { "value": "你的帖子有新回复啦" },
        "thing5": { "value": event.content.substring(0, 20) },
        "thing6": { "value": event.replyUser.substring(0, 10) },
        "date4": { "value": timeStr } // ✨ 动态传入格式化后的时间
      }
    })
    return result
  } catch (err) {
    console.log(err)
    return err
  }
}