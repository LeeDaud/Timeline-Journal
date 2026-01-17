/**
 * wheel-picker.js - 统一滚轮选择器
 * 职责：提供 Date/Time 两种模式的滚轮选择器，三行显示，深色极简风格
 */

const WheelPicker = (function() {
  'use strict';

  // ========================================
  // 配置常量
  // ========================================

  const ITEM_HEIGHT = 36;           // 每行高度
  const VISIBLE_ITEMS = 3;          // 可见行数（固定3行）
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

  // 当前活动的 picker 实例
  let activePickerEl = null;

  // ========================================
  // 工具函数
  // ========================================

  /**
   * 获取某年某月的天数
   */
  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * 生成数字数组
   */
  function range(start, end, padZero = false) {
    const arr = [];
    for (let i = start; i <= end; i++) {
      arr.push(padZero ? String(i).padStart(2, '0') : String(i));
    }
    return arr;
  }

  /**
   * 获取年份范围（从用户生日到当前岁数结束）
   */
  function getYearRange() {
    // 尝试从 storage 获取生日
    let birthYear = 2000;
    try {
      const settings = JSON.parse(localStorage.getItem('diary_settings') || '{}');
      if (settings.birthday) {
        birthYear = new Date(settings.birthday).getFullYear();
      }
    } catch (e) {}

    const currentYear = new Date().getFullYear();
    return range(birthYear, currentYear + 1);
  }

  // ========================================
  // WheelColumn - 单列滚轮组件
  // ========================================

  /**
   * 创建单列滚轮
   * @param {Object} options
   * @param {string[]} options.items - 选项数组
   * @param {number} options.selectedIndex - 选中索引
   * @param {Function} options.onChange - 变化回调
   * @param {string} options.label - 列标签（可选，如 "年"）
   */
  function createWheelColumn(options) {
    const { items, selectedIndex = 0, onChange, label = '' } = options;

    const column = document.createElement('div');
    column.className = 'wheel-column';

    // 滚轮容器（用于裁剪）
    const viewport = document.createElement('div');
    viewport.className = 'wheel-viewport';

    // 滚轮内容
    const wheel = document.createElement('div');
    wheel.className = 'wheel-content';

    // 渲染选项
    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'wheel-item';
      itemEl.textContent = item;
      itemEl.dataset.index = index;
      wheel.appendChild(itemEl);
    });

    viewport.appendChild(wheel);
    column.appendChild(viewport);

    // 添加标签（如果有）
    if (label) {
      const labelEl = document.createElement('span');
      labelEl.className = 'wheel-label';
      labelEl.textContent = label;
      column.appendChild(labelEl);
    }

    // 选中带（中线高亮）
    const highlight = document.createElement('div');
    highlight.className = 'wheel-highlight';
    viewport.appendChild(highlight);

    // 渐隐遮罩
    const maskTop = document.createElement('div');
    maskTop.className = 'wheel-mask wheel-mask--top';
    const maskBottom = document.createElement('div');
    maskBottom.className = 'wheel-mask wheel-mask--bottom';
    viewport.appendChild(maskTop);
    viewport.appendChild(maskBottom);

    // 状态
    let currentIndex = selectedIndex;
    let startY = 0;
    let currentY = 0;
    let lastY = 0;
    let velocity = 0;
    let isDragging = false;
    let animationId = null;

    // 设置初始位置
    function setPosition(index, animate = false) {
      const targetY = -index * ITEM_HEIGHT;

      if (animate) {
        wheel.style.transition = 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)';
      } else {
        wheel.style.transition = 'none';
      }

      wheel.style.transform = `translateY(${targetY}px)`;
      currentY = targetY;

      // 更新选中状态
      wheel.querySelectorAll('.wheel-item').forEach((item, i) => {
        item.classList.toggle('wheel-item--selected', i === index);
      });
    }

    // 滚动到索引
    function scrollToIndex(index, animate = true) {
      // 边界限制
      index = Math.max(0, Math.min(items.length - 1, index));

      if (index !== currentIndex) {
        currentIndex = index;
        if (onChange) onChange(index, items[index]);
      }

      setPosition(index, animate);
    }

    // 根据位置计算索引
    function getIndexFromPosition(y) {
      return Math.round(-y / ITEM_HEIGHT);
    }

    // 触摸/鼠标事件处理
    function handleStart(e) {
      e.preventDefault();
      isDragging = true;

      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      const point = e.touches ? e.touches[0] : e;
      startY = point.clientY - currentY;
      lastY = point.clientY;
      velocity = 0;

      wheel.style.transition = 'none';
    }

    function handleMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      const point = e.touches ? e.touches[0] : e;
      const newY = point.clientY - startY;

      // 计算速度
      velocity = point.clientY - lastY;
      lastY = point.clientY;

      // 边界阻尼
      const minY = -(items.length - 1) * ITEM_HEIGHT;
      const maxY = 0;

      let dampedY = newY;
      if (newY > maxY) {
        dampedY = maxY + (newY - maxY) * 0.3;
      } else if (newY < minY) {
        dampedY = minY + (newY - minY) * 0.3;
      }

      currentY = dampedY;
      wheel.style.transform = `translateY(${dampedY}px)`;
    }

    function handleEnd() {
      if (!isDragging) return;
      isDragging = false;

      // 惯性滚动
      if (Math.abs(velocity) > 2) {
        const friction = 0.92;

        function inertiaScroll() {
          velocity *= friction;
          currentY += velocity;

          // 边界限制
          const minY = -(items.length - 1) * ITEM_HEIGHT;
          const maxY = 0;

          if (currentY > maxY || currentY < minY || Math.abs(velocity) < 0.5) {
            // 停止惯性，吸附到最近的项
            const targetIndex = getIndexFromPosition(currentY);
            scrollToIndex(targetIndex, true);
            return;
          }

          wheel.style.transform = `translateY(${currentY}px)`;
          animationId = requestAnimationFrame(inertiaScroll);
        }

        inertiaScroll();
      } else {
        // 直接吸附
        const targetIndex = getIndexFromPosition(currentY);
        scrollToIndex(targetIndex, true);
      }
    }

    // 绑定事件
    viewport.addEventListener('touchstart', handleStart, { passive: false });
    viewport.addEventListener('touchmove', handleMove, { passive: false });
    viewport.addEventListener('touchend', handleEnd);

    viewport.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // 点击选择
    wheel.addEventListener('click', (e) => {
      const item = e.target.closest('.wheel-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        scrollToIndex(index, true);
      }
    });

    // 滚轮事件
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      scrollToIndex(currentIndex + delta, true);
    }, { passive: false });

    // 初始化位置
    setPosition(selectedIndex, false);

    // 返回 API
    column._api = {
      getValue: () => items[currentIndex],
      getIndex: () => currentIndex,
      setIndex: (index, animate = true) => scrollToIndex(index, animate),
      setItems: (newItems, newIndex = 0) => {
        // 更新选项
        wheel.innerHTML = '';
        newItems.forEach((item, index) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'wheel-item';
          itemEl.textContent = item;
          itemEl.dataset.index = index;
          wheel.appendChild(itemEl);
        });
        items.length = 0;
        items.push(...newItems);
        scrollToIndex(Math.min(newIndex, newItems.length - 1), false);
      },
      destroy: () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        if (animationId) cancelAnimationFrame(animationId);
      }
    };

    return column;
  }

  // ========================================
  // UnifiedPickerCard - 统一选择器卡片
  // ========================================

  /**
   * 创建统一选择器卡片
   * @param {Object} options
   * @param {string} options.mode - 'date' | 'time'
   * @param {Date|Object} options.value - 初始值
   * @param {Function} options.onChange - 值变化回调
   * @param {Function} options.onConfirm - 确认回调
   * @param {Function} options.onClose - 关闭回调
   * @param {HTMLElement} options.anchor - 定位锚点元素
   */
  function create(options) {
    const { mode, value, onChange, onConfirm, onClose, anchor } = options;

    // 关闭已有的 picker
    close();

    const card = document.createElement('div');
    card.className = `picker-card picker-card--${mode}`;
    card.id = 'unifiedPickerCard';

    // 当前选择值
    let currentValue = mode === 'date'
      ? (value instanceof Date ? value : new Date())
      : (value || { hour: new Date().getHours(), minute: new Date().getMinutes() });

    // ========== 头部 ==========
    const header = document.createElement('div');
    header.className = 'picker-header';

    const title = document.createElement('span');
    title.className = 'picker-title';
    updateTitle();

    const closeBtn = document.createElement('button');
    closeBtn.className = 'picker-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.addEventListener('click', close);

    header.appendChild(title);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // ========== 滚轮区域 ==========
    const wheelArea = document.createElement('div');
    wheelArea.className = 'picker-wheels';

    let columns = [];

    if (mode === 'date') {
      // 年/月/日 三列
      const years = getYearRange();
      const yearIndex = years.indexOf(String(currentValue.getFullYear()));

      const yearCol = createWheelColumn({
        items: years,
        selectedIndex: yearIndex >= 0 ? yearIndex : years.length - 1,
        label: '年',
        onChange: (idx, val) => {
          currentValue.setFullYear(parseInt(val));
          updateDayColumn();
          updateTitle();
          if (onChange) onChange(new Date(currentValue));
        }
      });

      const months = range(1, 12);
      const monthCol = createWheelColumn({
        items: months,
        selectedIndex: currentValue.getMonth(),
        label: '月',
        onChange: (idx, val) => {
          currentValue.setMonth(parseInt(val) - 1);
          updateDayColumn();
          updateTitle();
          if (onChange) onChange(new Date(currentValue));
        }
      });

      const days = range(1, getDaysInMonth(currentValue.getFullYear(), currentValue.getMonth() + 1));
      const dayCol = createWheelColumn({
        items: days,
        selectedIndex: currentValue.getDate() - 1,
        label: '日',
        onChange: (idx, val) => {
          currentValue.setDate(parseInt(val));
          updateTitle();
          if (onChange) onChange(new Date(currentValue));
        }
      });

      columns = [yearCol, monthCol, dayCol];

      // 更新天数列
      function updateDayColumn() {
        const year = currentValue.getFullYear();
        const month = currentValue.getMonth() + 1;
        const daysInMonth = getDaysInMonth(year, month);
        const currentDay = Math.min(currentValue.getDate(), daysInMonth);

        currentValue.setDate(currentDay);
        dayCol._api.setItems(range(1, daysInMonth), currentDay - 1);
      }

      wheelArea.appendChild(yearCol);
      wheelArea.appendChild(monthCol);
      wheelArea.appendChild(dayCol);

    } else {
      // 时/分 两列
      const hours = range(0, 23, true);
      const hourCol = createWheelColumn({
        items: hours,
        selectedIndex: currentValue.hour,
        onChange: (idx, val) => {
          currentValue.hour = parseInt(val);
          updateTitle();
          if (onChange) onChange({ ...currentValue });
        }
      });

      // 冒号分隔符
      const separator = document.createElement('div');
      separator.className = 'picker-separator';
      separator.textContent = ':';

      const minutes = range(0, 59, true);
      const minuteCol = createWheelColumn({
        items: minutes,
        selectedIndex: currentValue.minute,
        onChange: (idx, val) => {
          currentValue.minute = parseInt(val);
          updateTitle();
          if (onChange) onChange({ ...currentValue });
        }
      });

      columns = [hourCol, minuteCol];

      wheelArea.appendChild(hourCol);
      wheelArea.appendChild(separator);
      wheelArea.appendChild(minuteCol);
    }

    card.appendChild(wheelArea);

    // ========== 底部 ==========
    const footer = document.createElement('div');
    footer.className = 'picker-footer';

    // 快捷按钮
    const quickBtn = document.createElement('button');
    quickBtn.className = 'picker-quick';
    quickBtn.textContent = mode === 'date' ? '今天' : '现在';
    quickBtn.addEventListener('click', () => {
      const now = new Date();
      if (mode === 'date') {
        currentValue = now;
        const years = getYearRange();
        const yearIndex = years.indexOf(String(now.getFullYear()));
        columns[0]._api.setIndex(yearIndex >= 0 ? yearIndex : years.length - 1);
        columns[1]._api.setIndex(now.getMonth());
        // 先更新年月，再更新日
        const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth() + 1);
        columns[2]._api.setItems(range(1, daysInMonth), now.getDate() - 1);
      } else {
        currentValue = { hour: now.getHours(), minute: now.getMinutes() };
        columns[0]._api.setIndex(now.getHours());
        columns[1]._api.setIndex(now.getMinutes());
      }
      updateTitle();
      if (onChange) onChange(mode === 'date' ? new Date(currentValue) : { ...currentValue });
    });

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'picker-confirm';
    confirmBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    confirmBtn.setAttribute('aria-label', '确认');
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) {
        onConfirm(mode === 'date' ? new Date(currentValue) : { ...currentValue });
      }
      close();
    });

    footer.appendChild(quickBtn);
    footer.appendChild(confirmBtn);
    card.appendChild(footer);

    // ========== 定位 ==========
    document.body.appendChild(card);

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // 默认在锚点上方
      let top = rect.top - cardRect.height - 8;
      let left = rect.left;

      // 如果上方空间不足，放到下方
      if (top < 8) {
        top = rect.bottom + 8;
      }

      // 水平边界检查
      if (left + cardRect.width > window.innerWidth - 8) {
        left = window.innerWidth - cardRect.width - 8;
      }
      if (left < 8) left = 8;

      card.style.position = 'fixed';
      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
    } else {
      // 居中显示
      card.style.position = 'fixed';
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
    }

    // 入场动画
    requestAnimationFrame(() => {
      card.classList.add('picker-card--active');
    });

    activePickerEl = card;

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 10);

    // 更新标题
    function updateTitle() {
      if (mode === 'date') {
        title.textContent = `${currentValue.getFullYear()}年${currentValue.getMonth() + 1}月`;
      } else {
        const h = String(currentValue.hour).padStart(2, '0');
        const m = String(currentValue.minute).padStart(2, '0');
        title.textContent = `${h}:${m}`;
      }
    }

    // 返回 API
    return {
      getValue: () => mode === 'date' ? new Date(currentValue) : { ...currentValue },
      close: close
    };
  }

  /**
   * 关闭 picker
   */
  function close() {
    if (activePickerEl) {
      activePickerEl.classList.remove('picker-card--active');

      const el = activePickerEl;
      setTimeout(() => {
        if (el && el.parentNode) {
          // 销毁滚轮
          el.querySelectorAll('.wheel-column').forEach(col => {
            if (col._api && col._api.destroy) {
              col._api.destroy();
            }
          });
          el.parentNode.removeChild(el);
        }
      }, 200);

      activePickerEl = null;
    }

    document.removeEventListener('click', handleOutsideClick);
  }

  /**
   * 点击外部关闭
   */
  function handleOutsideClick(e) {
    if (activePickerEl && !activePickerEl.contains(e.target)) {
      close();
    }
  }

  // ========================================
  // 便捷方法
  // ========================================

  /**
   * 打开日期选择器
   */
  function openDatePicker(options) {
    return create({ ...options, mode: 'date' });
  }

  /**
   * 打开时间选择器
   */
  function openTimePicker(options) {
    return create({ ...options, mode: 'time' });
  }

  // ========================================
  // 公开 API
  // ========================================

  return {
    create,
    close,
    openDatePicker,
    openTimePicker
  };
})();
