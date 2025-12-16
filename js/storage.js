/**
 * storage.js - 数据存储层
 * 职责：封装 LocalStorage 操作
 */

const DiaryStorage = (function() {
  'use strict';

  const STORAGE_KEY = 'diary_data';
  const VERSION = '1.0.0';

  /**
   * 初始化数据结构
   * @returns {object} 初始数据对象
   */
  function getInitialData() {
    return {
      entries: [],
      dailyWeather: {},  // 每天的天气数据 { "2024-12-16": "sunny", ... }
      milestones: {},    // 特殊日期（人生转折点）{ "2015-09-01": { type: "education", label: "大学入学" } }
      settings: {
        theme: 'light',
        fontSize: 'medium',
        lastSyncAt: null,
        birthDate: null,      // 出生日期（时间原点）'YYYY-MM-DD'
        initialized: false    // 是否已初始化出生日期
      },
      version: VERSION
    };
  }

  /**
   * 加载数据
   * @returns {object} 数据对象
   */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        // 首次使用，初始化数据
        const initialData = getInitialData();
        saveData(initialData);
        return initialData;
      }

      const data = JSON.parse(raw);

      // 数据验证
      if (!data.entries || !Array.isArray(data.entries)) {
        console.warn('⚠️ 数据格式异常，重新初始化');
        return getInitialData();
      }

      return data;

    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      return getInitialData();
    }
  }

  /**
   * 保存数据
   * @param {object} data - 数据对象
   * @returns {boolean} 是否保存成功
   */
  function saveData(data) {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
      console.log('💾 数据已保存');
      return true;

    } catch (error) {
      console.error('❌ 保存数据失败:', error);

      // 可能是 LocalStorage 已满
      if (error.name === 'QuotaExceededError') {
        alert('存储空间已满，请删除部分旧记录');
      }

      return false;
    }
  }

  /**
   * 添加记录
   * @param {object} entry - 记录对象
   */
  function addEntry(entry) {
    const data = loadData();
    data.entries.push(entry);
    saveData(data);
  }

  /**
   * 更新记录
   * @param {string} id - 记录 ID
   * @param {string} content - 新内容
   */
  function updateEntry(id, content) {
    const data = loadData();
    const entry = data.entries.find(e => e.id === id);

    if (entry) {
      entry.content = content.trim();
      entry.updatedAt = Date.now();
      entry.metadata.wordCount = content.trim().length;
      saveData(data);
    }
  }

  /**
   * 删除记录（软删除）
   * @param {string} id - 记录 ID
   */
  function deleteEntry(id) {
    const data = loadData();
    const entry = data.entries.find(e => e.id === id);

    if (entry) {
      entry.deleted = true;
      entry.updatedAt = Date.now();
      saveData(data);
    }
  }

  /**
   * 获取所有记录
   * @returns {Array} 记录数组
   */
  function getAllEntries() {
    const data = loadData();
    return data.entries;
  }

  /**
   * 获取某天的天气
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {string} 天气类型 ('', 'sunny', 'cloudy', 'rainy', 'snowy')
   */
  function getDailyWeather(dateKey) {
    const data = loadData();
    return data.dailyWeather?.[dateKey] || '';
  }

  /**
   * 设置某天的天气
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @param {string} weather - 天气类型
   */
  function setDailyWeather(dateKey, weather) {
    const data = loadData();
    if (!data.dailyWeather) {
      data.dailyWeather = {};
    }

    if (weather === '' || weather === null) {
      delete data.dailyWeather[dateKey];
    } else {
      data.dailyWeather[dateKey] = weather;
    }

    saveData(data);
  }

  /**
   * 获取出生日期
   * @returns {string|null} 出生日期 'YYYY-MM-DD' 或 null
   */
  function getBirthDate() {
    const data = loadData();
    return data.settings?.birthDate || null;
  }

  /**
   * 设置出生日期
   * @param {string} birthDate - 出生日期 'YYYY-MM-DD'
   */
  function setBirthDate(birthDate) {
    const data = loadData();
    if (!data.settings) {
      data.settings = getInitialData().settings;
    }
    data.settings.birthDate = birthDate;
    data.settings.initialized = true;
    saveData(data);
  }

  /**
   * 获取某天的特殊日期标记
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {object|null} 特殊日期对象或null
   */
  function getMilestone(dateKey) {
    const data = loadData();
    return data.milestones?.[dateKey] || null;
  }

  /**
   * 设置特殊日期标记
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @param {object} milestone - 特殊日期对象 { type, label }
   */
  function setMilestone(dateKey, milestone) {
    const data = loadData();
    if (!data.milestones) {
      data.milestones = {};
    }

    if (milestone === null) {
      delete data.milestones[dateKey];
    } else {
      data.milestones[dateKey] = milestone;
    }

    saveData(data);
  }

  // 公开接口
  return {
    loadData,
    saveData,
    addEntry,
    updateEntry,
    deleteEntry,
    getAllEntries,
    getDailyWeather,
    setDailyWeather,
    getBirthDate,
    setBirthDate,
    getMilestone,
    setMilestone
  };
})();
