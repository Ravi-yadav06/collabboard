const CanvasEngine = (() => {
  let canvas, ctx, container;
  let currentTool = 'pen'; // pen, eraser, line, rect, circle, text
  let currentColor = '#8b5cf6';
  let currentSize = 4;

  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentPath = [];

  // Draw History: Array of completed shape/stroke objects
  let drawData = [];
  let undoStack = [];
  let redoStack = [];

  // Text tool overlay state
  let activeTextInput = null;

  function init(canvasId, containerId, initialData = []) {
    canvas = document.getElementById(canvasId);
    container = document.getElementById(containerId);
    ctx = canvas.getContext('2d');

    drawData = initialData || [];
    undoStack = [...drawData];
    redoStack = [];

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupEventListeners();
    redraw();
  }

  function resizeCanvas() {
    if (!canvas || !container) return;

    // Save previous logical dimensions
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);
    redraw();
  }

  function setupEventListeners() {
    // Canvas mouse & touch events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', handleTouch(startDraw));
    canvas.addEventListener('touchmove', handleTouch(draw));
    canvas.addEventListener('touchend', stopDraw);

    // Toolbar Tool Selection
    const tools = ['pen', 'eraser', 'line', 'rect', 'circle', 'text'];
    tools.forEach(tool => {
      const btn = document.getElementById(`tool-${tool}`);
      if (btn) {
        btn.addEventListener('click', () => setTool(tool));
      }
    });

    // Color & Size Controls
    const colorPicker = document.getElementById('picker-color');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        if (currentTool === 'eraser') setTool('pen');
      });
    }

    const sizeSlider = document.getElementById('picker-size');
    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        currentSize = parseInt(e.target.value, 10);
      });
    }

    // Action buttons
    document.getElementById('btn-undo')?.addEventListener('click', undo);
    document.getElementById('btn-redo')?.addEventListener('click', redo);
    document.getElementById('btn-clear-canvas')?.addEventListener('click', clearCanvas);
  }

  function handleTouch(fn) {
    return (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      fn(mouseEvent);
    };
  }

  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool-${tool}`)?.classList.add('active');

    if (activeTextInput) {
      removeTextInput();
    }
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDraw(e) {
    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;

    if (currentTool === 'text') {
      createTextInput(startX, startY);
      return;
    }

    isDrawing = true;
    currentPath = [{ x: startX, y: startY }];
  }

  function draw(e) {
    const coords = getCanvasCoords(e);

    // Broadcast cursor position to room
    if (typeof SocketClient !== 'undefined') {
      SocketClient.sendCursorMove(coords.x, coords.y);
    }

    if (!isDrawing) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentPath.push({ x: coords.x, y: coords.y });

      // Live local render for pen/eraser stroke segment
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentTool === 'eraser' ? '#121826' : currentColor;

      ctx.beginPath();
      const prev = currentPath[currentPath.length - 2];
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      // Emit stroke chunk over socket
      if (typeof SocketClient !== 'undefined') {
        SocketClient.sendDrawAction({
          type: 'stroke-segment',
          tool: currentTool,
          color: currentColor,
          size: currentSize,
          from: prev,
          to: { x: coords.x, y: coords.y }
        });
      }
    } else if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle') {
      // For shapes, redraw canvas and draw preview shape
      redraw();
      drawShape(ctx, {
        type: currentTool,
        startX,
        startY,
        endX: coords.x,
        endY: coords.y,
        color: currentColor,
        size: currentSize
      });
    }
  }

  function stopDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;

    let actionObj = null;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      if (currentPath.length > 0) {
        actionObj = {
          type: 'freehand',
          tool: currentTool,
          points: currentPath,
          color: currentColor,
          size: currentSize
        };
      }
    } else if (e) {
      const coords = getCanvasCoords(e);
      actionObj = {
        type: currentTool,
        startX,
        startY,
        endX: coords.x,
        endY: coords.y,
        color: currentColor,
        size: currentSize
      };
    }

    if (actionObj) {
      drawData.push(actionObj);
      undoStack = [...drawData];
      redoStack = [];

      // Broadcast full action to room for state persistence
      if (typeof SocketClient !== 'undefined') {
        SocketClient.sendDrawAction({
          type: 'commit-action',
          action: actionObj
        });
      }
    }
  }

  function drawShape(targetCtx, action) {
    targetCtx.lineWidth = action.size;
    targetCtx.strokeStyle = action.color;
    targetCtx.fillStyle = action.color;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    targetCtx.beginPath();

    if (action.type === 'freehand') {
      if (!action.points || action.points.length === 0) return;
      targetCtx.strokeStyle = action.tool === 'eraser' ? '#121826' : action.color;
      targetCtx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        targetCtx.lineTo(action.points[i].x, action.points[i].y);
      }
      targetCtx.stroke();
    } else if (action.type === 'line') {
      targetCtx.moveTo(action.startX, action.startY);
      targetCtx.lineTo(action.endX, action.endY);
      targetCtx.stroke();
    } else if (action.type === 'rect') {
      const width = action.endX - action.startX;
      const height = action.endY - action.startY;
      targetCtx.strokeRect(action.startX, action.startY, width, height);
    } else if (action.type === 'circle') {
      const radius = Math.hypot(action.endX - action.startX, action.endY - action.startY);
      targetCtx.arc(action.startX, action.startY, radius, 0, 2 * Math.PI);
      targetCtx.stroke();
    } else if (action.type === 'text') {
      targetCtx.font = `${action.size * 4 + 12}px 'Outfit', sans-serif`;
      targetCtx.fillText(action.text, action.startX, action.startY);
    }
  }

  function createTextInput(x, y) {
    if (activeTextInput) removeTextInput();

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-tool-input';
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    input.style.color = currentColor;
    input.style.fontSize = `${currentSize * 4 + 12}px`;

    container.appendChild(input);
    input.focus();
    activeTextInput = input;

    const commitText = () => {
      const text = input.value.trim();
      if (text) {
        const actionObj = {
          type: 'text',
          text,
          startX: x,
          startY: y + (currentSize * 4 + 12), // Align font baseline
          color: currentColor,
          size: currentSize
        };

        drawData.push(actionObj);
        undoStack = [...drawData];
        redoStack = [];
        redraw();

        if (typeof SocketClient !== 'undefined') {
          SocketClient.sendDrawAction({
            type: 'commit-action',
            action: actionObj
          });
        }
      }
      removeTextInput();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitText();
      if (e.key === 'Escape') removeTextInput();
    });

    input.addEventListener('blur', commitText);
  }

  function removeTextInput() {
    if (activeTextInput && activeTextInput.parentNode) {
      activeTextInput.parentNode.removeChild(activeTextInput);
      activeTextInput = null;
    }
  }

  function redraw() {
    if (!ctx || !canvas) return;
    const rect = container.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    drawData.forEach(action => drawShape(ctx, action));
  }

  function clearCanvas(broadcast = true) {
    drawData = [];
    undoStack = [];
    redoStack = [];
    redraw();

    if (broadcast && typeof SocketClient !== 'undefined') {
      SocketClient.sendClearCanvas();
    }
  }

  function undo() {
    if (drawData.length === 0) return;
    const popped = drawData.pop();
    redoStack.push(popped);
    redraw();

    if (typeof SocketClient !== 'undefined') {
      SocketClient.sendCanvasRestore(drawData);
    }
  }

  function redo() {
    if (redoStack.length === 0) return;
    const item = redoStack.pop();
    drawData.push(item);
    redraw();

    if (typeof SocketClient !== 'undefined') {
      SocketClient.sendCanvasRestore(drawData);
    }
  }

  function handleRemoteDrawAction(actionData) {
    if (actionData.type === 'stroke-segment') {
      ctx.lineWidth = actionData.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = actionData.tool === 'eraser' ? '#121826' : actionData.color;

      ctx.beginPath();
      ctx.moveTo(actionData.from.x, actionData.from.y);
      ctx.lineTo(actionData.to.x, actionData.to.y);
      ctx.stroke();
    } else if (actionData.type === 'commit-action') {
      drawData.push(actionData.action);
      undoStack = [...drawData];
      redraw();
    }
  }

  function restoreCanvasState(data) {
    drawData = data || [];
    undoStack = [...drawData];
    redraw();
  }

  function exportImage() {
    const tempCanvas = document.createElement('canvas');
    const rect = container.getBoundingClientRect();
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Fill dark background
    tempCtx.fillStyle = '#121826';
    tempCtx.fillRect(0, 0, rect.width, rect.height);

    // Render draw actions
    drawData.forEach(action => drawShape(tempCtx, action));

    const link = document.createElement('a');
    link.download = `collabboard-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  return {
    init,
    getDrawData: () => drawData,
    handleRemoteDrawAction,
    clearCanvas,
    restoreCanvasState,
    exportImage
  };
})();
