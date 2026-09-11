(function () {
  const CONTEXT_LENGTH = 40;
  let lastSelectionInfo = null;

  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    lastSelectionInfo = text ? buildAnchorFromSelection(selection, text) : null;
  });

  function buildAnchorFromSelection(selection, text) {
    if (!window.PinAdapter) return null;
    const range = selection.getRangeAt(0);
    const container = window.PinAdapter.findMessageContainer(range.startContainer);
    if (!container) return null;

    const fullText = container.textContent || '';
    const idx = fullText.indexOf(text);
    if (idx === -1) return null;

    const prefix = fullText.slice(Math.max(0, idx - CONTEXT_LENGTH), idx);
    const suffix = fullText.slice(idx + text.length, idx + text.length + CONTEXT_LENGTH);

    return { exactText: text, prefix, suffix };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_LAST_SELECTION') {
      sendResponse({
        selection: lastSelectionInfo,
        conversationId: window.PinAdapter ? window.PinAdapter.getConversationId() : null,
        site: window.PinAdapter ? window.PinAdapter.site : null
      });
      return true;
    }
    if (message.type === 'RESOLVE_PIN') {
      resolvePinWithScan(message.pin).then(sendResponse);
      return true; // نخلي القناة مفتوحة لأن البحث صار غير متزامن (async)
    }
  });

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function searchInContainer(container, pin, useContext) {
    const fullText = container.textContent || '';
    const needle = useContext ? pin.prefix + pin.exactText + pin.suffix : pin.exactText;
    const idx = fullText.indexOf(needle);
    if (idx === -1) return null;
    const startOffset = useContext ? idx + pin.prefix.length : idx;
    return { container, startOffset, length: pin.exactText.length };
  }

  function searchAllVisible(pin) {
    if (!window.PinAdapter) return null;
    const containers = window.PinAdapter.getAssistantMessageContainers();
    for (const c of containers) {
      const m = searchInContainer(c, pin, true) || searchInContainer(c, pin, false);
      if (m) return m;
    }
    return null;
  }

  function findScrollContainer(el) {
    let node = el;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  async function resolvePinWithScan(pin) {
    if (!window.PinAdapter) return { found: false };

    // فحص سريع أول: يمديه يكون النص ظاهر أصلاً بدون ما نحتاج نسكرول
    let match = searchAllVisible(pin);
    if (match) return finalizeMatch(match);

    const anyContainer = window.PinAdapter.getAssistantMessageContainers()[0];
    if (!anyContainer) return { found: false };
    const scrollEl = findScrollContainer(anyContainer);

    scrollEl.scrollTop = 0;
    await wait(400);

    const maxSteps = 60;
    for (let i = 0; i < maxSteps; i++) {
      match = searchAllVisible(pin);
      if (match) return finalizeMatch(match);

      if (scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 4) break;
      scrollEl.scrollTop += scrollEl.clientHeight * 0.8;
      await wait(350);
    }
    return { found: false };
  }

  function finalizeMatch(match) {
    const range = buildRangeFromTextOffset(match.container, match.startOffset, match.length);
    if (!range) return { found: false };
    const target = range.startContainer.parentElement || match.container;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightRange(range);
    return { found: true };
  }

  function buildRangeFromTextOffset(container, startOffset, length) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node, running = 0, startNode, startNodeOffset, endNode, endNodeOffset;
    const endOffset = startOffset + length;

    while ((node = walker.nextNode())) {
      const nodeLen = node.textContent.length;
      const nodeStart = running, nodeEnd = running + nodeLen;
      if (!startNode && startOffset >= nodeStart && startOffset < nodeEnd) {
        startNode = node; startNodeOffset = startOffset - nodeStart;
      }
      if (!endNode && endOffset >= nodeStart && endOffset <= nodeEnd) {
        endNode = node; endNodeOffset = endOffset - nodeStart;
      }
      running = nodeEnd;
      if (startNode && endNode) break;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  function highlightRange(range) {
    const mark = document.createElement('span');
    mark.style.backgroundColor = '#ffe066';
    mark.style.transition = 'background-color 1.5s ease';
    try { range.surroundContents(mark); } catch (e) { return; }
    setTimeout(() => {
      mark.style.backgroundColor = 'transparent';
      setTimeout(() => {
        const parent = mark.parentNode;
        if (parent) {
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
          parent.removeChild(mark);
        }
      }, 1500);
    }, 1200);
  }
})();