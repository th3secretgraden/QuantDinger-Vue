<template>
  <div class="agent-tokens-page">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="api" />
        <span>{{ $t('agentTokens.title') || 'Agent Tokens' }}</span>
      </h2>
      <p class="page-desc">
        {{ $t('agentTokens.description') || 'Issue and manage tokens that let external AI agents (Cursor, Claude Code, Codex, MCP, custom bots) call this QuantDinger instance through /api/agent/v1.' }}
      </p>
    </div>

    <a-tabs v-model="activeTab" class="manage-tabs">
      <!-- Tokens tab -->
      <a-tab-pane key="tokens" :tab="$t('agentTokens.tabTokens') || 'Tokens'">
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button type="primary" @click="openIssueModal">
              <a-icon type="plus" />
              {{ $t('agentTokens.issueToken') || 'Issue Token' }}
            </a-button>
            <a-button :loading="loadingTokens" @click="loadTokens">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
          </div>
          <div class="toolbar-right">
            <a-tooltip :title="$t('agentTokens.openDocs') || 'Open quickstart documentation'">
              <a-button @click="openQuickstart">
                <a-icon type="book" />
                {{ $t('agentTokens.docs') || 'Quickstart' }}
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <a-card :bordered="false" class="agent-table-card">
          <a-table
            :columns="tokenColumns"
            :dataSource="tokens"
            :loading="loadingTokens"
            :pagination="{ pageSize: 20, showSizeChanger: false }"
            :rowKey="r => r.id"
            size="middle"
          >
            <template slot="scopes" slot-scope="text">
              <a-tag
                v-for="s in (text || '').split(',').filter(Boolean)"
                :key="s"
                :color="scopeColor(s)"
                style="margin-right: 4px"
              >
                {{ s }}
              </a-tag>
            </template>

            <template slot="paper" slot-scope="text">
              <a-tag :color="text ? 'green' : 'red'">
                {{ text ? ($t('agentTokens.paperOnly') || 'paper-only') : ($t('agentTokens.live') || 'live-eligible') }}
              </a-tag>
            </template>

            <template slot="status" slot-scope="text">
              <a-tag :color="text === 'active' ? 'blue' : 'default'">
                {{ text }}
              </a-tag>
            </template>

            <template slot="ts" slot-scope="text">
              <span v-if="text">{{ formatTs(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <template slot="actions" slot-scope="text, record">
              <a-popconfirm
                v-if="record.status === 'active'"
                :title="$t('agentTokens.revokeConfirm') || 'Revoke this token? Agents using it will immediately fail with 401.'"
                @confirm="confirmRevoke(record.id)"
              >
                <a-button type="link" size="small" style="color: #ff4d4f">
                  <a-icon type="stop" />
                  {{ $t('agentTokens.revoke') || 'Revoke' }}
                </a-button>
              </a-popconfirm>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Audit tab -->
      <a-tab-pane key="audit" :tab="$t('agentTokens.tabAudit') || 'Audit log'">
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button :loading="loadingAudit" @click="loadAudit">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
            <a-input-number
              v-model="auditLimit"
              :min="10"
              :max="500"
              :step="10"
              style="width: 120px; margin-left: 12px"
              @change="loadAudit"
            />
            <span style="margin-left: 8px; color: #999">
              {{ $t('agentTokens.entries') || 'entries' }}
            </span>
          </div>
        </div>

        <a-card :bordered="false">
          <a-table
            :columns="auditColumns"
            :dataSource="audit"
            :loading="loadingAudit"
            :pagination="{ pageSize: 25 }"
            :rowKey="r => r.id"
            size="small"
          >
            <template slot="scope" slot-scope="text">
              <a-tag :color="scopeColor(text)">{{ text }}</a-tag>
            </template>
            <template slot="status" slot-scope="text">
              <a-tag :color="statusColor(text)">{{ text }}</a-tag>
            </template>
            <template slot="ts" slot-scope="text">
              <span v-if="text">{{ formatTs(text) }}</span>
            </template>
            <template slot="duration" slot-scope="text">
              <span v-if="text != null">{{ text }} ms</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <!-- Issue token modal -->
    <a-modal
      :visible="issueModalVisible"
      :title="$t('agentTokens.issueToken') || 'Issue Token'"
      :confirm-loading="issuing"
      @ok="confirmIssue"
      @cancel="closeIssueModal"
      :width="640"
    >
      <a-form-model ref="issueForm" :model="issueForm" :rules="issueRules" :label-col="{ span: 7 }" :wrapper-col="{ span: 15 }">
        <a-form-model-item :label="$t('agentTokens.name') || 'Name'" prop="name">
          <a-input v-model="issueForm.name" :placeholder="$t('agentTokens.namePlaceholder') || 'e.g. cursor-mcp, research-bot'" />
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.scopes') || 'Scopes'" prop="scopes">
          <a-checkbox-group v-model="issueForm.scopes">
            <a-tooltip :title="scopeHint('R')"><a-checkbox value="R">R · Read</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('W')"><a-checkbox value="W">W · Workspace</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('B')"><a-checkbox value="B">B · Backtest</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('N')"><a-checkbox value="N">N · Notify</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('T')"><a-checkbox value="T">T · Trade</a-checkbox></a-tooltip>
          </a-checkbox-group>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.markets') || 'Markets'">
          <a-input v-model="issueForm.markets" placeholder="* or e.g. Crypto,USStock" />
          <div class="hint">{{ $t('agentTokens.marketsHint') || 'Comma-separated allowlist; * means all allowed markets.' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.instruments') || 'Instruments'">
          <a-input v-model="issueForm.instruments" placeholder="* or e.g. BTC/USDT,ETH/USDT" />
          <div class="hint">{{ $t('agentTokens.instrumentsHint') || 'Useful when scope T is enabled.' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.rateLimit') || 'Rate limit (per min)'">
          <a-input-number v-model="issueForm.rate_limit_per_min" :min="1" :max="6000" />
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.expiresInDays') || 'Expires in (days)'">
          <a-input-number v-model="issueForm.expires_in_days" :min="0" :max="3650" />
          <div class="hint">{{ $t('agentTokens.expiresHint') || '0 = no expiry. Default 30 is recommended.' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.paperOnly') || 'Paper-only'">
          <a-switch v-model="issueForm.paper_only" />
          <div class="hint" :class="{ danger: !issueForm.paper_only && issueForm.scopes.includes('T') }">
            {{ paperHint }}
          </div>
        </a-form-model-item>
      </a-form-model>
    </a-modal>

    <!-- Reveal token (shown ONCE) -->
    <a-modal
      :visible="!!revealed"
      :title="$t('agentTokens.revealTitle') || 'Token issued — copy it now'"
      :footer="null"
      :width="640"
      @cancel="revealed = null"
    >
      <a-alert
        type="warning"
        showIcon
        :message="$t('agentTokens.revealAlert') || 'This is the only time the full token will be shown. Store it in a secrets manager.'"
        style="margin-bottom: 16px"
      />
      <div v-if="revealed">
        <div class="reveal-row">
          <span class="reveal-label">{{ $t('agentTokens.name') || 'Name' }}:</span>
          <span>{{ revealed.name }}</span>
        </div>
        <div class="reveal-row">
          <span class="reveal-label">{{ $t('agentTokens.scopes') || 'Scopes' }}:</span>
          <a-tag v-for="s in revealed.scopes" :key="s" :color="scopeColor(s)">{{ s }}</a-tag>
        </div>
        <div class="reveal-row">
          <span class="reveal-label">{{ $t('agentTokens.token') || 'Token' }}:</span>
          <a-input :value="revealed.token" readOnly class="reveal-token-input" />
          <a-button type="primary" @click="copyToken(revealed.token)" style="margin-left: 8px">
            <a-icon type="copy" /> {{ $t('agentTokens.copy') || 'Copy' }}
          </a-button>
        </div>
        <a-alert
          type="info"
          showIcon
          style="margin-top: 16px"
          :message="$t('agentTokens.usageHint') || 'Use as: Authorization: Bearer <token>'"
        />
      </div>
    </a-modal>
  </div>
</template>

<script>
import {
  issueAgentToken,
  listAgentTokens,
  revokeAgentToken,
  listAgentAudit
} from '@/api/agent'

export default {
  name: 'AgentTokens',
  data () {
    return {
      activeTab: 'tokens',

      tokens: [],
      loadingTokens: false,

      audit: [],
      loadingAudit: false,
      auditLimit: 100,

      issueModalVisible: false,
      issuing: false,
      issueForm: this.freshIssueForm(),
      issueRules: {
        name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
        scopes: [{ type: 'array', required: true, min: 1, message: 'Pick at least one scope', trigger: 'change' }]
      },

      revealed: null,

      tokenColumns: [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: this.$t('agentTokens.name') || 'Name', dataIndex: 'name', width: 180 },
        { title: this.$t('agentTokens.prefix') || 'Prefix', dataIndex: 'token_prefix', width: 200 },
        { title: this.$t('agentTokens.scopes') || 'Scopes', dataIndex: 'scopes', scopedSlots: { customRender: 'scopes' }, width: 180 },
        { title: this.$t('agentTokens.markets') || 'Markets', dataIndex: 'markets', width: 160 },
        { title: this.$t('agentTokens.paperOnly') || 'Paper-only', dataIndex: 'paper_only', scopedSlots: { customRender: 'paper' }, width: 130 },
        { title: this.$t('agentTokens.rateLimit') || 'Rate/min', dataIndex: 'rate_limit_per_min', width: 100 },
        { title: this.$t('agentTokens.status') || 'Status', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
        { title: this.$t('agentTokens.lastUsed') || 'Last used', dataIndex: 'last_used_at', scopedSlots: { customRender: 'ts' }, width: 170 },
        { title: this.$t('agentTokens.expiresAt') || 'Expires', dataIndex: 'expires_at', scopedSlots: { customRender: 'ts' }, width: 170 },
        { title: this.$t('common.actions') || 'Actions', scopedSlots: { customRender: 'actions' }, width: 100, fixed: 'right' }
      ],
      auditColumns: [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: this.$t('agentTokens.agentName') || 'Agent', dataIndex: 'agent_name', width: 160 },
        { title: 'Method', dataIndex: 'method', width: 80 },
        { title: 'Route', dataIndex: 'route', width: 280, ellipsis: true },
        { title: 'Class', dataIndex: 'scope_class', scopedSlots: { customRender: 'scope' }, width: 80 },
        { title: 'Status', dataIndex: 'status_code', scopedSlots: { customRender: 'status' }, width: 90 },
        { title: 'Duration', dataIndex: 'duration_ms', scopedSlots: { customRender: 'duration' }, width: 100 },
        { title: 'When', dataIndex: 'created_at', scopedSlots: { customRender: 'ts' }, width: 170 }
      ]
    }
  },
  computed: {
    paperHint () {
      const sel = this.issueForm.scopes || []
      if (!this.issueForm.paper_only && sel.includes('T')) {
        return this.$t('agentTokens.paperOff_T') ||
          'Live trading also requires AGENT_LIVE_TRADING_ENABLED=true on the server. Until then T-class calls still record paper orders.'
      }
      return this.$t('agentTokens.paperOnHint') || 'Recommended. Trades are simulated and never touch exchange credentials.'
    }
  },
  mounted () {
    this.loadTokens()
  },
  methods: {
    freshIssueForm () {
      return {
        name: '',
        scopes: ['R'],
        markets: '*',
        instruments: '*',
        paper_only: true,
        rate_limit_per_min: 60,
        expires_in_days: 30
      }
    },
    scopeColor (s) {
      return ({ R: 'blue', W: 'cyan', B: 'geekblue', N: 'gold', C: 'volcano', T: 'red' })[s] || 'default'
    },
    statusColor (code) {
      const c = Number(code) || 0
      if (c >= 500) return 'red'
      if (c === 429) return 'orange'
      if (c >= 400) return 'volcano'
      if (c >= 200) return 'green'
      return 'default'
    },
    scopeHint (s) {
      const m = {
        R: this.$t('agentTokens.scopeHint.R') || 'Read: market data, strategies, jobs.',
        W: this.$t('agentTokens.scopeHint.W') || 'Workspace write: create/patch strategies.',
        B: this.$t('agentTokens.scopeHint.B') || 'Backtest / experiment / regime jobs.',
        N: this.$t('agentTokens.scopeHint.N') || 'Notifications & misc side-effects.',
        T: this.$t('agentTokens.scopeHint.T') || 'Trading. Paper-only by default; live needs an extra server-side switch.'
      }
      return m[s] || ''
    },
    formatTs (s) {
      if (!s) return ''
      try {
        const d = new Date(s)
        if (isNaN(d.getTime())) return s
        return d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
      } catch (e) {
        return String(s)
      }
    },
    async loadTokens () {
      this.loadingTokens = true
      try {
        const resp = await listAgentTokens()
        this.tokens = (resp && resp.data) || []
      } catch (e) {
        this.$message.error('Failed to load tokens: ' + (e.message || e))
      } finally {
        this.loadingTokens = false
      }
    },
    async loadAudit () {
      this.loadingAudit = true
      try {
        const resp = await listAgentAudit({ limit: this.auditLimit })
        this.audit = (resp && resp.data) || []
      } catch (e) {
        this.$message.error('Failed to load audit log: ' + (e.message || e))
      } finally {
        this.loadingAudit = false
      }
    },
    openIssueModal () {
      this.issueForm = this.freshIssueForm()
      this.issueModalVisible = true
    },
    closeIssueModal () {
      this.issueModalVisible = false
    },
    confirmIssue () {
      this.$refs.issueForm.validate(async valid => {
        if (!valid) return
        this.issuing = true
        try {
          const payload = {
            name: this.issueForm.name.trim(),
            scopes: this.issueForm.scopes.join(','),
            markets: (this.issueForm.markets || '*').trim() || '*',
            instruments: (this.issueForm.instruments || '*').trim() || '*',
            paper_only: !!this.issueForm.paper_only,
            rate_limit_per_min: Number(this.issueForm.rate_limit_per_min) || 60,
            expires_in_days: Number(this.issueForm.expires_in_days) || 0
          }
          const resp = await issueAgentToken(payload)
          const data = (resp && resp.data) || resp
          if (!data || !data.token) {
            throw new Error((resp && resp.message) || 'Empty response')
          }
          this.revealed = data
          this.issueModalVisible = false
          this.loadTokens()
        } catch (e) {
          this.$message.error('Issue failed: ' + (e.message || e))
        } finally {
          this.issuing = false
        }
      })
    },
    async confirmRevoke (id) {
      try {
        await revokeAgentToken(id)
        this.$message.success(this.$t('agentTokens.revoked') || 'Token revoked')
        this.loadTokens()
      } catch (e) {
        this.$message.error('Revoke failed: ' + (e.message || e))
      }
    },
    copyToken (token) {
      try {
        // Best-effort; navigator.clipboard requires HTTPS or localhost.
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(token)
        } else {
          const ta = document.createElement('textarea')
          ta.value = token
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        this.$message.success(this.$t('agentTokens.copied') || 'Token copied to clipboard')
      } catch (e) {
        this.$message.warning('Copy failed; please select and copy manually.')
      }
    },
    openQuickstart () {
      window.open('https://github.com/brokermr810/QuantDinger/blob/main/docs/agent/AGENT_QUICKSTART.md', '_blank')
    }
  },
  watch: {
    activeTab (val) {
      if (val === 'audit' && !this.audit.length) {
        this.loadAudit()
      }
    }
  }
}
</script>

<style lang="less" scoped>
.agent-tokens-page {
  padding: 16px;

  .page-header {
    margin-bottom: 16px;

    .page-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 22px;
    }

    .page-desc {
      margin-top: 6px;
      color: #888;
      max-width: 920px;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .agent-table-card {
    margin-top: 8px;
  }

  .hint {
    margin-top: 4px;
    color: #999;
    font-size: 12px;

    &.danger {
      color: #ff4d4f;
    }
  }

  .reveal-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .reveal-label {
      width: 90px;
      color: #888;
    }

    .reveal-token-input {
      flex: 1;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    }
  }

  .text-muted {
    color: #999;
  }
}
</style>
