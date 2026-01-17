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

    // 🆕 绑定日期跳转和范围设置按钮
    bindDateJumpButton();
    bindRangeSettingsButton();
    bindDateHintClear();

    // 🆕 点击外部关闭 popover
    document.addEventListener('click', closeAllPopovers);

    // 🆕 初始化心理联动（延迟执行，确保 DOM 已渲染）
    setTimeout(() => {
      initPsychologicalSync();
      // 🆕 初始加载时滚动到今天
      scrollCalendarToToday();
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
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === -1) return '明天';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays}天前`;
    if (diffDays < -1 && diffDays >= -7) return `${-diffDays}天后`;

    // 超过7天，显示星期
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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
    // 模式切换按钮
    bindModeToggle();

    // 🆕 移除旧的新建按钮（改用顶部写作入口）
    // 新建按钮（顶部）- 已移除
    // const btnNew = document.getElementById('btnNew');
    // if (btnNew) {
    //   btnNew.addEventListener('click', handleNew);
    // }

    // 底部浮动按钮 - 已移除
    // const btnAddFloat = document.getElementById('btnAddFloat');
    // if (btnAddFloat) {
    //   btnAddFloat.addEventListener('click', handleNew);
    // }

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
   * 处理新建记录（已废弃，改用顶部写作入口）
   * 保留此函数以防后续需要
   */
  // function handleNew() {
  //   DiaryUI.openEditor(null);
  // }

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

    // 更新时间锚点
    updateTimeAnchorFromDate(dateKey);

    // 查找该日期是否有记录
    const dateGroup = document.querySelector(`.date-group[data-date="${dateKey}"]`);

    if (dateGroup) {
      // 有记录：滚动到该日期分组
      scrollToDateGroup(dateGroup);
    } else {
      // 无记录：激活写作入口并设置目标日期（替代原来的弹窗）
      activateWritingEntryWithDate(dateKey);
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
   * ========================================
   * 右键菜单系统（特殊日期标记）
   * ========================================
   */

  // 模板定义：Major Milestones（重大里程碑，≤7个）
  const MAJOR_MILESTONE_TEMPLATES = [
    { id: 'graduation', icon: '🎓', label: '毕业/深造', description: '学业结束或进入新的学习阶段' },
    { id: 'first_job', icon: '💼', label: '首份工作', description: '职业生涯的开始' },
    { id: 'relocation', icon: '🏠', label: '重大搬迁', description: '搬到新城市或国家' },
    { id: 'relationship_start', icon: '❤️', label: '恋爱/结婚', description: '重要关系的开始' },
    { id: 'relationship_end', icon: '💔', label: '分手/离别', description: '重要关系的结束' },
    { id: 'life_turning', icon: '🌟', label: '人生转折', description: '改变人生轨迹的重大事件' },
    { id: 'custom', icon: '✨', label: '自定义', description: '输入你的重要节点' }
  ];

  // 模板定义：Milestones（纪念日，≤20个）
  const MILESTONE_TEMPLATES = [
    { id: 'important_decision', icon: '🤔', label: '重要决定', description: '做出了关键的选择' },
    { id: 'restart', icon: '🔄', label: '重启/新开始', description: '开始新的尝试' },
    { id: 'mindset_shift', icon: '💡', label: '认知转变', description: '思维方式的改变' },
    { id: 'new_direction', icon: '🧭', label: '新的方向', description: '找到新的目标或路径' },
    { id: 'deep_impact', icon: '📍', label: '深刻影响', description: '对你产生深远影响的事' },
    { id: 'achievement', icon: '🏆', label: '成就/突破', description: '完成重要目标' },
    { id: 'significant_event', icon: '📌', label: '重要事件', description: '值得记录的特殊经历' },
    { id: 'custom', icon: '✨', label: '自定义', description: '输入你的纪念日' }
  ];

  // 当前菜单状态
  let currentContextMenu = null;
  let currentMenuDateKey = null;
  let currentMenuType = null;

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

    // 检查是否是生日（系统级，禁止修改）
    const birthDate = DiaryStorage.getBirthDate();
    if (birthDate && DiaryModels.isBirthday(dateKey, birthDate)) {
      const age = DiaryModels.getAge(birthDate, new Date(dateKey));
      alert(`这一天是您的生日（${age} 周岁）\n\n生日由系统自动标记，无法手动修改。`);
      return;
    }

    // 关闭已有菜单
    closeContextMenu();

    // 保存当前日期
    currentMenuDateKey = dateKey;

    // 检查是否已标记
    const existingMilestone = DiaryStorage.getMilestone(dateKey);

    if (existingMilestone) {
      // 已标记：显示删除菜单
      showRemoveMenu(dateKey, existingMilestone, event.clientX, event.clientY);
    } else {
      // 未标记：显示类型选择菜单
      showTypeSelectionMenu(dateKey, event.clientX, event.clientY);
    }
  }

  /**
   * 显示类型选择菜单（第一级：Major Milestone / Milestone）
   */
  function showTypeSelectionMenu(dateKey, x, y) {
    const menu = createContextMenu(dateKey, x, y);

    // Major Milestone 选项
    const majorItem = createMenuItem('🏛️', '重大里程碑', '人生转折点（最多7个）', () => {
      // 检查数量限制
      const existingCount = countMilestonesByType('major_milestone');
      if (existingCount >= 7) {
        closeContextMenu();
        setTimeout(() => {
          alert('重大里程碑已达上限（7个）\n\n建议：精选最重要的人生节点，保持克制。');
        }, 200);
        return;
      }

      currentMenuType = 'major_milestone';
      closeContextMenu();

      // 延迟打开第二级菜单，让关闭动画完成
      setTimeout(() => {
        showTemplateSelectionMenu(dateKey, 'major_milestone', x, y);
      }, 180);
    });

    menu.appendChild(majorItem);

    // Milestone 选项
    const milestoneItem = createMenuItem('📍', '纪念日', '值得记录的日子（最多20个）', () => {
      // 检查数量限制
      const existingCount = countMilestonesByType('milestone');
      if (existingCount >= 20) {
        closeContextMenu();
        setTimeout(() => {
          alert('纪念日已达上限（20个）\n\n建议：保留最有意义的记录，定期回顾和精简。');
        }, 200);
        return;
      }

      currentMenuType = 'milestone';
      closeContextMenu();

      // 延迟打开第二级菜单，让关闭动画完成
      setTimeout(() => {
        showTemplateSelectionMenu(dateKey, 'milestone', x, y);
      }, 180);
    });

    menu.appendChild(milestoneItem);

    document.body.appendChild(menu);

    // 延迟激活（动画效果）
    setTimeout(() => menu.classList.add('active'), 10);
  }

  /**
   * 显示模板选择菜单（第二级：具体模板）
   */
  function showTemplateSelectionMenu(dateKey, type, x, y) {
    const templates = type === 'major_milestone' ? MAJOR_MILESTONE_TEMPLATES : MILESTONE_TEMPLATES;
    const menu = createContextMenu(dateKey, x, y);

    // 返回按钮
    const backButton = document.createElement('div');
    backButton.className = 'context-menu-back';
    backButton.innerHTML = '<span>←</span><span>返回</span>';
    backButton.addEventListener('click', (event) => {
      event.stopPropagation();  // 阻止事件冒泡
      closeContextMenu();

      // 延迟打开返回菜单
      setTimeout(() => {
        showTypeSelectionMenu(dateKey, x, y);
      }, 180);
    });
    menu.appendChild(backButton);

    // 模板选项
    templates.forEach(template => {
      const item = createMenuItem(template.icon, template.label, template.description, () => {
        handleTemplateSelect(dateKey, type, template);
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // 延迟激活（动画效果）
    setTimeout(() => menu.classList.add('active'), 10);
  }

  /**
   * 显示删除菜单
   */
  function showRemoveMenu(dateKey, milestone, x, y) {
    const menu = createContextMenu(dateKey, x, y);

    // 显示当前标记信息
    const typeLabel = milestone.type === 'major_milestone' ? '重大里程碑' : '纪念日';
    const displayLabel = milestone.customLabel || milestone.templateLabel || '(无标签)';

    const infoItem = document.createElement('div');
    infoItem.className = 'context-menu-item';
    infoItem.style.cursor = 'default';
    infoItem.style.pointerEvents = 'none';
    infoItem.innerHTML = `
      <div class="context-menu-icon">${getTemplateIcon(milestone.templateId)}</div>
      <div class="context-menu-text">
        <div class="context-menu-label">${displayLabel}</div>
        <div class="context-menu-description">${typeLabel}</div>
      </div>
    `;
    menu.appendChild(infoItem);

    // 分隔线
    const divider = document.createElement('div');
    divider.className = 'context-menu-divider';
    menu.appendChild(divider);

    // 删除按钮
    const removeItem = createMenuItem('🗑️', '取消标记', '移除这个特殊日期', () => {
      DiaryStorage.setMilestone(dateKey, null);
      DiaryUI.renderLifeCalendar();
      closeContextMenu();

      // 视觉反馈：脉冲动画
      highlightCalendarDay(dateKey);
    }, true);

    menu.appendChild(removeItem);

    document.body.appendChild(menu);

    // 延迟激活（动画效果）
    setTimeout(() => menu.classList.add('active'), 10);
  }

  /**
   * 处理模板选择
   */
  function handleTemplateSelect(dateKey, type, template) {
    closeContextMenu();

    let customLabel = null;

    // 如果是自定义模板，请求用户输入
    if (template.id === 'custom') {
      const typeLabel = type === 'major_milestone' ? '重大里程碑' : '纪念日';
      customLabel = prompt(`${typeLabel} - 自定义标签\n\n请输入标签（建议2-8个字）：`);

      // 用户取消
      if (customLabel === null) return;

      customLabel = customLabel.trim();

      // 验证输入
      if (!customLabel) {
        alert('标签不能为空');
        return;
      }

      if (customLabel.length > 12) {
        alert('标签过长，建议控制在12个字以内');
        return;
      }
    }

    // 保存标记
    const milestone = {
      type: type,
      templateId: template.id,
      templateLabel: template.label,
      customLabel: customLabel,
      description: template.description,
      createdAt: Date.now()
    };

    DiaryStorage.setMilestone(dateKey, milestone);

    // 刷新日历
    DiaryUI.renderLifeCalendar();

    // 视觉反馈：脉冲动画
    highlightCalendarDay(dateKey);

    // 平滑滚动到标记的日期
    setTimeout(() => {
      scrollToCalendarDay(dateKey);
    }, 300);
  }

  /**
   * 创建上下文菜单容器
   */
  function createContextMenu(dateKey, x, y) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.dataset.dateKey = dateKey;

    // 添加日期头部
    const header = document.createElement('div');
    header.className = 'context-menu-header';
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const displayDate = date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
    header.innerHTML = `<div class="context-menu-date">${displayDate}</div>`;
    menu.appendChild(header);

    // 计算菜单位置（避免超出屏幕）
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // 添加到DOM后调整位置
    setTimeout(() => {
      const rect = menu.getBoundingClientRect();

      // 水平方向调整
      if (rect.right > window.innerWidth) {
        menu.style.left = (x - rect.width) + 'px';
      }

      // 垂直方向调整
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (y - rect.height) + 'px';
      }
    }, 0);

    currentContextMenu = menu;
    return menu;
  }

  /**
   * 创建菜单项
   */
  function createMenuItem(icon, label, description, onClick, isDanger = false) {
    const item = document.createElement('button');
    item.className = 'context-menu-item' + (isDanger ? ' context-menu-item--danger' : '');

    item.innerHTML = `
      <div class="context-menu-icon">${icon}</div>
      <div class="context-menu-text">
        <div class="context-menu-label">${label}</div>
        ${description ? `<div class="context-menu-description">${description}</div>` : ''}
      </div>
    `;

    item.addEventListener('click', (event) => {
      event.stopPropagation();  // 阻止事件冒泡，避免触发全局关闭
      onClick(event);
    });
    return item;
  }

  /**
   * 关闭上下文菜单
   */
  function closeContextMenu() {
    if (currentContextMenu) {
      currentContextMenu.classList.remove('active');
      setTimeout(() => {
        if (currentContextMenu && currentContextMenu.parentNode) {
          currentContextMenu.parentNode.removeChild(currentContextMenu);
        }
        currentContextMenu = null;
      }, 150);
    }
  }

  /**
   * 统计指定类型的里程碑数量
   */
  function countMilestonesByType(type) {
    const data = DiaryStorage.loadData();
    if (!data.milestones) return 0;

    return Object.values(data.milestones).filter(m => m && m.type === type).length;
  }

  /**
   * 获取模板图标
   */
  function getTemplateIcon(templateId) {
    const allTemplates = [...MAJOR_MILESTONE_TEMPLATES, ...MILESTONE_TEMPLATES];
    const template = allTemplates.find(t => t.id === templateId);
    return template ? template.icon : '📍';
  }

  /**
   * 高亮日历某一天（脉冲动画）
   */
  function highlightCalendarDay(dateKey) {
    const dayElement = document.querySelector(`.calendar-day[data-date="${dateKey}"]`);
    if (dayElement) {
      dayElement.classList.add('calendar-day--active');
      setTimeout(() => {
        dayElement.classList.remove('calendar-day--active');
      }, 800);
    }
  }

  /**
   * 平滑滚动到日历某一天
   */
  function scrollToCalendarDay(dateKey) {
    const dayElement = document.querySelector(`.calendar-day[data-date="${dateKey}"]`);
    if (!dayElement) return;

    const calendar = document.querySelector('.life-calendar');
    if (!calendar) return;

    const calendarRect = calendar.getBoundingClientRect();
    const dayRect = dayElement.getBoundingClientRect();

    // 检查是否在可视区域内
    const isVisible = dayRect.top >= calendarRect.top && dayRect.bottom <= calendarRect.bottom;

    if (!isVisible) {
      // 计算目标位置（居中显示）
      const targetOffsetTop = dayElement.offsetTop;
      const calendarHeight = calendar.clientHeight;
      const dayHeight = dayElement.clientHeight;
      const scrollTo = targetOffsetTop - (calendarHeight / 2) + (dayHeight / 2);

      // 平滑滚动
      calendar.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    }
  }

  /**
   * 滚动生命日历到今天
   * 用于页面加载时和输入框聚焦时
   */
  function scrollCalendarToToday() {
    const today = new Date();
    const todayKey = DiaryModels.formatDateKey(today);
    scrollToCalendarDay(todayKey);
  }

  // 点击页面其他地方时关闭菜单（延迟检测，避免菜单切换时误触发）
  document.addEventListener('click', (event) => {
    // 延迟检测，让菜单内部的点击事件先处理
    setTimeout(() => {
      if (currentContextMenu && !currentContextMenu.contains(event.target)) {
        closeContextMenu();
      }
    }, 0);
  });

  // ESC 键关闭菜单
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentContextMenu) {
      closeContextMenu();
    }
  });

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

  /**
   * ========================================
   * 人生节点回顾模式（Life Review Mode）
   * ========================================
   */

  // 全局状态
  let currentMode = 'diary';  // 'diary' | 'review'
  let reviewNodes = [];       // 回顾模式的节点列表
  let currentNodeIndex = null;

  /**
   * 获取所有人生节点（按时间正序）
   * @returns {Array} 节点数组
   */
  function getLifeReviewNodes() {
    const birthDate = DiaryStorage.getBirthDate();
    const milestones = DiaryStorage.loadData().milestones || {};
    const entries = DiaryStorage.getAllEntries();
    const nodes = [];

    // 1. 收集所有标记日期
    Object.keys(milestones).forEach(dateKey => {
      const milestone = milestones[dateKey];
      const isBirthdayDate = DiaryModels.isBirthday(dateKey, birthDate);

      // 跳过生日日期（稍后单独处理）
      if (!isBirthdayDate) {
        // 检查该日期是否有日记
        const hasEntry = entries.some(e =>
          !e.deleted && DiaryModels.formatDateKey(new Date(e.createdAt)) === dateKey
        );

        nodes.push({
          dateKey: dateKey,
          type: milestone.type,  // 'major_milestone' | 'milestone'
          templateId: milestone.templateId,
          icon: getTemplateIcon(milestone.templateId),
          title: milestone.customLabel || milestone.templateLabel,
          description: milestone.description || '',
          timestamp: new Date(dateKey).getTime(),
          isBirthday: false,
          hasEntry: hasEntry
        });
      }
    });

    // 2. 添加所有生日节点
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      const currentAge = DiaryModels.getAge(birthDate);

      for (let age = 0; age <= currentAge; age++) {
        const birthdayDate = new Date(birth);
        birthdayDate.setFullYear(birth.getFullYear() + age);

        // 不超过今天
        if (birthdayDate > today) break;

        const dateKey = DiaryModels.formatDateKey(birthdayDate);

        // 检查该日期是否有日记
        const hasEntry = entries.some(e =>
          !e.deleted && DiaryModels.formatDateKey(new Date(e.createdAt)) === dateKey
        );

        nodes.push({
          dateKey: dateKey,
          type: 'birthday',
          templateId: 'birthday',
          icon: '🎂',
          title: `${age} 周岁生日`,
          description: age === 0 ? '生命的起点' : '',
          timestamp: birthdayDate.getTime(),
          isBirthday: true,
          age: age,
          hasEntry: hasEntry
        });
      }
    }

    // 3. 按时间正序排序（从最早到最新）
    nodes.sort((a, b) => a.timestamp - b.timestamp);

    return nodes;
  }

  /**
   * 生成单个节点的 HTML
   * @param {object} node - 节点对象
   * @param {number} index - 节点索引
   * @returns {string} HTML 字符串
   */
  function generateReviewNodeHTML(node, index) {
    const date = new Date(node.dateKey);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 节点类型样式
    let nodeClass = 'review-node';
    if (node.isBirthday) {
      nodeClass += ' review-node--birthday';
    } else if (node.type === 'major_milestone') {
      nodeClass += ' review-node--major';
    } else {
      nodeClass += ' review-node--milestone';
    }

    // 是否有日记的标记
    const entryIndicator = node.hasEntry
      ? '<span class="review-node-entry-indicator">●</span>'
      : '';

    return `
      <div class="${nodeClass}"
           data-date="${node.dateKey}"
           data-index="${index}">

        ${index > 0 ? '<div class="review-node-spacer"></div>' : ''}

        <div class="review-node-content">

          <div class="review-node-meta">
            ${node.isBirthday ? node.age + ' 岁' : year}
          </div>

          <div class="review-node-title">
            <span class="review-node-icon">${node.icon}</span>
            <span class="review-node-label">${node.title}</span>
            ${entryIndicator}
          </div>

          <div class="review-node-date">
            ${month}月${day}日
          </div>

          ${node.description ? `
            <div class="review-node-description">
              ${node.description}
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  /**
   * 渲染回顾模式时间轴
   */
  function renderReviewTimeline() {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    // 获取所有节点
    reviewNodes = getLifeReviewNodes();

    if (reviewNodes.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state" style="padding-top: 120px;">
          <p class="empty-hint">还没有标记任何人生节点</p>
          <p class="empty-hint" style="margin-top: 12px; font-size: 11px; opacity: 0.5;">
            在左侧日历上右键标记重要日期
          </p>
        </div>
      `;
      return;
    }

    // 生成HTML
    const htmlParts = reviewNodes.map((node, index) => generateReviewNodeHTML(node, index));
    timeline.innerHTML = htmlParts.join('');

    // 绑定节点点击事件
    const nodeElements = timeline.querySelectorAll('.review-node');
    nodeElements.forEach(nodeEl => {
      nodeEl.addEventListener('click', () => {
        const dateKey = nodeEl.dataset.date;
        handleReviewNodeClick(dateKey);
      });
    });
  }

  /**
   * 处理回顾节点点击
   */
  function handleReviewNodeClick(dateKey) {
    // 高亮当前节点
    document.querySelectorAll('.review-node').forEach(node => {
      node.classList.remove('review-node--active');
    });

    const clickedNode = document.querySelector(`.review-node[data-date="${dateKey}"]`);
    if (clickedNode) {
      clickedNode.classList.add('review-node--active');
    }

    // 退出回顾模式，跳转到该日期
    exitReviewModeToDate(dateKey);
  }

  /**
   * 进入回顾模式
   */
  function enterReviewMode() {
    if (currentMode === 'review') return;

    currentMode = 'review';

    const timeline = document.getElementById('timeline');
    const lifeCalendar = document.getElementById('lifeCalendar');
    const btnToggle = document.getElementById('btnModeToggle');
    const toggleText = btnToggle.querySelector('.mode-toggle-text');

    // 1. 淡出当前内容
    timeline.classList.add('timeline-container--fade-out');

    // 2. 延迟后切换渲染模式
    setTimeout(() => {
      // 更新按钮文本
      toggleText.textContent = toggleText.dataset.review;

      // 添加回顾模式class
      timeline.classList.add('timeline-container--review-mode');
      lifeCalendar.classList.add('life-calendar--review-mode');

      // 渲染回顾时间轴
      renderReviewTimeline();

      // 移除淡出class
      timeline.classList.remove('timeline-container--fade-out');

      // 延迟激活淡入
      setTimeout(() => {
        timeline.classList.add('active');

        // 滚动到顶部（最早的节点）
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 50);
    }, 300);
  }

  /**
   * 退出回顾模式（回到今天）
   */
  function exitReviewMode() {
    if (currentMode === 'diary') return;

    currentMode = 'diary';

    const timeline = document.getElementById('timeline');
    const lifeCalendar = document.getElementById('lifeCalendar');
    const btnToggle = document.getElementById('btnModeToggle');
    const toggleText = btnToggle.querySelector('.mode-toggle-text');

    // 1. 淡出回顾内容
    timeline.classList.remove('active');
    timeline.classList.add('timeline-container--fade-out');

    // 2. 延迟后恢复日记模式
    setTimeout(() => {
      // 更新按钮文本
      toggleText.textContent = toggleText.dataset.diary;

      // 移除回顾模式class
      timeline.classList.remove('timeline-container--review-mode');
      lifeCalendar.classList.remove('life-calendar--review-mode');

      // 恢复日记模式渲染
      refreshTimeline();

      // 移除淡出class
      timeline.classList.remove('timeline-container--fade-out');

      // 延迟激活淡入
      setTimeout(() => {
        // 滚动回今天
        scrollToToday();
      }, 50);
    }, 300);
  }

  /**
   * 从回顾模式退出并跳转到指定日期
   */
  function exitReviewModeToDate(dateKey) {
    currentMode = 'diary';

    const timeline = document.getElementById('timeline');
    const lifeCalendar = document.getElementById('lifeCalendar');
    const btnToggle = document.getElementById('btnModeToggle');
    const toggleText = btnToggle.querySelector('.mode-toggle-text');

    // 1. 淡出回顾内容
    timeline.classList.remove('active');
    timeline.classList.add('timeline-container--fade-out');

    // 2. 延迟后恢复日记模式
    setTimeout(() => {
      // 更新按钮文本
      toggleText.textContent = toggleText.dataset.diary;

      // 移除回顾模式class
      timeline.classList.remove('timeline-container--review-mode');
      lifeCalendar.classList.remove('life-calendar--review-mode');

      // 恢复日记模式渲染
      refreshTimeline();

      // 移除淡出class
      timeline.classList.remove('timeline-container--fade-out');

      // 延迟后跳转到指定日期
      setTimeout(() => {
        // 查找该日期是否有记录
        const dateGroup = document.querySelector(`.date-group[data-date="${dateKey}"]`);

        if (dateGroup) {
          // 有记录：滚动到该日期
          scrollToDateGroup(dateGroup);
        } else {
          // 无记录：打开编辑器
          scrollToEmptyDate(dateKey);
        }
      }, 400);
    }, 300);
  }

  /**
   * 滚动到今天
   */
  function scrollToToday() {
    const today = DiaryModels.formatDateKey(new Date());
    const todayGroup = document.querySelector(`.date-group[data-date="${today}"]`);

    if (todayGroup) {
      setTimeout(() => {
        scrollToDateGroup(todayGroup);
      }, 300);
    } else {
      // 没有今天的记录，滚动到时间轴顶部
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  /**
   * 切换模式
   */
  function toggleMode() {
    if (currentMode === 'diary') {
      enterReviewMode();
    } else {
      exitReviewMode();
    }
  }

  /**
   * 绑定模式切换按钮
   */
  function bindModeToggle() {
    const btnToggle = document.getElementById('btnModeToggle');
    if (btnToggle) {
      btnToggle.addEventListener('click', toggleMode);
    }
  }

  /**
   * ========================================
   * 日期跳转功能（Date Jump）- 深色自定义日历
   * ========================================
   */

  let dateJumpPopover = null;
  let currentJumpYear = null;
  let currentJumpMonth = null;

  /**
   * 绑定日期跳转按钮事件
   */
  function bindDateJumpButton() {
    const jumpBtn = document.getElementById('calendarJumpBtn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDateJumpPopover(jumpBtn);
      });
    }
  }

  /**
   * 切换日期跳转 popover 显示状态
   */
  function toggleDateJumpPopover(anchorEl) {
    if (dateJumpPopover) {
      closeDateJumpPopover();
      return;
    }
    showDateJumpPopover(anchorEl);
  }

  /**
   * 显示日期跳转 popover（自定义日历）
   */
  function showDateJumpPopover(anchorEl) {
    const today = new Date();
    currentJumpYear = today.getFullYear();
    currentJumpMonth = today.getMonth();

    const popover = document.createElement('div');
    popover.className = 'date-jump-popover';
    popover.id = 'dateJumpPopover';

    popover.innerHTML = generateCalendarHTML(currentJumpYear, currentJumpMonth);

    // 定位 popover
    const calendar = document.querySelector('.life-calendar');
    const calendarRect = calendar ? calendar.getBoundingClientRect() : { left: 16, width: 280 };
    const rect = anchorEl.getBoundingClientRect();

    popover.style.position = 'fixed';
    popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    popover.style.left = calendarRect.left + 'px';
    popover.style.width = Math.min(calendarRect.width, 280) + 'px';

    document.body.appendChild(popover);
    dateJumpPopover = popover;

    bindCalendarEvents(popover);

    // 延迟激活动画
    setTimeout(() => popover.classList.add('active'), 10);
  }

  /**
   * 生成日历 HTML
   */
  function generateCalendarHTML(year, month) {
    const today = new Date();
    const todayKey = DiaryModels.formatDateKey(today);

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 月份第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 上个月填充
    const prevMonthLast = new Date(year, month, 0);
    const prevMonthDays = prevMonthLast.getDate();

    let daysHTML = '';

    // 上月填充天
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const dateKey = DiaryModels.formatDateKey(new Date(year, month - 1, day));
      daysHTML += `<button class="cal-day cal-day--other" data-date="${dateKey}">${day}</button>`;
    }

    // 当月天数
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = DiaryModels.formatDateKey(date);
      const isToday = dateKey === todayKey;
      const isFuture = date > today;

      let classes = ['cal-day'];
      if (isToday) classes.push('cal-day--today');
      if (isFuture) classes.push('cal-day--future');

      daysHTML += `<button class="${classes.join(' ')}" data-date="${dateKey}" ${isFuture ? 'disabled' : ''}>${day}</button>`;
    }

    // 下月填充天（补满6行）
    const totalCells = startWeekday + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const dateKey = DiaryModels.formatDateKey(new Date(year, month + 1, day));
      const isFuture = new Date(year, month + 1, day) > today;
      daysHTML += `<button class="cal-day cal-day--other ${isFuture ? 'cal-day--future' : ''}" data-date="${dateKey}" ${isFuture ? 'disabled' : ''}>${day}</button>`;
    }

    // 周头
    const weekHeaderHTML = weekDays.map(d => `<span class="cal-weekday">${d}</span>`).join('');

    // 判断是否能切换到上/下月
    const canPrev = true;
    const canNext = !(year === today.getFullYear() && month === today.getMonth());

    return `
      <div class="cal-header">
        <button class="cal-nav cal-nav--prev" ${canPrev ? '' : 'disabled'}>&lt;</button>
        <span class="cal-title">${year}年${monthNames[month]}</span>
        <button class="cal-nav cal-nav--next" ${canNext ? 'disabled' : ''}>&gt;</button>
      </div>
      <div class="cal-weekdays">${weekHeaderHTML}</div>
      <div class="cal-days">${daysHTML}</div>
      <div class="cal-footer">
        <button class="cal-today-btn">今天</button>
      </div>
    `;
  }

  /**
   * 绑定日历内部事件
   */
  function bindCalendarEvents(popover) {
    // 日期点击 - 立即跳转
    popover.addEventListener('click', (e) => {
      const dayBtn = e.target.closest('.cal-day');
      if (dayBtn && !dayBtn.disabled) {
        const dateKey = dayBtn.dataset.date;
        if (dateKey) {
          handleDateJump(dateKey);
          closeDateJumpPopover();
        }
        return;
      }

      // 上一月
      if (e.target.closest('.cal-nav--prev')) {
        currentJumpMonth--;
        if (currentJumpMonth < 0) {
          currentJumpMonth = 11;
          currentJumpYear--;
        }
        updateCalendarContent(popover);
        return;
      }

      // 下一月
      if (e.target.closest('.cal-nav--next') && !e.target.closest('.cal-nav--next').disabled) {
        currentJumpMonth++;
        if (currentJumpMonth > 11) {
          currentJumpMonth = 0;
          currentJumpYear++;
        }
        updateCalendarContent(popover);
        return;
      }

      // 今天按钮
      if (e.target.closest('.cal-today-btn')) {
        const today = new Date();
        const todayKey = DiaryModels.formatDateKey(today);
        handleDateJump(todayKey);
        closeDateJumpPopover();
        return;
      }
    });
  }

  /**
   * 更新日历内容（月份切换）
   */
  function updateCalendarContent(popover) {
    popover.innerHTML = generateCalendarHTML(currentJumpYear, currentJumpMonth);
    bindCalendarEvents(popover);
  }

  /**
   * 关闭日期跳转 popover
   */
  function closeDateJumpPopover() {
    if (dateJumpPopover) {
      dateJumpPopover.classList.remove('active');
      setTimeout(() => {
        if (dateJumpPopover && dateJumpPopover.parentNode) {
          dateJumpPopover.parentNode.removeChild(dateJumpPopover);
        }
        dateJumpPopover = null;
      }, 150);
    }
  }

  /**
   * 处理日期跳转
   */
  function handleDateJump(dateKey) {
    // 1. 更新日历高亮
    updateCalendarHighlight(dateKey);

    // 2. 滚动日历到目标日期
    scrollToCalendarDay(dateKey);

    // 3. 更新时间锚点
    updateTimeAnchorFromDate(dateKey);

    // 4. 检查时间轴是否有该日期的记录
    const dateGroup = document.querySelector(`.date-group[data-date="${dateKey}"]`);
    if (dateGroup) {
      // 有记录：滚动到该日期
      scrollToDateGroup(dateGroup);
    } else {
      // 无记录：激活写作入口并设置目标日期
      activateWritingEntryWithDate(dateKey);
    }
  }

  /**
   * ========================================
   * 展示范围设置功能（Range Settings）
   * ========================================
   */

  let rangeSettingsPopover = null;

  /**
   * 绑定展示范围按钮事件
   */
  function bindRangeSettingsButton() {
    const rangeBtn = document.getElementById('calendarRangeBtn');
    if (rangeBtn) {
      rangeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRangeSettingsPopover(rangeBtn);
      });
    }

    // 初始化范围文本
    updateRangeText();
  }

  /**
   * 更新范围文本显示
   */
  function updateRangeText() {
    const textEl = document.getElementById('calendarRangeText');
    if (!textEl) return;

    const birthDate = DiaryStorage.getBirthDate();
    if (!birthDate) {
      textEl.textContent = '未设置';
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

    if (startAge === endAge) {
      textEl.textContent = `第 ${startAge} 岁`;
    } else {
      textEl.textContent = `第 ${startAge}～${endAge} 岁`;
    }
  }

  /**
   * 切换范围设置 popover 显示状态
   */
  function toggleRangeSettingsPopover(anchorEl) {
    if (rangeSettingsPopover) {
      closeRangeSettingsPopover();
      return;
    }
    showRangeSettingsPopover(anchorEl);
  }

  /**
   * 显示范围设置 popover
   */
  function showRangeSettingsPopover(anchorEl) {
    const popover = document.createElement('div');
    popover.className = 'popover popover--range-settings';
    popover.id = 'rangeSettingsPopover';

    const currentRange = DiaryStorage.getCalendarRange();

    const options = [
      { value: 'compact', label: '仅当前', desc: '只显示当前年龄' },
      { value: 'default', label: '近两年', desc: '当前 + 上一年龄' },
      { value: 'extended', label: '近三年', desc: '当前 + 前两年' },
      { value: 'all', label: '全部', desc: '从出生至今' }
    ];

    const optionsHTML = options.map(opt => `
      <button class="popover-option ${currentRange === opt.value ? 'popover-option--active' : ''}"
              data-value="${opt.value}">
        <span class="popover-option-label">${opt.label}</span>
        <span class="popover-option-desc">${opt.desc}</span>
      </button>
    `).join('');

    popover.innerHTML = `
      <div class="popover-content">
        <div class="popover-section">
          <label class="popover-label">展示范围</label>
          <div class="popover-options">
            ${optionsHTML}
          </div>
        </div>
      </div>
    `;

    // 定位 popover
    const rect = anchorEl.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = (rect.bottom + 8) + 'px';
    popover.style.left = rect.left + 'px';
    popover.style.minWidth = '180px';

    document.body.appendChild(popover);
    rangeSettingsPopover = popover;

    // 绑定选项点击事件
    const optionBtns = popover.querySelectorAll('.popover-option');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        handleRangeChange(value);
        closeRangeSettingsPopover();
      });
    });

    // 延迟激活动画
    setTimeout(() => popover.classList.add('active'), 10);
  }

  /**
   * 关闭范围设置 popover
   */
  function closeRangeSettingsPopover() {
    if (rangeSettingsPopover) {
      rangeSettingsPopover.classList.remove('active');
      setTimeout(() => {
        if (rangeSettingsPopover && rangeSettingsPopover.parentNode) {
          rangeSettingsPopover.parentNode.removeChild(rangeSettingsPopover);
        }
        rangeSettingsPopover = null;
      }, 150);
    }
  }

  /**
   * 处理范围变更
   */
  function handleRangeChange(rangeValue) {
    DiaryStorage.setCalendarRange(rangeValue);
    DiaryUI.renderLifeCalendar();
    updateRangeText();

    // 延迟滚动到今天
    setTimeout(() => {
      scrollCalendarToToday();
    }, 100);
  }

  /**
   * ========================================
   * 写作入口目标日期功能
   * ========================================
   */

  let targetDate = null;  // 目标日期（非今天时使用）

  /**
   * 激活写作入口并设置目标日期
   */
  function activateWritingEntryWithDate(dateKey) {
    const input = document.getElementById('writingEntryInput');
    const dateHint = document.getElementById('writingEntryDateHint');
    const dateHintText = dateHint ? dateHint.querySelector('.date-hint-text') : null;

    if (!input) return;

    // 检查是否是今天
    const today = DiaryModels.formatDateKey(new Date());
    const isToday = dateKey === today;

    if (isToday) {
      // 今天：清除目标日期
      clearTargetDate();
    } else {
      // 非今天：设置目标日期
      targetDate = dateKey;

      // 显示日期提示
      if (dateHint && dateHintText) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const displayDate = date.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric'
        });
        dateHintText.textContent = `为 ${displayDate} 写`;
        dateHint.classList.add('visible');
      }
    }

    // 聚焦输入框
    input.focus();

    // 滚动到写作入口区域
    const writingEntry = document.getElementById('writingEntry');
    if (writingEntry) {
      const rect = writingEntry.getBoundingClientRect();
      const headerHeight = 48;
      const timeAnchorHeight = 64;

      if (rect.top < headerHeight + timeAnchorHeight + 20) {
        window.scrollTo({
          top: window.pageYOffset + rect.top - headerHeight - timeAnchorHeight - 40,
          behavior: 'smooth'
        });
      }
    }
  }

  /**
   * 清除目标日期
   */
  function clearTargetDate() {
    targetDate = null;

    const dateHint = document.getElementById('writingEntryDateHint');
    if (dateHint) {
      dateHint.classList.remove('visible');
    }
  }

  /**
   * 获取当前目标日期
   */
  function getTargetDate() {
    return targetDate;
  }

  /**
   * 绑定日期提示清除按钮
   */
  function bindDateHintClear() {
    const clearBtn = document.getElementById('dateHintClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTargetDate();

        // 重新聚焦输入框
        const input = document.getElementById('writingEntryInput');
        if (input) input.focus();
      });
    }
  }

  /**
   * 关闭所有 popover（点击外部时）
   */
  function closeAllPopovers(event) {
    // 日期跳转 popover
    if (dateJumpPopover && !dateJumpPopover.contains(event.target)) {
      const jumpBtn = document.getElementById('calendarJumpBtn');
      if (!jumpBtn || !jumpBtn.contains(event.target)) {
        closeDateJumpPopover();
      }
    }

    // 范围设置 popover
    if (rangeSettingsPopover && !rangeSettingsPopover.contains(event.target)) {
      const rangeBtn = document.getElementById('calendarRangeBtn');
      if (!rangeBtn || !rangeBtn.contains(event.target)) {
        closeRangeSettingsPopover();
      }
    }
  }

  // 公开接口
  return {
    init,
    refreshTimeline,
    scrollCalendarToToday,  // 🆕 暴露给其他模块使用
    getTargetDate,          // 🆕 获取目标日期（供 WritingEntry 使用）
    clearTargetDate         // 🆕 清除目标日期
  };
})();

// 启动应用
document.addEventListener('DOMContentLoaded', DiaryApp.init);
