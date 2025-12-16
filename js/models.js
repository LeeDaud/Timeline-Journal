/**
 * models.js - 数据模型与业务逻辑
 * 职责：处理数据的格式化、排序、分组
 */

const DiaryModels = (function() {
  'use strict';

  /**
   * 生成唯一 ID
   * 格式：{timestamp}-{randomHash}
   * 示例：1734364800000-a3f2c1
   */
  function generateId() {
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomHash}`;
  }

  /**
   * 创建新记录
   * @param {string} content - 记录内容
   * @returns {object} 新记录对象
   */
  function createEntry(content) {
    const now = Date.now();
    return {
      id: generateId(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
      metadata: {
        wordCount: content.trim().length,
        device: 'web'
      }
    };
  }

  /**
   * 格式化日期为"12月15日 周日"格式
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的日期字符串
   */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];

    return `${month}月${day}日 ${weekday}`;
  }

  /**
   * 格式化时间为"14:32"格式
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的时间字符串
   */
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  /**
   * 提取日期部分（YYYY-MM-DD）
   * @param {number} timestamp - 时间戳
   * @returns {string} 日期字符串
   */
  function extractDateKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * 按日期分组记录
   * @param {Array} entries - 记录数组
   * @returns {Array} 分组后的时间轴数据
   */
  function groupEntriesByDate(entries) {
    // 步骤 1: 过滤掉已删除的记录
    const activeEntries = entries.filter(entry => !entry.deleted);

    // 步骤 2: 按创建时间降序排序（最新的在前）
    const sortedEntries = activeEntries.sort((a, b) => b.createdAt - a.createdAt);

    // 步骤 3: 按日期分组
    const grouped = {};

    sortedEntries.forEach(entry => {
      const dateKey = extractDateKey(entry.createdAt);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(entry);
    });

    // 步骤 4: 转换为数组结构，并添加显示用的日期格式
    const timelineData = Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))  // 日期降序
      .map(dateKey => {
        // 使用第一条记录的时间戳来格式化日期
        const firstEntry = grouped[dateKey][0];

        return {
          date: dateKey,
          displayDate: formatDate(firstEntry.createdAt),
          entries: grouped[dateKey]
        };
      });

    return timelineData;
  }

  /**
   * 验证日期格式是否合法
   * @param {string} dateString - 日期字符串 'YYYY-MM-DD'
   * @returns {boolean}
   */
  function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * 计算指定日期时的年龄
   * @param {string} birthDate - 出生日期 'YYYY-MM-DD'
   * @param {Date} targetDate - 目标日期（默认今天）
   * @returns {number} 年龄
   */
  function getAge(birthDate, targetDate = new Date()) {
    const birth = new Date(birthDate);
    const target = new Date(targetDate);

    let age = target.getFullYear() - birth.getFullYear();

    // 检查是否已过今年生日
    const hasPassedBirthday =
      target.getMonth() > birth.getMonth() ||
      (target.getMonth() === birth.getMonth() &&
       target.getDate() >= birth.getDate());

    if (!hasPassedBirthday) {
      age--;
    }

    return age;
  }

  /**
   * 计算距出生第几天
   * @param {string} birthDate
   * @param {Date} targetDate
   * @returns {number}
   */
  function getDaysSinceBirth(birthDate, targetDate = new Date()) {
    const birth = new Date(birthDate);
    birth.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffMs = target - birth;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * 获取某个年龄的起止日期
   * @param {string} birthDate
   * @param {number} age
   * @returns {object} { start: Date, end: Date }
   */
  function getAgeRange(birthDate, age) {
    const birth = new Date(birthDate);

    const start = new Date(birth);
    start.setFullYear(birth.getFullYear() + age);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);  // 减1天，到下个生日前一天

    return { start, end };
  }

  /**
   * 获取年龄标签（年龄 + 年份范围）
   * @param {string} birthDate
   * @param {number} age
   * @returns {object} { ageLabel, yearLabel }
   */
  function getAgeYearLabel(birthDate, age) {
    const { start, end } = getAgeRange(birthDate, age);

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    // 主标签
    const ageLabel = `${age} 岁`;

    // 次级标签：年份
    let yearLabel;
    if (startYear === endYear) {
      yearLabel = `(${startYear})`;  // 罕见：生日12月31日
    } else {
      // 多数情况：跨两年
      yearLabel = `(${startYear}-${endYear})`;
    }

    return { ageLabel, yearLabel };
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   * @param {Date} date
   * @returns {string}
   */
  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取ISO 8601周数
   * @param {Date} date
   * @returns {number}
   */
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // 公开接口
  return {
    generateId,
    createEntry,
    formatDate,
    formatTime,
    groupEntriesByDate,
    isValidDate,
    getAge,
    getDaysSinceBirth,
    getAgeRange,
    getAgeYearLabel,
    formatDateKey,
    getWeekNumber
  };
})();
