/**
 * app.js - 应用初始化与事件绑定
 * 职责：协调各模块，处理用户交互
 */

const DiaryApp = (function() {
  'use strict';

  /**
   * 应用初始化
   */
  function init() {
    console.log('📝 日记应用启动中...');

    // 初始化 UI 元素引用
    DiaryUI.initElements();

    // 🆕 初始化出生日期（首次使用时引导设置）
    initializeBirthDate();

    // 更新时间锚点
    updateTimeAnchor();

    // 🆕 渲染生命日历
    DiaryUI.renderLifeCalendar();

    // 加载并渲染数据
    refreshTimeline();

    // 绑定事件
    bindEvents();

    // 🆕 初始化心理联动（延迟执行，确保 DOM 已渲染）
    setTimeout(() => {
      initPsychologicalSync();
    }, 100);

    console.log('✅ 应用启动完成');
  }

  /**
   * 初始化出生日期（首次使用时）
   */
  function initializeBirthDate() {
    const birthDate = DiaryStorage.getBirthDate();

    if (!birthDate) {
      // 首次使用，引导用户设置出生日期
      const input = prompt(
        '欢迎使用生命日历\n\n' +
        '请输入你的出生日期（格式：YYYY-MM-DD）：\n' +
        '这将作为你的时间原点，用于计算年龄和生命进度。'
      );

      if (input && DiaryModels.isValidDate(input)) {
        DiaryStorage.setBirthDate(input);
        console.log('✅ 时间原点已设置:', input);
      } else if (input) {
        alert('日期格式错误，请重新输入');
        initializeBirthDate();  // 递归重试
      } else {
        // 用户取消，设置默认值（当前日期往前推20年）
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 20);
        const defaultBirthDate = DiaryModels.formatDateKey(defaultDate);
        DiaryStorage.setBirthDate(defaultBirthDate);
        console.log('⚠️ 使用默认出生日期:', defaultBirthDate);
      }
    }
  }

  /**
   * 更新顶部时间锚点（初始化时使用当前日期）
   */
  function updateTimeAnchor() {
    const now = new Date();

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[now.getDay()];

    // 更新 DOM
    const yearEl = document.querySelector('.time-anchor-year');
    const monthEl = document.querySelector('.time-anchor-month');
    const dayEl = document.querySelector('.time-anchor-day');
    const weekdayEl = document.querySelector('.time-anchor-weekday');

    if (yearEl) yearEl.textContent = year;
    if (monthEl) monthEl.textContent = month;
    if (dayEl) dayEl.textContent = day;
    if (weekdayEl) weekdayEl.textContent = weekday;
  }

  /**
   * 根据 dateKey 更新时间锚点显示（滚动时动态更新）
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   */
  function updateTimeAnchorFromDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];

    const yearEl = document.querySelector('.time-anchor-year');
    const monthEl = document.querySelector('.time-anchor-month');
    const dayEl = document.querySelector('.time-anchor-day');
    const weekdayEl = document.querySelector('.time-anchor-weekday');

    // 检测年份变化，临时强调
    const yearChanged = yearEl && yearEl.textContent !== String(year);

    if (yearEl) yearEl.textContent = year;
    if (monthEl) monthEl.textContent = month;
    if (dayEl) dayEl.textContent = day;
    if (weekdayEl) {
      // 🆕 添加相对时间感（距今天）
      const relativeTime = getRelativeTimeText(dateKey);
      weekdayEl.textContent = relativeTime || weekday;
    }

    // 🆕 年份变化时的微妙强调
    if (yearChanged && yearEl) {
      yearEl.classList.add('time-anchor-year--highlight');
      setTimeout(() => {
        yearEl.classList.remove('time-anchor-year--highlight');
      }, 1500);
    }
  }

  /**
   * 获取相对时间文本（距今天的天数）
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @returns {string} 相对时间文本
   */
  function getRelativeTimeText(dateKey) {
    const targetDate = new Date(dateKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = today - targetDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays === -1) return 'TOMORROW';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays}D AGO`;
    if (diffDays < -1 && diffDays >= -7) return `IN ${-diffDays}D`;

    // 超过7天，显示星期
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[targetDate.getDay()];
  }

  /**
   * 刷新时间轴
   */
  function refreshTimeline() {
    const entries = DiaryStorage.getAllEntries();
    const timelineData = DiaryModels.groupEntriesByDate(entries);
    DiaryUI.renderTimeline(timelineData);

    // 🆕 同时刷新生命日历（记录可能变化）
    DiaryUI.renderLifeCalendar();
  }

  /**
   * 绑定事件监听器
   */
  function bindEvents() {
    // 新建按钮（顶部）
    const btnNew = document.getElementById('btnNew');
    if (btnNew) {
      btnNew.addEventListener('click', handleNew);
    }

    // 底部浮动按钮
    const btnAddFloat = document.getElementById('btnAddFloat');
    if (btnAddFloat) {
      btnAddFloat.addEventListener('click', handleNew);
    }

    // 时间轴点击（事件委托）
    const timeline = document.getElementById('timeline');
    if (timeline) {
      timeline.addEventListener('click', handleTimelineClick);
      // 🆕 鼠标悬停联动（右侧 → 左侧）
      timeline.addEventListener('mouseover', handleTimelineHover);
    }

    // 🆕 生命日历点击（事件委托）
    const lifeCalendar = document.getElementById('lifeCalendarGrid');
    if (lifeCalendar) {
      lifeCalendar.addEventListener('click', handleCalendarClick);
      // 🆕 右键菜单（标记特殊日期）
      lifeCalendar.addEventListener('contextmenu', handleCalendarContextMenu);
      // 🆕 鼠标悬停联动（左侧 → 右侧）
      lifeCalendar.addEventListener('mouseover', handleCalendarHover);
    }

    // 编辑器按钮
    const btnSave = document.getElementById('btnSave');
    const btnDelete = document.getElementById('btnDelete');
    const btnClose = document.getElementById('btnClose');

    if (btnSave) btnSave.addEventListener('click', handleSave);
    if (btnDelete) btnDelete.addEventListener('click', handleDelete);
    if (btnClose) btnClose.addEventListener('click', handleClose);

    // 遮罩层点击关闭
    const overlay = document.getElementById('editorOverlay');
    if (overlay) {
      overlay.addEventListener('click', handleOverlayClick);
    }

    // 键盘快捷键
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * 处理新建记录
   */
  function handleNew() {
    DiaryUI.openEditor(null);
  }

  /**
   * 处理时间轴鼠标悬停（联动到左侧日历）
   * @param {Event} event - 鼠标悬停事件
   */
  function handleTimelineHover(event) {
    // 查找最近的日期分组
    const dateGroup = event.target.closest('.date-group');
    if (!dateGroup) return;

    const dateKey = dateGroup.dataset.date;
    if (!dateKey) return;

    // 防止频繁触发：使用防抖
    clearTimeout(window.timelineHoverTimeout);
    window.timelineHoverTimeout = setTimeout(() => {
      // 高亮左侧日历
      updateCalendarHighlight(dateKey);
      // 更新时间锚点
      updateTimeAnchorFromDate(dateKey);
    }, 50);  // 50ms 防抖延迟
  }

  /**
   * 处理时间轴点击（事件委托：天气选择器 / 记录）
   */
  function handleTimelineClick(event) {
    // 优先处理天气选择器点击
    const weatherBtn = event.target.closest('.weather-selector');
    if (weatherBtn) {
      handleWeatherClick(event, weatherBtn);
      return;
    }

    // 处理记录点击
    const entryElement = event.target.closest('.entry-item');
    if (entryElement) {
      handleEntryClick(entryElement);
    }
  }

  /**
   * 处理记录点击
   */
  function handleEntryClick(entryElement) {
    const id = entryElement.dataset.id;
    const entries = DiaryStorage.getAllEntries();
    const entry = entries.find(e => e.id === id);

    if (entry) {
      DiaryUI.openEditor(entry);
    }
  }

  /**
   * 处理天气选择器点击
   * @param {Event} event - 点击事件
   * @param {HTMLElement} weatherBtn - 天气按钮元素
   */
  function handleWeatherClick(event, weatherBtn) {
    event.stopPropagation();  // 防止触发其他点击事件

    const dateKey = weatherBtn.dataset.date;
    if (!dateKey) return;

    // 切换天气状态
    cycleWeather(dateKey, weatherBtn);
  }

  /**
   * 循环切换天气状态
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   * @param {HTMLElement} weatherBtn - 天气按钮元素
   */
  function cycleWeather(dateKey, weatherBtn) {
    const WEATHER_CYCLE = ['', 'sunny', 'cloudy', 'rainy', 'snowy'];

    const currentWeather = weatherBtn.dataset.weather || '';
    const currentIndex = WEATHER_CYCLE.indexOf(currentWeather);
    const nextIndex = (currentIndex + 1) % WEATHER_CYCLE.length;
    const nextWeather = WEATHER_CYCLE[nextIndex];

    // 保存到存储
    DiaryStorage.setDailyWeather(dateKey, nextWeather);

    // 更新 UI
    weatherBtn.dataset.weather = nextWeather;
    weatherBtn.innerHTML = DiaryUI.getWeatherIcon(nextWeather);
  }

  /**
   * 处理保存
   */
  function handleSave() {
    const overlay = document.getElementById('editorOverlay');
    const textarea = document.getElementById('editorTextarea');
    const content = textarea.value.trim();

    if (!content) {
      alert('内容不能为空');
      return;
    }

    const editingId = overlay.dataset.editingId;
    const prefilledDate = overlay.dataset.prefilledDate;

    if (editingId) {
      // 更新现有记录
      DiaryStorage.updateEntry(editingId, content);
    } else {
      // 创建新记录
      const newEntry = DiaryModels.createEntry(content);

      // 🆕 如果有预填日期（从日历跳转来的），使用预填日期替换当前时间
      if (prefilledDate) {
        newEntry.createdAt = parseInt(prefilledDate);
        newEntry.updatedAt = parseInt(prefilledDate);
        delete overlay.dataset.prefilledDate;
      }

      DiaryStorage.addEntry(newEntry);
    }

    // 刷新界面
    refreshTimeline();
    DiaryUI.closeEditor();
  }

  /**
   * 处理删除
   */
  function handleDelete() {
    if (!confirm('确定删除这条记录？')) {
      return;
    }

    const overlay = document.getElementById('editorOverlay');
    const editingId = overlay.dataset.editingId;

    if (editingId) {
      DiaryStorage.deleteEntry(editingId);
      refreshTimeline();
      DiaryUI.closeEditor();
    }
  }

  /**
   * 处理关闭
   */
  function handleClose() {
    DiaryUI.closeEditor();
  }

  /**
   * 处理遮罩层点击
   */
  function handleOverlayClick(event) {
    // 只有点击遮罩层本身时关闭（不包括子元素）
    if (event.target.id === 'editorOverlay') {
      DiaryUI.closeEditor();
    }
  }

  /**
   * 处理键盘快捷键
   */
  function handleKeydown(event) {
    // Esc 关闭编辑器
    if (event.key === 'Escape') {
      const overlay = document.getElementById('editorOverlay');
      if (overlay && overlay.classList.contains('active')) {
        DiaryUI.closeEditor();
      }
    }

    // Ctrl/Cmd + S 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      const overlay = document.getElementById('editorOverlay');
      if (overlay && overlay.classList.contains('active')) {
        handleSave();
      }
    }
  }

  /**
   * 初始化心理联动（左侧日历与中间时间轴的感知层联动）
   */
  function initPsychologicalSync() {
    const dateGroups = document.querySelectorAll('.date-group');
    if (!dateGroups || dateGroups.length === 0) {
      console.log('⚠️ 没有找到日期分组，跳过心理联动初始化');
      return;
    }

    let currentActiveDate = null;

    // 使用 IntersectionObserver 监听视口中心区域
    const observer = new IntersectionObserver(
      (entries) => {
        // 筛选出可见的元素
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        // 找到距离视口中心最近的元素
        const centerEntry = findCenterEntry(visibleEntries);
        if (!centerEntry) return;

        const dateKey = centerEntry.target.dataset.date;
        if (dateKey === currentActiveDate) return;

        // 更新日历高亮
        updateCalendarHighlight(dateKey);

        // 🆕 同步更新时间锚点（跟随阅读位置）
        updateTimeAnchorFromDate(dateKey);

        currentActiveDate = dateKey;
      },
      {
        // 只观察视口中心 20% 的区域（上下各 40% margin）
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    dateGroups.forEach(group => observer.observe(group));
    console.log('✅ 心理联动已启动');
  }

  /**
   * 从可见元素中找到距离视口中心最近的元素
   * @param {Array} entries - IntersectionObserver 的可见条目
   * @returns {object|null} 最接近中心的元素
   */
  function findCenterEntry(entries) {
    if (entries.length === 1) return entries[0];

    const viewportCenter = window.innerHeight / 2;
    let closestEntry = entries[0];
    let minDistance = Infinity;

    entries.forEach(entry => {
      const rect = entry.target.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestEntry = entry;
      }
    });

    return closestEntry;
  }

  /**
   * 更新日历高亮状态
   * @param {string} dateKey - 日期键（YYYY-MM-DD）
   */
  function updateCalendarHighlight(dateKey) {
    // 移除之前的高亮
    const previousActive = document.querySelector('.calendar-day--active');
    if (previousActive) {
      previousActive.classList.remove('calendar-day--active');
    }

    // 添加新的高亮
    const targetDay = document.querySelector(`.calendar-day[data-date="${dateKey}"]`);
    if (targetDay) {
      targetDay.classList.add('calendar-day--active');

      // 🆕 如果高亮日期不在可视区域，轻柔滚动到那里
      scrollCalendarToDate(targetDay);
    }
  }

  /**
   * 将左侧日历滚动到指定日期（如果不在可视区域）
   * @param {HTMLElement} targetDay - 目标日期元素
   */
  function scrollCalendarToDate(targetDay) {
    const calendar = document.querySelector('.life-calendar');
    if (!calendar) return;

    const calendarRect = calendar.getBoundingClientRect();
    const targetRect = targetDay.getBoundingClientRect();

    // 检查是否在可视区域内
    const isVisible =
      targetRect.top >= calendarRect.top &&
      targetRect.bottom <= calendarRect.bottom;

    if (!isVisible) {
      // 计算目标位置（居中显示）
      const targetOffsetTop = targetDay.offsetTop;
      const calendarHeight = calendar.clientHeight;
      const targetHeight = targetDay.clientHeight;
      const scrollTo = targetOffsetTop - (calendarHeight / 2) + (targetHeight / 2);

      // 平滑滚动
      calendar.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    }
  }

  /**
   * ========================================
   * 时间穿梭式跳转功能
   * ========================================
   */

  /**
   * 缓动函数：easeInOutCubic（慢→快→慢）
   * @param {number} t - 进度 (0-1)
   * @returns {number} 缓动后的进度 (0-1)
   */
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * 时间穿梭式平滑滚动
   * @param {number} targetY - 目标滚动位置
   * @param {number} duration - 持续时间（毫秒）
   * @param {Function} callback - 完成后回调
   */
  function timeTravelScroll(targetY, duration, callback) {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeInOutCubic 缓动
      const eased = easeInOutCubic(progress);
      const currentY = startY + distance * eased;

      window.scrollTo(0, currentY);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // 滚动完成
        if (callback) callback();
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * 根据距离计算持续时间
   * @param {number} distance - 滚动距离（像素）
   * @returns {number} 持续时间（毫秒）
   */
  function calculateDuration(distance) {
    if (distance < 1000) return 800;
    if (distance < 3000) return 1200;
    return 1500;
  }

  /**
   * 处理日历鼠标悬停（联动到右侧时间轴）
   * @param {Event} event - 鼠标悬停事件
   */
  function handleCalendarHover(event) {
    const dayElement = event.target.closest('.calendar-day');
    if (!dayElement || dayElement.classList.contains('calendar-day--empty')) {
      return;
    }

    const dateKey = dayElement.dataset.date;
    if (!dateKey) return;

    // 防止频繁触发：使用防抖
    clearTimeout(window.calendarHoverTimeout);
    window.calendarHoverTimeout = setTimeout(() => {
      // 高亮右侧时间轴对应日期
      highlightTimelineDate(dateKey);
      // 更新时间锚点
      updateTimeAnchorFromDate(dateKey);
    }, 50);  // 50ms 防抖延迟
  }

  /**
   * 高亮右侧时间轴中的日期组
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   */
  function highlightTimelineDate(dateKey) {
    // 移除之前的高亮
    const previousActive = document.querySelector('.date-group--active');
    if (previousActive) {
      previousActive.classList.remove('date-group--active');
    }

    // 查找对应的日期分组
    const targetDateGroup = document.querySelector(`.date-group[data-date="${dateKey}"]`);
    if (targetDateGroup) {
      // 添加高亮
      targetDateGroup.classList.add('date-group--active');

      // 平滑滚动到该日期（如果不在视野中）
      scrollTimelineToDate(targetDateGroup);
    }
  }

  /**
   * 将右侧时间轴滚动到指定日期（如果不在视野中）
   * @param {HTMLElement} targetDateGroup - 目标日期分组元素
   */
  function scrollTimelineToDate(targetDateGroup) {
    const rect = targetDateGroup.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const headerHeight = 48;
    const timeAnchorHeight = 64;
    const visibleTop = headerHeight + timeAnchorHeight;
    const visibleBottom = windowHeight;

    // 检查是否在可视区域内
    const isVisible = rect.top >= visibleTop && rect.bottom <= visibleBottom;

    if (!isVisible) {
      // 计算目标位置（居中显示）
      const currentScroll = window.pageYOffset;
      const targetY = currentScroll + rect.top - visibleTop - 100;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  }

  /**
   * 处理日历点击事件（事件委托）
   * @param {Event} event - 点击事件
   */
  function handleCalendarClick(event) {
    const dayElement = event.target.closest('.calendar-day');
    if (!dayElement) return;

    const dateKey = dayElement.dataset.date;
    if (dateKey) {
      handleCalendarDayClick(dateKey);
    }
  }

  /**
   * 处理日历某天的点击跳转
   * @param {string} dateKey - 目标日期 (YYYY-MM-DD)
   */
  function handleCalendarDayClick(dateKey) {
    // 立即高亮目标日期（预告）
    updateCalendarHighlight(dateKey);

    // 查找该日期是否有记录
    const dateGroup = document.querySelector(`.date-group[data-date="${dateKey}"]`);

    if (dateGroup) {
      // 有记录：滚动到该日期分组
      scrollToDateGroup(dateGroup);
    } else {
      // 无记录：滚动并提示
      scrollToEmptyDate(dateKey);
    }
  }

  /**
   * 滚动到已有记录的日期
   * @param {HTMLElement} dateGroup - 日期分组元素
   */
  function scrollToDateGroup(dateGroup) {
    const rect = dateGroup.getBoundingClientRect();
    const currentScroll = window.pageYOffset;

    // 目标位置：日期分组顶部 - header高度 - time-anchor高度 - 留白
    const headerHeight = 48;
    const timeAnchorHeight = 64;
    const padding = 80;
    const targetY = currentScroll + rect.top - headerHeight - timeAnchorHeight - padding;

    // 计算距离，动态调整持续时间
    const distance = Math.abs(targetY - currentScroll);
    const duration = calculateDuration(distance);

    timeTravelScroll(targetY, duration);
  }

  /**
   * 滚动到无记录的日期
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   */
  function scrollToEmptyDate(dateKey) {
    // 找到时间轴顶部位置
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const currentScroll = window.pageYOffset;
    const targetY = currentScroll + rect.top - 200;

    const distance = Math.abs(targetY - currentScroll);
    const duration = calculateDuration(distance);

    timeTravelScroll(targetY, duration, () => {
      // 滚动完成后的回调
      showEmptyDateHint(dateKey);
      setTimeout(() => {
        openEditorWithPrefilledDate(dateKey);
      }, 400);  // 等提示显示后再打开编辑器
    });
  }

  /**
   * 显示无记录提示
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   */
  function showEmptyDateHint(dateKey) {
    const hint = document.createElement('div');
    hint.className = 'empty-date-hint';
    hint.textContent = '这一天，还没有留下记录。';
    document.body.appendChild(hint);

    // 2秒后淡出并移除
    setTimeout(() => {
      hint.classList.add('empty-date-hint--fade-out');
      setTimeout(() => hint.remove(), 300);
    }, 2000);
  }


  /**
   * 处理日历右键菜单（标记/取消特殊日期）
   * @param {Event} event - 右键点击事件
   */
  function handleCalendarContextMenu(event) {
    event.preventDefault();  // 阻止默认右键菜单

    const dayElement = event.target.closest('.calendar-day');
    if (!dayElement || dayElement.classList.contains('calendar-day--empty')) {
      return;  // 空白方块不响应
    }

    const dateKey = dayElement.dataset.date;
    if (!dateKey) return;

    // 🆕 检查是否是生日（系统级，禁止修改）
    const birthDate = DiaryStorage.getBirthDate();
    if (birthDate && DiaryModels.isBirthday(dateKey, birthDate)) {
      const age = DiaryModels.getAge(birthDate, new Date(dateKey));
      alert(`这一天是您的生日（${age} 周岁）\n\n生日由系统自动标记，无法手动修改。`);
      return;
    }

    // 检查是否已标记
    const existingMilestone = DiaryStorage.getMilestone(dateKey);

    if (existingMilestone) {
      // 已标记：显示类型和标签，询问是否取消
      const typeLabel = existingMilestone.type === 'milestone' ? '纪念日' : '特殊日期';
      const displayLabel = existingMilestone.label || '(无备注)';
      if (confirm(`取消标记\n\n类型：${typeLabel}\n备注：${displayLabel}`)) {
        DiaryStorage.setMilestone(dateKey, null);
        // 刷新日历
        DiaryUI.renderLifeCalendar();
      }
    } else {
      // 未标记：先选择类型
      const typeChoice = prompt(
        '标记特殊日期\n\n' +
        '请选择类型：\n' +
        '1 = 纪念日（人生重要节点：毕业/入职/结婚/重大转折）\n' +
        '2 = 普通标记（值得记录但非节点：旅行/搬家/见面）\n\n' +
        '注：生日由系统自动标记，无需手动添加\n\n' +
        '输入 1 或 2：'
      );

      // 用户取消
      if (typeChoice === null) return;

      // 验证输入
      const type = typeChoice.trim() === '1' ? 'milestone' :
                   typeChoice.trim() === '2' ? 'special' : null;

      if (!type) {
        alert('输入无效，请输入 1 或 2');
        return;
      }

      // 🆕 检查是否是生日日期
      const birthDate = DiaryStorage.getBirthDate();
      if (birthDate && DiaryModels.isBirthday(dateKey, birthDate)) {
        alert('这一天是您的生日，由系统自动标记，无需手动添加。');
        return;
      }

      // 询问备注
      const typeLabel = type === 'milestone' ? '纪念日' : '普通标记';
      const label = prompt(
        `标记为：${typeLabel}\n\n` +
        '请输入备注（可选）：'
      );

      // 用户取消
      if (label === null) return;

      // 保存标记
      DiaryStorage.setMilestone(dateKey, {
        type: type,
        label: label.trim()
      });

      // 刷新日历
      DiaryUI.renderLifeCalendar();
    }
  }

  /**
   * 打开编辑器并预填日期
   * @param {string} dateKey - 日期键 (YYYY-MM-DD)
   */
  function openEditorWithPrefilledDate(dateKey) {
    const overlay = document.getElementById('editorOverlay');
    const textarea = document.getElementById('editorTextarea');
    const timeDisplay = document.getElementById('editorTime');
    const deleteBtn = document.getElementById('btnDelete');

    if (!overlay) return;

    // 显示编辑器
    overlay.classList.add('active');
    textarea.value = '';
    deleteBtn.style.display = 'none';
    delete overlay.dataset.editingId;

    // 预填日期（转换为该日中午12点的时间戳）
    const targetDate = new Date(dateKey + 'T12:00:00');
    const timestamp = targetDate.getTime();

    timeDisplay.textContent = DiaryModels.formatDate(timestamp);

    // 在 overlay 上存储目标日期，保存时使用
    overlay.dataset.prefilledDate = timestamp;

    // 初始化自动高度并聚焦输入框
    setTimeout(() => {
      const textarea = document.getElementById('editorTextarea');
      if (textarea && typeof DiaryUI !== 'undefined') {
        // 如果 DiaryUI 有公开的初始化方法，调用它
        // 否则直接聚焦
        textarea.focus();
      }
    }, 100);
  }

  // 公开接口
  return {
    init,
    refreshTimeline
  };
})();

// 启动应用
document.addEventListener('DOMContentLoaded', DiaryApp.init);
