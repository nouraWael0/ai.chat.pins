(function () {
  window.PinAdapter = {
    site: 'claude',
    getConversationId() {
      const m = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
      return m ? m[1] : 'unknown-claude-conversation';
    },
    getAssistantMessageContainers() {
      return Array.from(document.querySelectorAll('[data-perf-reply-text]'));
    },
    findMessageContainer(node) {
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return el ? el.closest('[data-perf-reply-text]') : null;
    }
  };
})();