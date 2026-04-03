// utils/util.js

// 核心函数：把 Date 对象转换成 "YYYY-MM-DD HH:mm"
const formatTime = date => {
  if (!date) return '刚刚';
  
  // 如果传入的是云数据库的原始时间对象，先转成标准的 JS Date 对象
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();

  // 补零操作：让 9 变成 09
  const formatNumber = n => {
    n = n.toString();
    return n[1] ? n : `0${n}`;
  };

  return `${year}-${formatNumber(month)}-${formatNumber(day)} ${formatNumber(hour)}:${formatNumber(minute)}`;
}

// 重点：必须导出这个函数，别人才能引用
module.exports = {
  formatTime: formatTime
}