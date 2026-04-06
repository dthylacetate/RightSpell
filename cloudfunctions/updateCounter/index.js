const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CONTROL })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { collection, postId } = event;
  
  try {
    return await db.collection(collection).doc(postId).update({
      data: {
        // 使用原子自增，避免两个用户同时留言导致数字算错
        commentCount: _.inc(1)
      }
    })
  } catch (e) {
    console.error('更新计数失败：', e)
    return e
  }
}