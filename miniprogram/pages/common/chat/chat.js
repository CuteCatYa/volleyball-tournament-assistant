const cloud = require('../../../services/cloud');

Page({
  data: {
    messages: [
      { role: 'ai', text: '你好，我是赛事 AI 助手。可以问我：我们队明天几点打、在哪个馆、对阵谁、规程第几条等。' },
    ],
    input: '',
    loading: false,
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  async send() {
    const text = this.data.input.trim();
    if (!text) return;
    const q = { role: 'user', text };
    this.setData({
      input: '',
      messages: [...this.data.messages, q],
      loading: true,
      scrollIntoView: 'msg-last',
    });
    try {
      const res = await cloud.call('ai-gateway', 'chat', { scene: 'A9', question: text });
      this.setData({ messages: [...this.data.messages, { role: 'ai', text: res.answer || res.text || '' }] });
    } catch (e) {
      this.setData({
        messages: [...this.data.messages, {
          role: 'ai',
          text: '⚠️ AI 服务未就绪。赛程/成绩类问题将由结构化直查（core）返回；完整能力需配置大模型后启用。',
        }],
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});