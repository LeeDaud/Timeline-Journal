/**
 * ui.js - UI 渲染与 DOM 操作
 * 职责：根据数据生成 HTML 并更新 DOM
 */

const DiaryUI = (function() {
  'use strict';

  // DOM 元素引用（缓存，避免重复查询）
  const elements = {
    timeline: null,
    emptyState: null
  };

  /**
   * 初始化 DOM 元素引用
   */
  function initElements() {
    elements.timeline = document.getElementById('timeline');
    elements.emptyState = document.getElementById('emptyState');
  }

  /**
   * 生成单条记录的 HTML
   * @param {object} entry - 记录对象
   * @returns {string} HTML 字符串
   */
  function generateEntryHTML(entry) {
    const time = DiaryModels.formatTime(entry.createdAt);
    const content = escapeHTML(entry.content);

    // 检测内容长度，添加对应的 class
    const textLength = entry.content.trim().length;
    const lineCount = entry.content.split('\n').length;

    let lengthClass = '';
    if (textLength <= 30 && lineCount <= 2) {
      lengthClass = 'entry-item--short';   // 短句
    } else if (textLength > 100 || lineCount > 5) {
      lengthClass = 'entry-item--long';    // 长文
    }

    // 计算时间距离，设置透明度
    const now = Date.now();
    const daysDiff = Math.floor((now - entry.createdAt) / (1000 * 60 * 60 * 24));

    let timeOpacity = 0.5;  // 默认：更早的记录
    if (daysDiff === 0) {
      timeOpacity = 0.75;   // 今天
    } else if (daysDiff === 1) {
      timeOpacity = 0.6;    // 昨天
    }

    return `
      <div class="entry-item ${lengthClass}" data-id="${entry.id}">
        <div class="entry-time" style="opacity: ${timeOpacity}">${time}</div>
        <div class="entry-content">${content}</div>
      </div>
    `;
  }

  /**
   * 解析日期字符串为显示用的各个部分
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {object} 包含年、月、日、星期的对象
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

  /**
   * 生成日期分组的 HTML
   * @param {object} dateGroup - 日期分组对象
   * @returns {string} HTML 字符串
   */
  function generateDateGroupHTML(dateGroup) {
    const entriesHTML = dateGroup.entries
      .map(entry => generateEntryHTML(entry))
      .join('');

    // 🆕 获取该天的天气
    const weather = DiaryStorage.getDailyWeather(dateGroup.date);

    // 🆕 检查是否是生日（系统级，优先级最高）
    const birthDate = DiaryStorage.getBirthDate();
    const isBirthday = birthDate && DiaryModels.isBirthday(dateGroup.date, birthDate);

    // 🆕 检查是否是纪念日
    const milestone = DiaryStorage.getMilestone(dateGroup.date);
    const isAnniversary = !isBirthday && milestone && milestone.type === 'milestone';

    // 确定样式类
    let groupClass = 'date-group';
    let labelClass = 'date-label';
    let specialMark = '';

    if (isBirthday) {
      // 生日：最高优先级
      groupClass = 'date-group date-group--birthday';
      labelClass = 'date-label date-label--birthday';
      const age = DiaryModels.getAge(birthDate, new Date(dateGroup.date));
      specialMark = `<div class="birthday-mark" title="🎂 ${age} 周岁生日"></div>`;
    } else if (isAnniversary) {
      // 纪念日
      groupClass = 'date-group date-group--anniversary';
      labelClass = 'date-label date-label--anniversary';
      specialMark = '<div class="anniversary-mark" title="纪念日"></div>';
    }

    // 解析日期为新的结构化格式
    const dateParts = parseDateForDisplay(dateGroup.date);

    return `
      <div class="${groupClass}" data-date="${dateGroup.date}">
        ${specialMark}
        <div class="date-divider">
          <div class="date-header">
            <div class="${labelClass}">
              <span class="date-year">${dateParts.year}</span>
              <span class="date-month-day">
                ${dateParts.month}<span class="date-separator">月</span>${dateParts.day}<span class="date-separator date-separator--day">日</span>
              </span>
              <span class="date-weekday">${dateParts.weekday}</span>
            </div>
            <button class="weather-selector"
                    data-date="${dateGroup.date}"
                    data-weather="${weather}"
                    aria-label="选择天气">
              ${getWeatherIcon(weather)}
            </button>
          </div>
        </div>
        ${entriesHTML}
      </div>
    `;
  }

  /**
   * 生成"继续书写"区域的 HTML
   * @returns {string} HTML 字符串
   */
  function generateContinueWritingHTML() {
    return `
      <div class="timeline-continue-writing" id="continueWriting">
        <svg class="continue-writing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <div class="continue-writing-text">继续书写</div>
      </div>
    `;
  }

  /**
   * 绑定"继续书写"点击事件
   */
  function bindContinueWritingClick() {
    const continueBtn = document.getElementById('continueWriting');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        // 触发新建记录（与顶部按钮相同的行为）
        const btnNew = document.getElementById('btnNew');
        if (btnNew) {
          btnNew.click();
        }
      });
    }
  }

  /**
   * 渲染完整时间轴（包含年份分隔符）
   * @param {Array} timelineData - 时间轴数据
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

    // 🆕 生成 HTML（包含年份分隔符）
    const htmlParts = [];

    timelineData.forEach((dateGroup, index) => {
      // 检测跨年边界
      if (index > 0) {
        const prevYear = extractYear(timelineData[index - 1].date);
        const currYear = extractYear(dateGroup.date);

        if (prevYear !== currYear) {
          // 插入年份分隔符（显示刚结束的年份）
          htmlParts.push(generateYearDividerHTML(prevYear));
        }
      }

      // 渲染日期分组
      htmlParts.push(generateDateGroupHTML(dateGroup));
    });

    // 添加"继续书写"区域（时间轴自然延续）
    htmlParts.push(generateContinueWritingHTML());

    // 一次性插入 DOM
    elements.timeline.innerHTML = htmlParts.join('');

    // 绑定"继续书写"点击事件
    bindContinueWritingClick();

    console.log(`✅ 渲染完成：${timelineData.length} 个日期分组`);
  }

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
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的字符串
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 打开编辑器
   * @param {object|null} entry - 记录对象（null 表示新建）
   */
  function openEditor(entry = null) {
    const overlay = document.getElementById('editorOverlay');
    const textarea = document.getElementById('editorTextarea');
    const timeDisplay = document.getElementById('editorTime');
    const deleteBtn = document.getElementById('btnDelete');

    if (!overlay) return;

    // 显示编辑器
    overlay.classList.add('active');

    if (entry) {
      // 编辑模式
      textarea.value = entry.content;
      timeDisplay.textContent = DiaryModels.formatTime(entry.createdAt);
      deleteBtn.style.display = 'block';
      overlay.dataset.editingId = entry.id;
    } else {
      // 新建模式
      textarea.value = '';
      timeDisplay.textContent = DiaryModels.formatTime(Date.now());
      deleteBtn.style.display = 'none';
      delete overlay.dataset.editingId;
    }

    // 初始化自动高度并聚焦输入框
    setTimeout(() => {
      initAutoResize(textarea);
      textarea.focus();
    }, 100);
  }

  /**
   * 关闭编辑器
   */
  function closeEditor() {
    const overlay = document.getElementById('editorOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * 自动调整 textarea 高度
   * @param {HTMLTextAreaElement} textarea - 文本框元素
   */
  function autoResizeTextarea(textarea) {
    if (!textarea) return;

    // 重置高度，以便正确计算 scrollHeight
    textarea.style.height = 'auto';

    // 获取内容实际高度
    const scrollHeight = textarea.scrollHeight;

    // 设置最小高度（约 2-3 行）
    const minHeight = 80;  // px

    // 设置最大高度（约 16 行，避免页面失控）
    const maxHeight = 480; // px

    // 计算最终高度
    const finalHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    // 应用高度
    textarea.style.height = finalHeight + 'px';

    // 如果达到最大高度，显示滚动条
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }

  /**
   * 初始化 textarea 自动高度
   * @param {HTMLTextAreaElement} textarea - 文本框元素
   */
  function initAutoResize(textarea) {
    if (!textarea) return;

    // 监听输入事件
    textarea.addEventListener('input', function() {
      autoResizeTextarea(this);
    });

    // 监听粘贴事件
    textarea.addEventListener('paste', function() {
      setTimeout(() => {
        autoResizeTextarea(this);
      }, 0);
    });

    // 初始化时调整一次（编辑已有内容时）
    autoResizeTextarea(textarea);
  }

  /**
   * 渲染生命日历（以年龄为维度）
   */
  function renderLifeCalendar() {
    const grid = document.getElementById('lifeCalendarGrid');
    const headerEl = document.querySelector('.life-calendar-header');
    if (!grid) return;

    // 获取出生日期
    const birthDate = DiaryStorage.getBirthDate();
    if (!birthDate) {
      grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #aaa;">请设置出生日期</div>';
      return;
    }

    // 计算当前年龄
    const currentAge = DiaryModels.getAge(birthDate);

    // 根据设置确定展示范围
    const rangeConfig = DiaryStorage.getCalendarRange();
    let startAge, endAge;

    switch (rangeConfig) {
      case 'compact':
        // 紧凑：仅当前年龄
        startAge = currentAge;
        endAge = currentAge;
        break;
      case 'extended':
        // 扩展：当前 + 前两年
        startAge = Math.max(0, currentAge - 2);
        endAge = currentAge;
        break;
      case 'all':
        // 全部：从出生至今
        startAge = 0;
        endAge = currentAge;
        break;
      case 'default':
      default:
        // 默认：当前 + 上一年
        startAge = Math.max(0, currentAge - 1);
        endAge = currentAge;
        break;
    }

    // 获取所有记录
    const entries = DiaryStorage.getAllEntries();

    // 生成 HTML
    const htmlParts = [];

    for (let age = startAge; age <= endAge; age++) {
      const ageSection = generateAgeSectionHTML(birthDate, age, entries);
      htmlParts.push(ageSection);
    }

    grid.innerHTML = htmlParts.join('');
  }

  /**
   * 生成单个年龄段的HTML
   * @param {string} birthDate - 出生日期
   * @param {number} age - 年龄
   * @param {Array} entries - 所有日记记录
   * @returns {string} HTML字符串
   */
  function generateAgeSectionHTML(birthDate, age, entries) {
    const { ageLabel, yearLabel } = DiaryModels.getAgeYearLabel(birthDate, age);
    const weeks = generateAgeWeeksData(birthDate, age);

    // 标记有记录的日子
    markRecordedDaysInWeeks(weeks, entries);

    // 生成周行HTML
    const weeksHTML = weeks.map(week => generateWeekRowHTML(week)).join('');

    // 判断是否是当前年龄
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

  /**
   * 生成指定年龄的周数据
   * @param {string} birthDate - 出生日期
   * @param {number} age - 年龄
   * @returns {Array} 周数据数组
   */
  function generateAgeWeeksData(birthDate, age) {
    const { start, end } = DiaryModels.getAgeRange(birthDate, age);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 找到该年龄段的第一个周日
    const firstDay = new Date(start);
    const startWeekday = firstDay.getDay();
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() - startWeekday);

    const weeks = [];
    let currentDate = new Date(firstSunday);

    // 生成周行，直到超出年龄范围
    while (currentDate <= end) {
      const week = {
        weekNumber: DiaryModels.getWeekNumber(currentDate),
        days: []
      };

      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        const dateKey = DiaryModels.formatDateKey(date);

        // 判断是否在年龄范围内
        const isInRange = date >= start && date <= end;
        const isToday = date.getTime() === today.getTime();
        const isFuture = date > today;

        // 🆕 判断是否是生日（系统级）
        const isBirthdayDay = DiaryModels.isBirthday(dateKey, birthDate);

        week.days.push({
          date: date,
          dateKey: dateKey,
          isToday: isToday,
          isFuture: isFuture,
          isEmpty: !isInRange,
          hasEntry: false,
          age: isInRange ? age : null,
          isBirthday: isBirthdayDay  // 🆕 系统级标记
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push(week);

      // 如果整周都在范围外，停止生成
      if (week.days.every(day => day.isEmpty)) {
        break;
      }
    }

    return weeks;
  }

  /**
   * 获取日期所在的周数（ISO 8601 标准）
   * @param {Date} date - 日期对象
   * @returns {number} 周数 (1-53)
   */
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * 标记有记录的日子（周数据版本）
   */
  function markRecordedDaysInWeeks(weeks, entries) {
    const recordedDates = new Set(
      entries
        .filter(e => !e.deleted)
        .map(e => formatDateKey(new Date(e.createdAt)))
    );

    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    weeks.forEach(week => {
      week.days.forEach(day => {
        if (!day.isEmpty) {
          day.hasEntry = recordedDates.has(day.dateKey);

          // 标记当前月
          const year = day.date.getFullYear();
          const month = day.date.getMonth();
          day.isCurrentMonth = (year === currentYear && month === currentMonth);

          // 🆕 标记特殊日期（里程碑）
          const milestone = DiaryStorage.getMilestone(day.dateKey);
          day.isMilestone = !!milestone;
          day.milestoneType = milestone?.type || null;  // 'major_milestone' 或 'milestone'
          // 优先显示自定义标签，否则显示模板标签
          day.milestoneLabel = milestone?.customLabel || milestone?.templateLabel || milestone?.label || '';
        }
      });
    });
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 从周数据提取年份范围
   * @param {Array} weeks - 周数据数组
   * @returns {Array} 年份数组（去重排序）
   */
  function getYearRangeFromWeeks(weeks) {
    const years = new Set();
    weeks.forEach(week => {
      week.days.forEach(day => {
        if (!day.isEmpty) {
          years.add(day.date.getFullYear());
        }
      });
    });
    return Array.from(years).sort((a, b) => a - b);
  }

  /**
   * 生成周行的 HTML
   * @param {object} week - 周数据对象
   * @returns {string} HTML 字符串
   */
  function generateWeekRowHTML(week) {
    const weekNumber = week.weekNumber;

    // 检查这一周是否包含今天
    const isCurrentWeek = week.days.some(day => day.isToday);

    const daysHTML = week.days.map(day => {
      if (day.isEmpty) {
        // 未来的日期或空白方块
        return '<div class="calendar-day calendar-day--empty"></div>';
      }

      let classes = ['calendar-day'];

      // 🆕 生日优先级最高（系统级标记）
      if (day.isBirthday) {
        classes.push('calendar-day--birthday');
      }

      if (day.hasEntry) {
        classes.push('calendar-day--recorded');
      }

      if (day.isToday) {
        classes.push('calendar-day--today');
      }

      if (day.isCurrentMonth) {
        classes.push('calendar-day--current-month');
      }

      // 🆕 检测是否是月份第一天
      if (day.date.getDate() === 1) {
        classes.push('calendar-day--month-start');
      }

      // 🆕 标记特殊日期（只在非生日时显示）
      if (!day.isBirthday && day.isMilestone) {
        // 所有里程碑类型（major_milestone 和 milestone）都显示为 anniversary 样式
        classes.push('calendar-day--anniversary');
      }

      // tooltip 显示完整日期（含年份和星期）
      const dateStr = day.date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // 🆕 生日tooltip优先级最高
      let tooltipText = dateStr;
      if (day.isBirthday) {
        // 计算当年年龄
        const birthDate = DiaryStorage.getBirthDate();
        if (birthDate) {
          const age = DiaryModels.getAge(birthDate, day.date);
          tooltipText = `${dateStr}\n🎂 ${age} 周岁生日`;
        }
      } else if (day.milestoneLabel) {
        // 其他特殊日期标记
        tooltipText = `${dateStr}\n${day.milestoneLabel}`;
      }

      return `<div class="${classes.join(' ')}"
                   data-date="${day.dateKey}"
                   title="${tooltipText}"></div>`;
    }).join('');

    // 周行 class：如果是当前周则添加高亮
    const weekRowClasses = ['calendar-week-row'];
    if (isCurrentWeek) {
      weekRowClasses.push('calendar-week-row--current');
    }

    return `
      <div class="${weekRowClasses.join(' ')}" data-week="${weekNumber}">
        <div class="week-number">${weekNumber}</div>
        ${daysHTML}
      </div>
    `;
  }


  /**
   * 从日期键提取年份
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {number} 年份
   */
  function extractYear(dateKey) {
    return parseInt(dateKey.split('-')[0]);
  }

  /**
   * 获取天气图标 HTML
   * @param {string} weather - 天气类型
   * @returns {string} SVG HTML
   */
  function getWeatherIcon(weather) {
    const WEATHER_ICONS = {
      '': '', // 空状态通过 CSS ::before 显示圆点
      'sunny': `
        <svg viewBox="0 0 24 24" class="weather-icon">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `,
      'cloudy': `
        <svg viewBox="0 0 24 24" class="weather-icon">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
                fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      `,
      'rainy': `
        <svg viewBox="0 0 24 24" class="weather-icon">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
                fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="9" y1="19" x2="7" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="13" y1="19" x2="11" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="17" y1="19" x2="15" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `,
      'snowy': `
        <svg viewBox="0 0 24 24" class="weather-icon">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.76" y1="7.76" x2="16.24" y2="16.24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.76" y1="16.24" x2="16.24" y2="7.76" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <line x1="12" y1="5" x2="10" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="12" y1="5" x2="14" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="10" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="14" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5" y1="12" x2="7" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5" y1="12" x2="7" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="19" y1="12" x2="17" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="19" y1="12" x2="17" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `
    };

    return WEATHER_ICONS[weather] || '';
  }

  /**
   * 生成年份分隔符的 HTML（时间章节留白）
   * @param {number} year - 结束的年份
   * @returns {string} HTML 字符串
   */
  function generateYearDividerHTML(year) {
    return `
      <div class="year-divider" data-year="${year}">
        <div class="year-divider-number">${year}</div>
      </div>
    `;
  }

  // 公开接口
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
    getWeatherIcon  // 🆕 公开天气图标获取方法
  };
})();
