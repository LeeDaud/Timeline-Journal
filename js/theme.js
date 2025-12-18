/**
 * 主题管理模块
 * 功能：日间/夜间模式切换
 */

(function() {
  'use strict';

  const THEME_KEY = 'diary-theme';
  const THEME_LIGHT = 'light';
  const THEME_DARK = 'dark';
  const THEME_AUTO = 'auto';

  /**
   * 主题管理器
   */
  const ThemeManager = {
    /**
     * 初始化主题
     * 在页面加载时立即执行，避免闪烁
     */
    init() {
      // 1. 从 localStorage 读取用户偏好
      const savedTheme = localStorage.getItem(THEME_KEY) || THEME_AUTO;

      // 2. 应用主题
      this.applyTheme(savedTheme);

      // 3. 监听系统主题变化（当用户设置为 auto 时）
      this.watchSystemTheme();
    },

    /**
     * 获取当前应该应用的主题
     * @param {string} preference - 用户偏好 (light/dark/auto)
     * @returns {string} 实际主题 (light/dark)
     */
    getEffectiveTheme(preference) {
      if (preference === THEME_AUTO) {
        // 跟随系统
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? THEME_DARK
          : THEME_LIGHT;
      }
      return preference;
    },

    /**
     * 应用主题
     * @param {string} preference - 用户偏好 (light/dark/auto)
     */
    applyTheme(preference) {
      const effectiveTheme = this.getEffectiveTheme(preference);

      // 设置 data-theme 属性
      // 注意：auto 模式下设置为 "auto"，而不是实际主题
      // 这样 CSS 媒体查询才能正确工作
      document.documentElement.setAttribute('data-theme', preference);

      // 保存用户偏好
      localStorage.setItem(THEME_KEY, preference);

      // 更新按钮图标
      this.updateThemeIcon(preference, effectiveTheme);
    },

    /**
     * 更新主题切换按钮的文本
     * @param {string} preference - 用户偏好
     * @param {string} effectiveTheme - 实际主题
     */
    updateThemeIcon(preference, effectiveTheme) {
      const text = document.querySelector('.theme-text');
      if (!text) return;

      // 显示当前状态的文本
      if (preference === THEME_AUTO) {
        text.textContent = '自动';
      } else if (preference === THEME_LIGHT) {
        text.textContent = '日间';
      } else {
        text.textContent = '夜间';
      }
    },

    /**
     * 切换主题
     * 循环顺序：auto → light → dark → auto
     */
    toggle() {
      const currentPreference = localStorage.getItem(THEME_KEY) || THEME_AUTO;
      let nextPreference;

      // 切换逻辑：auto → light → dark → auto
      switch (currentPreference) {
        case THEME_AUTO:
          nextPreference = THEME_LIGHT;
          break;
        case THEME_LIGHT:
          nextPreference = THEME_DARK;
          break;
        case THEME_DARK:
          nextPreference = THEME_AUTO;
          break;
        default:
          nextPreference = THEME_AUTO;
      }

      this.applyTheme(nextPreference);
    },

    /**
     * 监听系统主题变化
     * 当用户设置为 auto 时，自动跟随系统切换
     */
    watchSystemTheme() {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', (e) => {
        const currentPreference = localStorage.getItem(THEME_KEY) || THEME_AUTO;

        // 只有在 auto 模式下才响应系统变化
        if (currentPreference === THEME_AUTO) {
          this.applyTheme(THEME_AUTO);
        }
      });
    },

    /**
     * 绑定按钮事件
     */
    bindEvents() {
      const btn = document.getElementById('btnThemeToggle');
      if (!btn) return;

      btn.addEventListener('click', () => {
        this.toggle();
      });
    }
  };

  // ========================================
  // 页面加载逻辑
  // ========================================

  // 1. 立即初始化主题（在 DOM 加载前，避免闪烁）
  ThemeManager.init();

  // 2. DOM 加载完成后绑定事件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ThemeManager.bindEvents();
    });
  } else {
    ThemeManager.bindEvents();
  }

  // 暴露到全局（可选，用于调试）
  window.ThemeManager = ThemeManager;
})();
