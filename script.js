(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const startBtn = document.getElementById('start-btn');
  const controls = document.getElementById('controls');

  const COLS = 20;
  let cellSize = 0;
  let snake, direction, nextDirection, food, score, best, running, paused, loopId, speedMs;

  function loadBest(){
    try{
      const v = localStorage.getItem('snake-best-score');
      return v ? parseInt(v,10) : 0;
    }catch(e){ return 0; }
  }
  function saveBest(v){
    try{ localStorage.setItem('snake-best-score', String(v)); }catch(e){}
  }

  function resizeCanvas(){
    const wrap = canvas.parentElement;
    const size = Math.floor(wrap.clientWidth);
    canvas.width = size;
    canvas.height = size;
    cellSize = size / COLS;
    draw();
  }

  function randCell(){
    return Math.floor(Math.random() * COLS);
  }

  function placeFood(){
    let pos;
    do{
      pos = { x: randCell(), y: randCell() };
    }while(snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function resetGame(){
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    speedMs = 130;
    scoreEl.textContent = '0';
    placeFood();
  }

  function gameOver(){
    running = false;
    clearInterval(loopId);
    if(score > best){
      best = score;
      bestEl.textContent = best;
      saveBest(best);
    }
    overlayTitle.textContent = 'Game Over';
    overlayMsg.textContent = 'Score: ' + score + '  •  Best: ' + best;
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  function tick(){
    if(paused) return;
    direction = nextDirection;
    const head = { ...snake[0] };

    if(direction === 'up') head.y -= 1;
    else if(direction === 'down') head.y += 1;
    else if(direction === 'left') head.x -= 1;
    else if(direction === 'right') head.x += 1;

    if(head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= COLS){
      gameOver(); return;
    }
    if(snake.some(s => s.x === head.x && s.y === head.y)){
      gameOver(); return;
    }

    snake.unshift(head);

    if(head.x === food.x && head.y === food.y){
      score += 10;
      scoreEl.textContent = score;
      placeFood();
      if(speedMs > 60 && score % 50 === 0){
        speedMs -= 6;
        restartLoop();
      }
    } else {
      snake.pop();
    }

    draw();
  }

  function restartLoop(){
    clearInterval(loopId);
    loopId = setInterval(tick, speedMs);
  }

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for(let i=1;i<COLS;i++){
      ctx.beginPath();
      ctx.moveTo(i*cellSize, 0);
      ctx.lineTo(i*cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i*cellSize);
      ctx.lineTo(canvas.width, i*cellSize);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = '#f87171';
    const fpad = cellSize * 0.18;
    roundRect(food.x*cellSize+fpad, food.y*cellSize+fpad, cellSize-fpad*2, cellSize-fpad*2, 6);
    ctx.fill();

    // snake
    snake.forEach((seg, i) => {
      const pad = cellSize * 0.08;
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? '#5eead4' : mixColor('#5eead4','#38bdf8', t);
      roundRect(seg.x*cellSize+pad, seg.y*cellSize+pad, cellSize-pad*2, cellSize-pad*2, 5);
      ctx.fill();
    });
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function mixColor(c1, c2, t){
    const p1 = hexToRgb(c1), p2 = hexToRgb(c2);
    const r = Math.round(p1.r + (p2.r-p1.r)*t);
    const g = Math.round(p1.g + (p2.g-p1.g)*t);
    const b = Math.round(p1.b + (p2.b-p1.b)*t);
    return `rgb(${r},${g},${b})`;
  }
  function hexToRgb(hex){
    const n = parseInt(hex.slice(1),16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }

  function setDirection(dir){
    const opposite = { up:'down', down:'up', left:'right', right:'left' };
    if(dir === opposite[direction]) return;
    nextDirection = dir;
    if(paused) togglePause();
  }

  function togglePause(){
    if(!running) return;
    paused = !paused;
  }

  function startGame(){
    resetGame();
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    restartLoop();
  }

  startBtn.addEventListener('click', startGame);

  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
    if(key === 'arrowup' || key === 'w') setDirection('up');
    else if(key === 'arrowdown' || key === 's') setDirection('down');
    else if(key === 'arrowleft' || key === 'a') setDirection('left');
    else if(key === 'arrowright' || key === 'd') setDirection('right');
    else if(key === ' ') togglePause();
  });

  controls.querySelectorAll('.ctrl-btn').forEach(btn => {
    btn.addEventListener('click', () => setDirection(btn.dataset.dir));
  });

  // swipe controls
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive:true });

  canvas.addEventListener('touchend', e => {
    if(!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if(Math.abs(dx) < 20 && Math.abs(dy) < 20){
      togglePause();
      touchStart = null;
      return;
    }
    if(Math.abs(dx) > Math.abs(dy)){
      setDirection(dx > 0 ? 'right' : 'left');
    } else {
      setDirection(dy > 0 ? 'down' : 'up');
    }
    touchStart = null;
  }, { passive:true });

  canvas.addEventListener('click', () => {
    if(running) togglePause();
  });

  window.addEventListener('resize', resizeCanvas);

  // init
  best = loadBest();
  bestEl.textContent = best;
  resetGame();
  resizeCanvas();
  draw();
})();