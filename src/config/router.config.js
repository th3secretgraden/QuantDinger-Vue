// eslint-disable-next-line
import { UserLayout, BasicLayout, BlankLayout } from '@/layouts'

export const asyncRouterMap = [
  {
    path: '/',
    name: 'index',
    component: BasicLayout,
    meta: { title: 'menu.home' },
    redirect: '/ai-asset-analysis',
    children: [
      // 1. AI资产分析（首页）
      {
        path: '/ai-asset-analysis',
        name: 'AIAssetAnalysis',
        component: () => import('@/views/ai-asset-analysis'),
        meta: {
          title: 'menu.dashboard.aiAssetAnalysis',
          keepAlive: false,
          icon: 'appstore',
          permission: ['dashboard']
        }
      },
      // 3. 指标 IDE（图表 + 代码编辑 + 回测一体化）
      {
        path: '/indicator-ide',
        name: 'IndicatorIDE',
        component: () => import('@/views/indicator-ide'),
        meta: { title: 'menu.dashboard.indicatorIde', keepAlive: true, icon: 'code', permission: ['dashboard'] }
      },
      // 4. 策略与实盘（指标信号策略：创建 / 管理 / 与实盘联动；不含 Python 脚本策略）
      {
        path: '/strategy-live',
        name: 'StrategyLive',
        component: () => import('@/views/trading-assistant'),
        meta: {
          title: 'menu.dashboard.tradingAssistant',
          keepAlive: true,
          icon: 'deployment-unit',
          permission: ['dashboard'],
          indicatorSignalOnly: true
        }
      },
      // Python 脚本策略（无侧栏入口，从「交易机器人」进入）
      {
        path: '/strategy-script',
        name: 'StrategyScript',
        component: () => import('@/views/trading-assistant'),
        hidden: true,
        meta: {
          title: 'menu.dashboard.tradingBot',
          keepAlive: false,
          scriptStrategiesOnly: true
        }
      },
      {
        path: '/strategy-scripts',
        redirect: '/strategy-live',
        hidden: true
      },
      // 5. 交易机器人（实盘运维监控）
      {
        path: '/trading-bot',
        name: 'TradingBot',
        component: () => import('@/views/trading-bot'),
        meta: { title: 'menu.dashboard.tradingBot', keepAlive: true, icon: 'robot', permission: ['dashboard'] }
      },
      // 旧路由兼容：图表与指标 → 指标 IDE
      {
        path: '/indicator-analysis',
        name: 'Indicator',
        redirect: '/indicator-ide',
        hidden: true,
        meta: { title: 'menu.dashboard.indicator', keepAlive: false, icon: 'line-chart', permission: ['dashboard'] }
      },
      // 旧路由兼容：回测中心 → 指标 IDE
      {
        path: '/backtest-center',
        name: 'BacktestCenter',
        redirect: '/indicator-ide',
        hidden: true,
        meta: {
          title: 'menu.dashboard.backtestCenter',
          keepAlive: false,
          icon: 'experiment',
          permission: ['dashboard']
        }
      },
      // 旧路由兼容：交易助手 → 策略与实盘
      {
        path: '/trading-assistant',
        name: 'TradingAssistant',
        redirect: '/strategy-live',
        hidden: true,
        meta: {
          title: 'menu.dashboard.tradingAssistant',
          keepAlive: false,
          icon: 'deployment-unit',
          permission: ['dashboard']
        }
      },
      // 原仪表盘路由保留兼容，重定向到交易助手
      {
        path: '/dashboard',
        name: 'Dashboard',
        redirect: '/trading-bot',
        hidden: true,
        meta: { title: 'menu.dashboard', keepAlive: false, icon: 'dashboard', permission: ['dashboard'] }
      },
      // AI 分析（隐藏）
      {
        path: '/ai-analysis/:pageNo([1-9]\\d*)?',
        name: 'Analysis',
        component: () => import('@/views/ai-analysis'),
        hidden: true,
        meta: { title: 'menu.dashboard.analysis', keepAlive: false, icon: 'thunderbolt', permission: ['dashboard'] }
      },
      // 资产监测（隐藏）
      {
        path: '/portfolio',
        name: 'Portfolio',
        component: () => import('@/views/portfolio'),
        hidden: true,
        meta: { title: 'menu.dashboard.portfolio', keepAlive: true, icon: 'fund', permission: ['dashboard'] }
      },
      // 个人中心
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/profile'),
        meta: { title: 'menu.myProfile', keepAlive: false, icon: 'user', permission: ['dashboard'] }
      },
      // 用户管理 (admin only)
      {
        path: '/user-manage',
        name: 'UserManage',
        component: () => import('@/views/user-manage'),
        meta: { title: 'menu.userManage', keepAlive: false, icon: 'team', permission: ['admin'] }
      },
      // Agent Tokens (admin only) — issue/revoke tokens for AI agents and view audit log
      {
        path: '/agent-tokens',
        name: 'AgentTokens',
        component: () => import('@/views/agent-tokens'),
        meta: { title: 'menu.agentTokens', keepAlive: false, icon: 'api', permission: ['admin'] }
      },
      // 系统设置 (admin only) - 放在最后
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/settings'),
        meta: { title: 'menu.settings', keepAlive: false, icon: 'setting', permission: ['admin'] }
      }

    ]
  },
  {
    path: '*',
    redirect: '/404',
    hidden: true
  }
]

/**
 * 基础路由
 * @type { *[] }
 */
export const constantRouterMap = [
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/login',
    hidden: true,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import(/* webpackChunkName: "user" */ '@/views/user/Login')
      }
    ]
  },

  {
    path: '/404',
    component: () => import(/* webpackChunkName: "fail" */ '@/views/exception/404')
  }
]
