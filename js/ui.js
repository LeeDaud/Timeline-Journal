/**
 * ui.js - UI 渲染与 DOM 操作
 * 职责：根据数据生成 HTML 并更新 DOM
 *
 * 重构：Continuous Timeline Flow（连续时间流）
 * - 所有层级信息（年/月/日/记录）都挂在同一条时间轴脊柱上
 * - 删除块状日期分组、横向分割线、巨大年份背景
 * - 统一 TimelineRow 布局
 */

const DiaryUI = (function() {
  'use strict';

  // DOM 元素引用（缓存，避免重复查询）
  const elements = {
    timeline: null,
    emptyState: null
  };

  // ========================================
  // Timeline Item 类型常量
  // ========================================
  const ITEM_TYPE = {
    YEAR_MARKER: 'year',
    MONTH_MARKER: 'month',
    DAY_MARKER: 'day',
    ENTRY: 'entry'
  };

  /**
   * 初始化 DOM 元素引用
   */
  function initElements() {
    elements.timeline = document.getElementById('timeline');
    elements.emptyState = document.getElementById('emptyState');
  }

  // ========================================
  // 核心：将 dateGroups 转换为扁平的 timeline items
  // ========================================

  /**
   * 将按天分组的数据转换为连续的 timeline items
   * @param {Array} dateGroups - 按天分组的数据 [{date, entries}, ...]
   * @returns {Array} timeline items 数组
   */
  function generateTimelineItems(dateGroups) {
    if (!dateGroups || dateGroups.length === 0) return [];

    const items = [];
    let prevYear = null;
    let prevMonth = null;
    let prevDate = null;

    // 遍历每个日期分组
    dateGroups.forEach(dateGroup => {
      const [year, month, day] = dateGroup.date.split('-').map(Number);

      // 1) 检测年份变化 -> 插入 YearMarker
      if (prevYear !== null && prevYear !== year) {
        items.push({
          type: ITEM_TYPE.YEAR_MARKER,
          year: prevYear,
          isTransition: true  // 标记这是过渡年份（刚结束的）
        });
      }

      // 2) 检测月份变化 -> 插入 MonthMarker
      if (prevYear !== year || prevMonth !== month) {
        items.push({
          type: ITEM_TYPE.MONTH_MARKER,
          year: year,
          month: month
        });
      }

      // 3) 插入 DayMarker
      items.push({
        type: ITEM_TYPE.DAY_MARKER,
        date: dateGroup.date,
        year: year,
        month: month,
        day: day,
        weather: DiaryStorage.getDailyWeather(dateGroup.date),
        isBirthday: checkIsBirthday(dateGroup.date),
        isAnniversary: checkIsAnniversary(dateGroup.date),
        isToday: isToday(dateGroup.date)
      });

      // 4) 插入该日所有 Entry
      dateGroup.entries.forEach(entry => {
        items.push({
          type: ITEM_TYPE.ENTRY,
          entry: entry,
          date: dateGroup.date
        });
      });

      prevYear = year;
      prevMonth = month;
      prevDate = dateGroup.date;
    });

    return items;
  }

  /**
   * 检查是否是生日
   */
  function checkIsBirthday(dateKey) {
    const birthDate = DiaryStorage.getBirthDate();
    return birthDate && DiaryModels.isBirthday(dateKey, birthDate);
  }

  /**
   * 检查是否是纪念日
   */
  function checkIsAnniversary(dateKey) {
    const milestone = DiaryStorage.getMilestone(dateKey);
    return milestone && milestone.type === 'milestone';
  }

  /**
   * 检查是否是今天
   */
  function isToday(dateKey) {
    const today = DiaryModels.formatDateKey(new Date());
    return dateKey === today;
  }

  // ========================================
  // HTML 生成函数：四种 Timeline Row
  // ========================================

  /**
   * 生成年份标记 HTML
   * 双环圆点，低对比度年份文字
   */
  function generateYearMarkerHTML(item) {
    return `
      <div class="timeline-row timeline-row--year" data-year="${item.year}">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--year"></div>
        </div>
        <div class="timeline-content">
          <span class="marker-year">${item.year}</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成月份标记 HTML
   * 中等圆点，月份标签
   */
  function generateMonthMarkerHTML(item) {
    const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return `
      <div class="timeline-row timeline-row--month" data-year="${item.year}" data-month="${item.month}">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--month"></div>
        </div>
        <div class="timeline-content">
          <span class="marker-month">${monthNames[item.month]}</span>
          <span class="marker-month-year">${item.year}</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成日期标记 HTML
   * 小圆点，日期 + 星期
   */
  function generateDayMarkerHTML(item) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(item.year, item.month - 1, item.day);
    const weekday = weekdays[date.getDay()];

    // 特殊日期样式
    let rowClass = 'timeline-row timeline-row--day';
    let specialBadge = '';

    if (item.isToday) {
      rowClass += ' timeline-row--today';
    }
    if (item.isBirthday) {
      rowClass += ' timeline-row--birthday';
      const birthDate = DiaryStorage.getBirthDate();
      if (birthDate) {
        const age = DiaryModels.getAge(birthDate, date);
        specialBadge = `<span class="marker-badge marker-badge--birthday">${age}岁</span>`;
      }
    } else if (item.isAnniversary) {
      rowClass += ' timeline-row--anniversary';
      const milestone = DiaryStorage.getMilestone(item.date);
      if (milestone && milestone.customLabel) {
        specialBadge = `<span class="marker-badge marker-badge--anniversary">${milestone.customLabel}</span>`;
      }
    }

    return `
      <div class="${rowClass}" data-date="${item.date}">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--day${item.isToday ? ' timeline-dot--today' : ''}"></div>
        </div>
        <div class="timeline-content">
          <span class="marker-day">${item.day}</span>
          <span class="marker-weekday">${weekday}</span>
          ${specialBadge}
        </div>
      </div>
    `;
  }

  /**
   * 生成记录行 HTML
   * 最小圆点，玻璃质感卡片
   */
  function generateEntryRowHTML(item) {
    const entry = item.entry;
    const time = DiaryModels.formatTime(entry.createdAt);
    const content = escapeHTML(entry.content);

    // 检测内容长度
    const textLength = entry.content.trim().length;
    const lineCount = entry.content.split('\n').length;

    let lengthClass = '';
    if (textLength <= 30 && lineCount <= 2) {
      lengthClass = 'entry-card--short';
    } else if (textLength > 100 || lineCount > 5) {
      lengthClass = 'entry-card--long';
    }

    // 计算时间距离，设置透明度
    const now = Date.now();
    const daysDiff = Math.floor((now - entry.createdAt) / (1000 * 60 * 60 * 24));
    let timeOpacity = 0.5;
    if (daysDiff === 0) timeOpacity = 0.75;
    else if (daysDiff === 1) timeOpacity = 0.6;

    // 天气
    let weatherHTML = '';
    if (entry.weather) {
      const weatherIcons = {
        sunny: '晴', cloudy: '阴', rainy: '雨',
        snowy: '雪', foggy: '雾', windy: '风', stormy: '雷'
      };
      const icon = weatherIcons[entry.weather] || '';
      if (icon) {
        weatherHTML = `<span class="entry-weather">${icon}</span>`;
      }
    }

    return `
      <div class="timeline-row timeline-row--entry" data-date="${item.date}">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--entry"></div>
        </div>
        <div class="timeline-content">
          <div class="entry-card ${lengthClass}" data-id="${entry.id}">
            <div class="entry-meta">
              <span class="entry-time" style="opacity: ${timeOpacity}">${time}</span>
              ${weatherHTML}
            </div>
            <div class="entry-content">${content}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成 Ghost DayMarker HTML（无记录时的临时标记）
   */
  function generateGhostDayMarkerHTML(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(year, month - 1, day);
    const weekday = weekdays[date.getDay()];
    const isToday_ = isToday(dateKey);

    return `
      <div class="timeline-row timeline-row--day timeline-row--ghost${isToday_ ? ' timeline-row--today' : ''}"
           data-date="${dateKey}" id="ghostDayMarker">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--day timeline-dot--ghost${isToday_ ? ' timeline-dot--today' : ''}"></div>
        </div>
        <div class="timeline-content">
          <span class="marker-day">${day}</span>
          <span class="marker-weekday">${weekday}</span>
          <span class="marker-ghost-hint">无记录</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成"继续书写"区域的 HTML
   */
  function generateContinueWritingHTML() {
    return `
      <div class="timeline-row timeline-row--continue" id="continueWriting">
        <div class="timeline-spine">
          <div class="timeline-dot timeline-dot--continue"></div>
        </div>
        <div class="timeline-content">
          <div class="continue-writing">
            <svg class="continue-writing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span class="continue-writing-text">继续书写</span>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================
  // 渲染函数
  // ========================================

  /**
   * 渲染完整时间轴（连续时间流模式）
   * @param {Array} timelineData - 时间轴数据（按天分组）
   */
  function renderTimeline(timelineData) {
    if (!elements.timeline) {
      initElements();
    }

    // 空状态处理
    if (!timelineData || timelineData.length === 0) {
      showEmptyState();
      return;
    }

    hideEmptyState();

    // 1. 转换为连续的 timeline items
    const items = generateTimelineItems(timelineData);

    // 2. 生成 HTML
    const htmlParts = items.map(item => {
      switch (item.type) {
        case ITEM_TYPE.YEAR_MARKER:
          return generateYearMarkerHTML(item);
        case ITEM_TYPE.MONTH_MARKER:
          return generateMonthMarkerHTML(item);
        case ITEM_TYPE.DAY_MARKER:
          return generateDayMarkerHTML(item);
        case ITEM_TYPE.ENTRY:
          return generateEntryRowHTML(item);
        default:
          return '';
      }
    });

    // 3. 添加"继续书写"区域
    htmlParts.push(generateContinueWritingHTML());

    // 4. 一次性插入 DOM
    elements.timeline.innerHTML = htmlParts.join('');

    // 5. 绑定事件
    bindContinueWritingClick();
    bindEntryCardClick();

    console.log(`✅ 渲染完成：${items.length} 个时间线项目`);
  }

  /**
   * 绑定"继续书写"点击事件
   */
  function bindContinueWritingClick() {
    const continueBtn = document.getElementById('continueWriting');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        const btnNew = document.getElementById('btnNew');
        if (btnNew) btnNew.click();
      });
    }
  }

  /**
   * 绑定记录卡片点击事件
   */
  function bindEntryCardClick() {
    const cards = elements.timeline.querySelectorAll('.entry-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (id && typeof DiaryApp !== 'undefined' && DiaryApp.openEntryEditor) {
          DiaryApp.openEntryEditor(id);
        }
      });
    });
  }

  /**
   * 插入 Ghost DayMarker（跳转到无记录日期时）
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {HTMLElement} 插入的元素
   */
  function insertGhostDayMarker(dateKey) {
    // 先移除已有的 ghost marker
    removeGhostDayMarker();

    if (!elements.timeline) return null;

    // 找到应该插入的位置
    const rows = elements.timeline.querySelectorAll('.timeline-row[data-date]');
    let insertBefore = null;

    for (const row of rows) {
      const rowDate = row.dataset.date;
      if (rowDate && rowDate < dateKey) {
        insertBefore = row;
        break;
      }
    }

    // 创建 ghost marker
    const ghostHTML = generateGhostDayMarkerHTML(dateKey);
    const temp = document.createElement('div');
    temp.innerHTML = ghostHTML.trim();
    const ghostEl = temp.firstChild;

    if (insertBefore) {
      insertBefore.parentNode.insertBefore(ghostEl, insertBefore);
    } else {
      // 插入到开头（时间轴顶部）
      elements.timeline.insertBefore(ghostEl, elements.timeline.firstChild);
    }

    return ghostEl;
  }

  /**
   * 移除 Ghost DayMarker
   */
  function removeGhostDayMarker() {
    const ghost = document.getElementById('ghostDayMarker');
    if (ghost) {
      ghost.parentNode.removeChild(ghost);
    }
  }

  /**
   * 滚动到指定日期
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {boolean} 是否找到目标
   */
  function scrollToDate(dateKey) {
    if (!elements.timeline) return false;

    // 先尝试找 DayMarker
    let target = elements.timeline.querySelector(`.timeline-row--day[data-date="${dateKey}"]`);

    // 如果没有 DayMarker，找该日第一条 Entry
    if (!target) {
      target = elements.timeline.querySelector(`.timeline-row--entry[data-date="${dateKey}"]`);
    }

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 添加高亮动画
      target.classList.add('timeline-row--highlight');
      setTimeout(() => target.classList.remove('timeline-row--highlight'), 2000);
      return true;
    }

    return false;
  }

  // ========================================
  // 工具函数
  // ========================================

  /**
   * 显示空状态
   */
  function showEmptyState() {
    if (elements.emptyState) {
      elements.emptyState.style.display = 'block';
    }
    if (elements.timeline) {
      elements.timeline.innerHTML = '';
    }
  }

  /**
   * 隐藏空状态
   */
  function hideEmptyState() {
    if (elements.emptyState) {
      elements.emptyState.style.display = 'none';
    }
  }

  /**
   * HTML 转义（防止 XSS 攻击）
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 解析日期字符串为显示用的各个部分
   */
  function parseDateForDisplay(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    return {
      year: year,
      month: month,
      day: day,
      weekday: weekdays[date.getDay()]
    };
  }

  // ========================================
  // 编辑器相关（保持不变）
  // ========================================

  function openEditor(entry = null) {
    const overlay = document.getElementById('editorOverlay');
    const textarea = document.getElementById('editorTextarea');
    const timeDisplay = document.getElementById('editorTime');
    const deleteBtn = document.getElementById('btnDelete');

    if (!overlay) return;

    overlay.classList.add('active');

    if (entry) {
      textarea.value = entry.content;
      timeDisplay.textContent = DiaryModels.formatTime(entry.createdAt);
      deleteBtn.style.display = 'block';
      overlay.dataset.editingId = entry.id;
    } else {
      textarea.value = '';
      timeDisplay.textContent = DiaryModels.formatTime(Date.now());
      deleteBtn.style.display = 'none';
      delete overlay.dataset.editingId;
    }

    setTimeout(() => {
      initAutoResize(textarea);
      textarea.focus();
    }, 100);
  }

  function closeEditor() {
    const overlay = document.getElementById('editorOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 80;
    const maxHeight = 480;
    const finalHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = finalHeight + 'px';
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  function initAutoResize(textarea) {
    if (!textarea) return;
    textarea.addEventListener('input', function() {
      autoResizeTextarea(this);
    });
    textarea.addEventListener('paste', function() {
      setTimeout(() => autoResizeTextarea(this), 0);
    });
    autoResizeTextarea(textarea);
  }

  // ========================================
  // 生命日历相关（保持不变）
  // ========================================

  function renderLifeCalendar() {
    const grid = document.getElementById('lifeCalendarGrid');
    if (!grid) return;

    const birthDate = DiaryStorage.getBirthDate();
    if (!birthDate) {
      grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #aaa;">请设置出生日期</div>';
      return;
    }

    const currentAge = DiaryModels.getAge(birthDate);
    const rangeConfig = DiaryStorage.getCalendarRange();
    let startAge, endAge;

    switch (rangeConfig) {
      case 'compact':
        startAge = currentAge;
        endAge = currentAge;
        break;
      case 'extended':
        startAge = Math.max(0, currentAge - 2);
        endAge = currentAge;
        break;
      case 'all':
        startAge = 0;
        endAge = currentAge;
        break;
      default:
        startAge = Math.max(0, currentAge - 1);
        endAge = currentAge;
        break;
    }

    const entries = DiaryStorage.getAllEntries();
    const htmlParts = [];

    for (let age = startAge; age <= endAge; age++) {
      const ageSection = generateAgeSectionHTML(birthDate, age, entries);
      htmlParts.push(ageSection);
    }

    grid.innerHTML = htmlParts.join('');
  }

  function generateAgeSectionHTML(birthDate, age, entries) {
    const { ageLabel, yearLabel } = DiaryModels.getAgeYearLabel(birthDate, age);
    const weeks = generateAgeWeeksData(birthDate, age);
    markRecordedDaysInWeeks(weeks, entries);
    const weeksHTML = weeks.map(week => generateWeekRowHTML(week)).join('');
    const currentAge = DiaryModels.getAge(birthDate);
    const isCurrentAge = age === currentAge;
    const agePrimaryClass = isCurrentAge ? 'age-primary age-primary--current' : 'age-primary';

    return `
      <div class="age-section" data-age="${age}">
        <div class="age-header">
          <span class="${agePrimaryClass}">${ageLabel}</span>
          <span class="age-secondary">${yearLabel}</span>
        </div>
        <div class="age-calendar-grid">
          ${weeksHTML}
        </div>
      </div>
    `;
  }

  function generateAgeWeeksData(birthDate, age) {
    const { start, end } = DiaryModels.getAgeRange(birthDate, age);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(start);
    const startWeekday = firstDay.getDay();
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() - startWeekday);

    const weeks = [];
    let currentDate = new Date(firstSunday);

    while (currentDate <= end) {
      const week = {
        weekNumber: DiaryModels.getWeekNumber(currentDate),
        days: []
      };

      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        const dateKey = DiaryModels.formatDateKey(date);
        const isInRange = date >= start && date <= end;
        const isToday_ = date.getTime() === today.getTime();
        const isFuture = date > today;
        const isBirthdayDay = DiaryModels.isBirthday(dateKey, birthDate);

        week.days.push({
          date: date,
          dateKey: dateKey,
          isToday: isToday_,
          isFuture: isFuture,
          isEmpty: !isInRange,
          hasEntry: false,
          age: isInRange ? age : null,
          isBirthday: isBirthdayDay
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push(week);
      if (week.days.every(day => day.isEmpty)) break;
    }

    return weeks;
  }

  function markRecordedDaysInWeeks(weeks, entries) {
    const recordedDates = new Set(
      entries.filter(e => !e.deleted).map(e => formatDateKey(new Date(e.createdAt)))
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    weeks.forEach(week => {
      week.days.forEach(day => {
        if (!day.isEmpty) {
          day.hasEntry = recordedDates.has(day.dateKey);
          day.isCurrentMonth = (day.date.getFullYear() === currentYear && day.date.getMonth() === currentMonth);
          const milestone = DiaryStorage.getMilestone(day.dateKey);
          day.isMilestone = !!milestone;
          day.milestoneType = milestone?.type || null;
          day.milestoneLabel = milestone?.customLabel || milestone?.templateLabel || milestone?.label || '';
        }
      });
    });
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateWeekRowHTML(week) {
    const isCurrentWeek = week.days.some(day => day.isToday);

    const daysHTML = week.days.map(day => {
      if (day.isEmpty) {
        return '<div class="calendar-day calendar-day--empty"></div>';
      }

      let classes = ['calendar-day'];

      if (day.isBirthday) classes.push('calendar-day--birthday');
      if (day.hasEntry) classes.push('calendar-day--recorded');
      if (day.isToday) classes.push('calendar-day--today');
      if (day.isCurrentMonth) classes.push('calendar-day--current-month');
      if (day.date.getDate() === 1) classes.push('calendar-day--month-start');
      if (!day.isBirthday && day.isMilestone) classes.push('calendar-day--anniversary');

      const dateStr = day.date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      let tooltipText = dateStr;
      if (day.isBirthday) {
        const birthDate = DiaryStorage.getBirthDate();
        if (birthDate) {
          const age = DiaryModels.getAge(birthDate, day.date);
          tooltipText = `${dateStr}\n🎂 ${age} 周岁生日`;
        }
      } else if (day.milestoneLabel) {
        tooltipText = `${dateStr}\n${day.milestoneLabel}`;
      }

      return `<div class="${classes.join(' ')}" data-date="${day.dateKey}" title="${tooltipText}"></div>`;
    }).join('');

    const weekRowClasses = ['calendar-week-row'];
    if (isCurrentWeek) weekRowClasses.push('calendar-week-row--current');

    return `
      <div class="${weekRowClasses.join(' ')}" data-week="${week.weekNumber}">
        <div class="week-number">${week.weekNumber}</div>
        ${daysHTML}
      </div>
    `;
  }

  // ========================================
  // 天气图标（保持不变）
  // ========================================

  function getWeatherIcon(weather) {
    const WEATHER_ICONS = {
      '': '',
      'sunny': `<svg viewBox="0 0 24 24" class="weather-icon"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      'cloudy': `<svg viewBox="0 0 24 24" class="weather-icon"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
      'rainy': `<svg viewBox="0 0 24 24" class="weather-icon"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="9" y1="19" x2="7" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="13" y1="19" x2="11" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      'snowy': `<svg viewBox="0 0 24 24" class="weather-icon"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
    };
    return WEATHER_ICONS[weather] || '';
  }

  // ========================================
  // 兼容性：保留旧接口
  // ========================================

  function generateEntryHTML(entry) {
    return generateEntryRowHTML({ type: ITEM_TYPE.ENTRY, entry: entry, date: '' });
  }

  function generateDateGroupHTML(dateGroup) {
    // 兼容旧调用，返回所有 entry 的 HTML
    return dateGroup.entries.map(entry => generateEntryHTML(entry)).join('');
  }

  // ========================================
  // 公开接口
  // ========================================

  return {
    initElements,
    renderTimeline,
    showEmptyState,
    hideEmptyState,
    openEditor,
    closeEditor,
    generateEntryHTML,
    generateDateGroupHTML,
    renderLifeCalendar,
    getWeatherIcon,
    // 新增接口
    scrollToDate,
    insertGhostDayMarker,
    removeGhostDayMarker
  };
})();
