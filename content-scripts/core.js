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
    const containers = window.PinAdapter.getAssistantMessageContainers();

    return { exactText: text, prefix, suffix, messageIndex: containers.indexOf(container) };
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
      sendResponse(resolvePin(message.pin));
      return true;
    }
  });

  function resolvePin(pin) {
    if (!window.PinAdapter) return { found: false };
    const containers = window.PinAdapter.getAssistantMessageContainers();

    if (pin.messageIndex != null && containers[pin.messageIndex]) {
      const m = searchInContainer(containers[pin.messageIndex], pin, true);
      if (m) return finalizeMatch(m);
    }
    if (pin.messageIndex != null && containers[pin.messageIndex]) {
      const m = searchInContainer(containers[pin.messageIndex], pin, false);
      if (m) return finalizeMatch(m);
    }
    for (const c of containers) {
      const m = searchInContainer(c, pin, true);
      if (m) return finalizeMatch(m);
    }
    for (const c of containers) {
      const m = searchInContainer(c, pin, false);
      if (m) return finalizeMatch(m);
    }
    return { found: false };
  }

  function searchInContainer(container, pin, useContext) {
    const fullText = container.textContent || '';
    const needle = useContext ? pin.prefix + pin.exactText + pin.suffix : pin.exactText;
    const idx = fullText.indexOf(needle);
    if (idx === -1) return null;
    const startOffset = useContext ? idx + pin.prefix.length : idx;
    return { container, startOffset, length: pin.exactText.length };
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