/**
 * writing-entry.js - 写作入口管理器
 * 职责：简洁的书写空间，自动高度调整，提交逻辑，时间显示，天气选择
 */

const WritingEntry = (function() {
  'use strict';

  let input = null;
  let submit = null;
  let container = null;
  let timeDisplay = null;
  let timeBtn = null;
  let weatherBtn = null;
  let weatherIcon = null;
  let timeUpdateInterval = null;

  // 状态
  let customTime = null;       // 自定义时间 (HH:mm)，null 表示使用当前时间
  let selectedWeather = '';    // 选中的天气类型
  let weatherPopover = null;

  // 天气配置（文字极简风格）
  const WEATHER_OPTIONS = [
    { id: '', icon: '·', label: '无' },
    { id: 'sunny', icon: '晴', label: '晴' },
    { id: 'cloudy', icon: '阴', label: '阴' },
    { id: 'rainy', icon: '雨', label: '雨' },
    { id: 'snowy', icon: '雪', label: '雪' },
    { id: 'foggy', icon: '雾', label: '雾' },
    { id: 'windy', icon: '风', label: '风' },
    { id: 'stormy', icon: '雷', label: '雷' }
  ];

  /**
   * 初始化
   */
  function init() {
    input = document.getElementById('writingEntryInput');
    submit = document.getElementById('writingEntrySubmit');
    container = document.getElementById('writingEntry');
    timeDisplay = document.getElementById('writingEntryTime');
    timeBtn = document.getElementById('writingEntryTimeBtn');
    weatherBtn = document.getElementById('writingEntryWeatherBtn');
    weatherIcon = document.getElementById('writingEntryWeatherIcon');

    if (!input || !submit || !container) {
      console.error('❌ 写作入口元素未找到');
      return;
    }

    bindEvents();
    updateTime();  // 初始化时间显示
    startTimeUpdate();  // 启动时间自动更新
    initHeight();  // 初始化高度
    updateWeatherIcon();  // 初始化天气图标

    console.log('✅ 写作入口初始化完成');
  }

  /**
   * 绑定事件
   */
  function bindEvents() {
    // 1. 自动高度调整
    input.addEventListener('input', autoResize);

    // 2. 提交按钮点击
    submit.addEventListener('mousedown', (e) => {
      e.preventDefault();  // 防止输入框失焦
      handleSubmit();
    });

    // 3. 键盘快捷键：Cmd/Ctrl + Enter 提交
    input.addEventListener('keydown', handleKeydown);

    // 4. 聚焦时立即更新时间，并滚动日历到今天
    input.addEventListener('focus', () => {
      updateTime();
      // 🆕 滚动生命日历到今天
      if (typeof DiaryApp !== 'undefined' && DiaryApp.scrollCalendarToToday) {
        DiaryApp.scrollCalendarToToday();
      }
    });

    // 5. 时间按钮点击
    if (timeBtn) {
      timeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTimePicker();
      });
    }

    // 6. 天气按钮点击
    if (weatherBtn) {
      weatherBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWeatherPopover();
      });
    }

    // 7. 点击外部关闭 popover
    document.addEventListener('click', closeAllPopovers);
  }

  /**
   * 更新时间显示
   */
  function updateTime() {
    if (!timeDisplay) return;

    if (customTime) {
      // 使用自定义时间
      timeDisplay.textContent = customTime;
      timeDisplay.classList.add('time--custom');
    } else {
      // 使用当前时间
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeDisplay.textContent = `${hours}:${minutes}`;
      timeDisplay.classList.remove('time--custom');
    }
  }

  /**
   * 启动时间自动更新（每分钟更新一次）
   */
  function startTimeUpdate() {
    // 清除旧的定时器
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }

    // 计算到下一分钟的毫秒数
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // 下一分钟更新一次，然后每分钟更新
    setTimeout(() => {
      updateTime();
      timeUpdateInterval = setInterval(updateTime, 60000);
    }, msToNextMinute);
  }

  /**
   * ========================================
   * 时间编辑 - 使用 Wheel Picker
   * ========================================
   */

  function showTimePicker() {
    closeWeatherPopover();

    // 解析当前时间
    let hour = new Date().getHours();
    let minute = new Date().getMinutes();

    if (customTime) {
      const parts = customTime.split(':');
      hour = parseInt(parts[0]) || 0;
      minute = parseInt(parts[1]) || 0;
    }

    WheelPicker.openTimePicker({
      value: { hour, minute },
      anchor: timeBtn,
      onConfirm: (time) => {
        customTime = String(time.hour).padStart(2, '0') + ':' + String(time.minute).padStart(2, '0');
        updateTime();
      }
    });
  }

  /**
   * ========================================
   * 天气选择 Popover
   * ========================================
   */

  function toggleWeatherPopover() {
    if (weatherPopover) {
      closeWeatherPopover();
      return;
    }
    showWeatherPopover();
  }

  function showWeatherPopover() {
    WheelPicker.close();  // 关闭可能打开的时间选择器

    const popover = document.createElement('div');
    popover.className = 'weather-select-popover';
    popover.id = 'weatherSelectPopover';

    const optionsHTML = WEATHER_OPTIONS.map(opt => `
      <button class="weather-option ${selectedWeather === opt.id ? 'weather-option--active' : ''}"
              data-weather="${opt.id}"
              title="${opt.label}">
        <span class="weather-option-icon">${opt.icon || '·'}</span>
      </button>
    `).join('');

    popover.innerHTML = `
      <div class="weather-options-grid">
        ${optionsHTML}
      </div>
    `;

    // 定位
    const rect = weatherBtn.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    popover.style.left = (rect.left - 60) + 'px';

    document.body.appendChild(popover);
    weatherPopover = popover;

    // 绑定事件
    popover.addEventListener('click', (e) => {
      const option = e.target.closest('.weather-option');
      if (option) {
        selectedWeather = option.dataset.weather;
        updateWeatherIcon();
        closeWeatherPopover();
      }
    });

    // 延迟激活动画
    setTimeout(() => popover.classList.add('active'), 10);
  }

  function closeWeatherPopover() {
    if (weatherPopover) {
      weatherPopover.classList.remove('active');
      setTimeout(() => {
        if (weatherPopover && weatherPopover.parentNode) {
          weatherPopover.parentNode.removeChild(weatherPopover);
        }
        weatherPopover = null;
      }, 150);
    }
  }

  /**
   * 更新天气图标显示
   */
  function updateWeatherIcon() {
    if (!weatherIcon) return;

    const weather = WEATHER_OPTIONS.find(w => w.id === selectedWeather);
    if (weather && weather.icon) {
      weatherIcon.textContent = weather.icon;
      weatherIcon.classList.add('has-weather');
    } else {
      weatherIcon.textContent = '';
      weatherIcon.classList.remove('has-weather');
    }
  }

  /**
   * 关闭所有 popover
   */
  function closeAllPopovers(e) {
    // 天气 popover
    if (weatherPopover && !weatherPopover.contains(e.target) && !weatherBtn.contains(e.target)) {
      closeWeatherPopover();
    }
  }

  /**
   * 初始化高度（三行）
   */
  function initHeight() {
    const minRows = parseInt(input.dataset.minRows) || 3;
    const lineHeight = parseInt(getComputedStyle(input).lineHeight) || 24;
    const paddingTop = parseInt(getComputedStyle(input).paddingTop) || 16;
    const paddingBottom = parseInt(getComputedStyle(input).paddingBottom) || 56;

    const initialHeight = minRows * lineHeight + paddingTop + paddingBottom;
    input.style.height = `${initialHeight}px`;
  }

  /**
   * 自动调整高度（根据内容）
   */
  function autoResize() {
    const minRows = parseInt(input.dataset.minRows) || 3;
    const maxRows = parseInt(input.dataset.maxRows) || 12;

    // 重置高度以计算 scrollHeight
    input.style.height = 'auto';

    // 计算行数
    const lineHeight = parseInt(getComputedStyle(input).lineHeight) || 24;
    const paddingTop = parseInt(getComputedStyle(input).paddingTop) || 16;
    const paddingBottom = parseInt(getComputedStyle(input).paddingBottom) || 56;
    const contentHeight = input.scrollHeight - paddingTop - paddingBottom;
    const rows = Math.ceil(contentHeight / lineHeight);

    // 限制行数
    const clampedRows = Math.max(minRows, Math.min(rows, maxRows));

    // 设置高度
    const newHeight = clampedRows * lineHeight + paddingTop + paddingBottom;
    input.style.height = `${newHeight}px`;

    // 如果超过最大高度，显示滚动条
    if (rows > maxRows) {
      input.style.overflowY = 'auto';
    } else {
      input.style.overflowY = 'hidden';
    }
  }

  /**
   * 重置高度
   */
  function resetHeight() {
    input.style.height = 'auto';
    input.style.overflowY = 'hidden';
  }

  /**
   * 处理键盘快捷键
   */
  function handleKeydown(event) {
    // Cmd/Ctrl + Enter 提交
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }

    // Esc 失焦
    if (event.key === 'Escape') {
      input.blur();
    }
  }

  /**
   * 处理提交
   */
  async function handleSubmit() {
    const content = input.value.trim();

    // 空内容不提交
    if (!content) {
      return;
    }

    // 添加提交状态
    container.classList.add('submitting');

    try {
      // 1. 创建新记录
      const newEntry = DiaryModels.createEntry(content);

      // 🆕 2. 检查是否有目标日期（从日历点击或跳转来的）
      const targetDate = DiaryApp.getTargetDate ? DiaryApp.getTargetDate() : null;

      // 🆕 3. 处理时间
      let entryDate;
      if (targetDate) {
        // 目标日期 + 自定义时间或默认中午
        const [year, month, day] = targetDate.split('-').map(Number);
        if (customTime) {
          const [hours, minutes] = customTime.split(':').map(Number);
          entryDate = new Date(year, month - 1, day, hours, minutes);
        } else {
          entryDate = new Date(year, month - 1, day, 12, 0);
        }
        // 清除目标日期
        if (DiaryApp.clearTargetDate) {
          DiaryApp.clearTargetDate();
        }
      } else if (customTime) {
        // 今天 + 自定义时间
        const today = new Date();
        const [hours, minutes] = customTime.split(':').map(Number);
        entryDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      } else {
        // 当前时间
        entryDate = new Date();
      }

      newEntry.createdAt = entryDate.getTime();
      newEntry.updatedAt = entryDate.getTime();

      // 🆕 4. 添加天气信息
      if (selectedWeather) {
        newEntry.weather = selectedWeather;
      }

      // 5. 保存到 localStorage
      DiaryStorage.addEntry(newEntry);

      // 6. 插入到时间轴（带动画）
      await insertToTimeline(newEntry);

      // 7. 重置输入框和状态
      reset();

      // 8. 刷新生命日历（新增了记录）
      if (typeof DiaryUI !== 'undefined' && DiaryUI.renderLifeCalendar) {
        DiaryUI.renderLifeCalendar();
      }

      console.log('✅ 新记录已保存:', newEntry);

    } catch (error) {
      console.error('❌ 提交失败:', error);
      alert('保存失败，请重试');
    } finally {
      // 移除提交状态
      container.classList.remove('submitting');
    }
  }

  /**
   * 插入到时间轴（带动画）
   */
  async function insertToTimeline(entry) {
    // 重新加载并渲染整个时间轴（使用现有的分组逻辑）
    const entries = DiaryStorage.getAllEntries();
    const timelineData = DiaryModels.groupEntriesByDate(entries);

    // 获取时间轴容器
    const timeline = document.getElementById('timeline');
    if (!timeline) {
      console.error('❌ 时间轴容器未找到');
      return;
    }

    // 暂存滚动位置
    const scrollY = window.pageYOffset;

    // 渲染时间轴
    DiaryUI.renderTimeline(timelineData);

    // 恢复滚动位置（避免跳动）
    window.scrollTo(0, scrollY);

    // 找到新插入的记录并添加动画
    const newEntryElement = timeline.querySelector(`[data-id="${entry.id}"]`);
    if (newEntryElement) {
      newEntryElement.classList.add('entry-fade-in');

      // 动画完成后移除 class
      setTimeout(() => {
        newEntryElement.classList.remove('entry-fade-in');
      }, 300);
    }
  }

  /**
   * 重置输入框
   */
  function reset() {
    input.value = '';
    resetHeight();

    // 重置状态
    customTime = null;
    selectedWeather = '';
    updateTime();
    updateWeatherIcon();

    // 延迟失焦，让用户看到提交成功的反馈
    setTimeout(() => {
      input.blur();  // 失焦，隐藏提交按钮
    }, 100);
  }

  /**
   * 公开 API
   */
  return {
    init: init
  };
})();

// 自动初始化（在 DOM 加载完成后）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', WritingEntry.init);
} else {
  WritingEntry.init();
}
