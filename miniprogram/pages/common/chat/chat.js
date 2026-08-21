const cloud = require('../../../services/cloud');

Page({
  data: {
    messages: [
      { role: 'ai', text: '你好，我是赛事 AI 助手（混元）。可以问我：弃权怎么判？积分怎么算？同单位怎么回避？赛程怎么排？' },
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
    this.setData({ input: '', messages: [...this.data.messages, q], loading: true });
    try {
      const res = await cloud.call('ai-gateway', 'answer', { text });
      this.setData({ messages: [...this.data.messages, { role: 'ai', text: res.answer || res.text || '' }] });
    } catch (e) {
      this.setData({
        messages: [...this.data.messages, { role: 'ai', text: '⚠️ AI 服务异常：' + (e.message || '') }],
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
