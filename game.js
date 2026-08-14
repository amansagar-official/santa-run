(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const hiscoreEl = document.getElementById('hiscore');
  const bestDisplay = document.getElementById('bestDisplay');
  const overlay = document.getElementById('overlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const quitBtn = document.getElementById('quitBtn');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');

  const images = {
    santa: new Image(),
    gift: new Image(),
    snowman: new Image(),
    kids: new Image(),
    eagle: new Image(),
    mystery: new Image(),
    bg: new Image()
  };
  // Use the cleanest single frames
  images.santa.src = 'assets/santa2.png';
  images.gift.src = 'assets/gift.png';
  images.snowman.src = 'assets/snowman.png';
  images.kids.src = 'assets/kids1.png';
  images.eagle.src = 'assets/eagle.png';
  images.mystery.src = 'assets/mystery.png';
  images.bg.src = 'assets/bg.jpg';

  let assetsLoaded = 0;
  const totalAssets = 7;
  Object.values(images).forEach(img => {
    img.onload = () => { assetsLoaded++; if (assetsLoaded === totalAssets) init(); };
    img.onerror = () => { assetsLoaded++; if (assetsLoaded === totalAssets) init(); };
  });

  let W, H, groundY;
  let state = 'start'; // start | playing | paused | gameover
  let score = 0;
  let highScore = parseInt(localStorage.getItem('santaRunHigh') || '0', 10);
  let speed = 7;
  let frame = 0;
  let bgOffset = 0;
  let particles = [];
  let lootTimer = 0;
  let keys = { down: false };

  // Powers
  let invincible = false;
  let invincibleTimer = 0;
  let jetpack = false;
  let jetpackTimer = 0;
  const POWER_DURATION = 12 * 60; // 12 seconds
  const MILESTONES = [100, 300, 2000, 5000, 15000]; // 300 = jetpack
  let milestonesReached = {};

  const santa = {
    x: 0, y: 0, w: 70, h: 95, baseH: 95,
    vy: 0, grounded: true, ducking: false,
    jumpPower: -15.8, gravity: 0.78,
    footOffset: 4
  };

  let obstacles = [];
  let gifts = [];
  let powerups = [];
  let nextObstacle = 0;
  let nextGift = 0;
  let nextEagle = 0;
  let kidsOffset = 0;

  function spawnSnow(n = 1) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W, y: -8,
        r: 1.2 + Math.random() * 2.2,
        speed: 0.9 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 0.7
      });
    }
  }

  function spawnSparkles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 30,
        r: 2 + Math.random() * 3.5,
        speed: -2.5 - Math.random() * 4,
        drift: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 25,
        color
      });
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Snow surface line
    groundY = Math.floor(H * 0.78);

    const scale = Math.max(0.72, Math.min(1.35, H / 700));
    santa.baseH = 88 * scale;
    santa.w = 62 * scale;
    santa.h = santa.ducking ? santa.baseH * 0.58 : santa.baseH;
    santa.x = Math.min(90 * scale, W * 0.12);
    santa.footOffset = 3 * scale;

    if ((state === 'playing' || state === 'paused') && santa.grounded && !jetpack) {
      santa.y = groundY - santa.h + santa.footOffset;
    }
  }

  function plantSantaOnGround() {
    santa.y = groundY - santa.h + santa.footOffset;
    santa.vy = 0;
    santa.grounded = true;
  }

  function resetGame() {
    score = 0;
    speed = 7;
    frame = 0;
    bgOffset = 0;
    obstacles = [];
    gifts = [];
    powerups = [];
    particles = [];
    nextObstacle = 80;
    nextGift = 50;
    nextEagle = 200;
    lootTimer = 0;
    invincible = false;
    invincibleTimer = 0;
    jetpack = false;
    jetpackTimer = 0;
    milestonesReached = {};
    kidsOffset = 0;
    keys.down = false;

    santa.ducking = false;
    santa.h = santa.baseH;
    plantSantaOnGround();
    scoreEl.textContent = '0';
    for (let i = 0; i < 35; i++) spawnSnow();
  }

  function startGame() {
    resetGame();
    state = 'playing';
    overlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    pauseOverlay.classList.remove('hidden');
  }

  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseOverlay.classList.add('hidden');
  }

  function quitToMenu() {
    state = 'start';
    pauseOverlay.classList.add('hidden');
    overlay.classList.remove('hidden');
    overlay.querySelector('.title').textContent = 'SANTA RUN';
    overlay.querySelector('.subtitle').textContent = 'Endless Christmas Adventure';
    startBtn.textContent = 'PLAY';
    bestDisplay.textContent = highScore;
  }

  function gameOver() {
    if (state === 'gameover' || invincible || jetpack) return;
    state = 'gameover';
    lootTimer = 90;
    jetpack = false;
    invincible = false;
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: santa.x + santa.w / 2 + (Math.random() - 0.5) * 50,
        y: santa.y + santa.h * 0.4,
        r: 3 + Math.random() * 4,
        speed: -3 - Math.random() * 4,
        drift: (Math.random() - 0.5) * 7,
        life: 40 + Math.random() * 25,
        color: Math.random() > 0.4 ? '#ffd700' : '#ff4d4d'
      });
    }
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('santaRunHigh', highScore);
    }
    hiscoreEl.textContent = highScore;
    bestDisplay.textContent = highScore;

    setTimeout(() => {
      if (state !== 'gameover') return;
      overlay.classList.remove('hidden');
      overlay.querySelector('.title').textContent = 'GAME OVER';
      overlay.querySelector('.subtitle').innerHTML =
        '<div class="final-score">' + score + '</div>Kids looted Santa!';
      startBtn.textContent = 'PLAY AGAIN';
    }, 1100);
  }

  function showStart() {
    state = 'start';
    overlay.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');
    overlay.querySelector('.title').textContent = 'SANTA RUN';
    overlay.querySelector('.subtitle').textContent = 'Endless Christmas Adventure';
    startBtn.textContent = 'PLAY';
    bestDisplay.textContent = highScore;
    hiscoreEl.textContent = highScore;
    santa.y = -500;
    obstacles = [];
    gifts = [];
    powerups = [];
  }

  function setDuck(on) {
    if (state !== 'playing' || jetpack) return;
    if (on && !santa.ducking && santa.grounded) {
      santa.ducking = true;
      santa.h = santa.baseH * 0.58;
      plantSantaOnGround();
    } else if (!on && santa.ducking) {
      santa.ducking = false;
      santa.h = santa.baseH;
      plantSantaOnGround();
    }
  }

  function jump() {
    if (state === 'playing' && santa.grounded && !santa.ducking && !jetpack) {
      santa.vy = santa.jumpPower;
      santa.grounded = false;
    } else if (state === 'start' || state === 'gameover') {
      startGame();
    }
  }

  function activatePower(type) {
    if (type === 'invincible') {
      invincible = true;
      invincibleTimer = POWER_DURATION;
      spawnSparkles(santa.x + santa.w / 2, santa.y + santa.h / 2, '#a0e0ff', 16);
    } else if (type === 'jetpack') {
      jetpack = true;
      jetpackTimer = POWER_DURATION;
      invincible = true;
      invincibleTimer = POWER_DURATION;
      santa.ducking = false;
      santa.h = santa.baseH;
      santa.grounded = false;
      santa.vy = -6;
      spawnSparkles(santa.x + santa.w / 2, santa.y + santa.h, '#ff6600', 20);
    }
  }

  function checkMilestones() {
    for (const m of MILESTONES) {
      if (score >= m && !milestonesReached[m]) {
        milestonesReached[m] = true;
        const isJet = (m === 300);
        powerups.push({
          x: W + 70,
          y: groundY - (isJet ? 160 : 120) - Math.random() * 30,
          w: isJet ? 48 : 50,
          h: isJet ? 48 : 65,
          bob: Math.random() * 6,
          type: isJet ? 'jetpack' : 'mystery',
          collected: false
        });
      }
    }
  }

  function update() {
    if (state !== 'playing' && state !== 'gameover') return;
    frame++;

    if (state === 'gameover') {
      lootTimer--;
      if (kidsOffset < 100) kidsOffset += 3.5;
      particles = particles.filter(p => {
        p.y += p.speed || 1;
        p.x += p.drift || 0;
        if (p.life != null) { p.life--; return p.life > 0; }
        return p.y < H + 20;
      });
      return;
    }

    // ===== PLAYING =====
    speed = 7 + Math.min(score / 150, 8.5);

    // Power timers
    if (invincible) {
      invincibleTimer--;
      if (invincibleTimer <= 0) invincible = false;
    }
    if (jetpack) {
      jetpackTimer--;
      // Keep Santa flying at a stable height
      const flyTarget = groundY - santa.baseH - 110;
      santa.y += (flyTarget - santa.y) * 0.08;
      santa.vy = 0;
      santa.grounded = false;
      // Flame particles
      if (frame % 2 === 0) {
        particles.push({
          x: santa.x + santa.w * 0.3 + Math.random() * 10,
          y: santa.y + santa.h - 5,
          r: 2 + Math.random() * 4,
          speed: 2 + Math.random() * 3,
          drift: (Math.random() - 0.5) * 2,
          life: 12 + Math.random() * 10,
          color: Math.random() > 0.5 ? '#ff6600' : '#ffcc00'
        });
      }
      if (jetpackTimer <= 0) {
        jetpack = false;
        invincible = false;
        plantSantaOnGround();
        spawnSparkles(santa.x + santa.w / 2, santa.y + santa.h / 2, '#ffffff', 12);
      }
    }

    if (!jetpack) {
      if (keys.down) setDuck(true);
      else setDuck(false);

      // Gravity
      if (!santa.grounded) {
        santa.vy += santa.gravity;
        santa.y += santa.vy;
      }
      const targetY = groundY - santa.h + santa.footOffset;
      if (santa.y >= targetY) {
        plantSantaOnGround();
      } else {
        santa.grounded = false;
      }
    }

    bgOffset += speed * 0.45;

    // Spawn snowmen
    nextObstacle--;
    if (nextObstacle <= 0) {
      const sc = 0.48 + Math.random() * 0.3;
      const h = 76 * sc, w = 56 * sc;
      obstacles.push({ x: W + 50, y: groundY - h + 6, w, h, type: 'snowman' });
      nextObstacle = 75 + Math.random() * 70 - Math.min(score / 50, 20);
    }

    // Spawn eagles higher
    nextEagle--;
    if (nextEagle <= 0) {
      const sc = 0.9 + Math.random() * 0.2;
      const w = 100 * sc, h = 64 * sc;
      obstacles.push({
        x: W + 80,
        y: groundY - 200 - Math.random() * 40,
        w, h, type: 'eagle',
        flap: Math.random() * 8,
        baseY: groundY - 200 - Math.random() * 40,
        wave: Math.random() * 6
      });
      nextEagle = 170 + Math.random() * 110;
    }

    // Gifts
    nextGift--;
    if (nextGift <= 0) {
      const sc = 0.36 + Math.random() * 0.16;
      gifts.push({
        x: W + 25,
        y: groundY - 95 - Math.random() * (jetpack ? 140 : 70),
        w: 40 * sc, h: 46 * sc,
        collected: false, bob: Math.random() * 5
      });
      nextGift = 40 + Math.random() * 50;
    }

    // Move
    for (let o of obstacles) {
      o.x -= speed;
      if (o.type === 'eagle') {
        o.flap += 0.26;
        o.wave += 0.04;
        o.y = o.baseY + Math.sin(o.wave) * 16;
      }
    }
    for (let g of gifts) { g.x -= speed; g.bob += 0.1; }
    for (let p of powerups) { p.x -= speed; p.bob += 0.11; }

    obstacles = obstacles.filter(o => o.x + o.w > -50);
    gifts = gifts.filter(g => g.x + g.w > -30 && !g.collected);
    powerups = powerups.filter(p => p.x + p.w > -30 && !p.collected);

    // Collision
    const padX = 14, padT = santa.ducking ? 10 : 18, padB = 12;
    const sx = santa.x + padX;
    const sy = santa.y + padT;
    const sw = santa.w - padX * 2;
    const sh = santa.h - padT - padB;

    if (!invincible && !jetpack) {
      for (let o of obstacles) {
        if (o.type === 'snowman') {
          if (sx < o.x + o.w * 0.68 && sx + sw > o.x + o.w * 0.22 &&
              sy < o.y + o.h && sy + sh > o.y + 10) {
            gameOver(); return;
          }
        } else if (o.type === 'eagle') {
          if (!santa.ducking &&
              sx < o.x + o.w * 0.85 && sx + sw > o.x + 8 &&
              sy < o.y + o.h * 0.82 && sy + sh > o.y + 6) {
            gameOver(); return;
          }
        }
      }
    }

    for (let g of gifts) {
      if (!g.collected &&
          sx < g.x + g.w && sx + sw > g.x &&
          sy < g.y + g.h && sy + sh > g.y) {
        g.collected = true;
        score += 15;
        scoreEl.textContent = score;
        spawnSparkles(g.x + g.w / 2, g.y + g.h / 2, '#ffd700', 8);
      }
    }

    for (let p of powerups) {
      if (!p.collected &&
          sx < p.x + p.w && sx + sw > p.x &&
          sy < p.y + p.h && sy + sh > p.y) {
        p.collected = true;
        activatePower(p.type);
      }
    }

    if (frame % 4 === 0) {
      score += 1;
      scoreEl.textContent = score;
      checkMilestones();
    }

    if (frame % 2 === 0) spawnSnow(1);
    particles = particles.filter(p => {
      p.y += p.speed || 1.1;
      p.x += p.drift || 0;
      if (p.life != null) { p.life--; return p.life > 0; }
      return p.y < H + 20;
    });
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#040b18');
    g.addColorStop(0.35, '#0c223f');
    g.addColorStop(0.7, '#173a5c');
    g.addColorStop(1, '#2a5f82');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 167) + bgOffset * 0.05) % (W + 15);
      const sy = 10 + (i * 39) % (H * 0.42);
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 4 === 0) ? 1.6 : 1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (images.bg.complete && images.bg.naturalWidth > 0) {
      const aspect = images.bg.width / images.bg.height;
      const th = groundY + 30;
      const tw = th * aspect;
      let ox = -((bgOffset * 0.2) % tw);
      ctx.globalAlpha = 0.94;
      for (let x = ox - tw; x < W + tw; x += tw - 1) {
        ctx.drawImage(images.bg, x, 0, tw, th);
      }
      ctx.globalAlpha = 1;
    }

    // Snow ground
    ctx.fillStyle = '#e8f4fc';
    ctx.fillRect(0, groundY, W, H - groundY + 4);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(x, groundY + Math.sin((x + bgOffset * 1.5) * 0.04) * 3);
    }
    ctx.lineTo(W, groundY + 22);
    ctx.lineTo(0, groundY + 22);
    ctx.fill();
  }

  function draw() {
    drawBackground();

    // Gifts
    for (let g of gifts) {
      if (g.collected) continue;
      const by = Math.sin(g.bob) * 5;
      if (images.gift.complete) ctx.drawImage(images.gift, g.x, g.y + by, g.w, g.h);
    }

    // Powerups
    for (let p of powerups) {
      if (p.collected) continue;
      const by = Math.sin(p.bob) * 5.5;
      if (p.type === 'mystery' && images.mystery.complete) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10 + Math.sin(frame * 0.12) * 5;
        ctx.drawImage(images.mystery, p.x, p.y + by, p.w, p.h);
        ctx.shadowBlur = 0;
      } else if (p.type === 'jetpack') {
        // Simple jetpack icon (drawn)
        ctx.fillStyle = '#ff6600';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y + by, p.w, p.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🚀', p.x + p.w / 2, p.y + by + p.h / 2 + 8);
      }
    }

    // Obstacles
    for (let o of obstacles) {
      if (o.type === 'snowman' && images.snowman.complete) {
        ctx.drawImage(images.snowman, o.x, o.y, o.w, o.h);
      } else if (o.type === 'eagle' && images.eagle.complete) {
        const fs = 1 + Math.sin(o.flap) * 0.1;
        const eh = o.h * fs;
        ctx.drawImage(images.eagle, o.x, o.y - (eh - o.h) / 2, o.w, eh);
      }
    }

    // ===== KIDS (behind Santa, feet on ground) =====
    if (state !== 'start' && images.kids.complete) {
      const kw = 135;
      const kh = 82;
      // Run cycle - only bounce UP from ground
      const t = (state === 'playing') ? frame * 0.19 : 0;
      const bob = Math.abs(Math.sin(t)) * 3.2;
      const kx = santa.x - 138 + kidsOffset;
      const ky = groundY - kh + 5 + bob; // lowest point is on ground
      ctx.drawImage(images.kids, kx, ky, kw, kh);
    }

    // ===== SANTA (feet locked on ground) =====
    if (state !== 'start' && images.santa.complete) {
      let drawH = santa.h;
      let drawY = santa.y;
      let bob = 0;
      let squash = 1;

      if (state === 'playing' && !santa.ducking && santa.grounded && !jetpack) {
        const t = frame * 0.20;
        // Bounce only UP so feet never go below ground
        bob = Math.abs(Math.sin(t)) * 3.8;
        squash = 1 + Math.sin(t) * 0.035;
      } else if (!santa.grounded && !jetpack) {
        if (santa.vy < 0) {
          drawH = santa.baseH * 1.05;
          drawY = santa.y - 2;
        } else {
          drawH = santa.baseH * 0.95;
        }
      }

      const dw = santa.w * squash;
      const dh = drawH * (2 - squash);
      const dx = santa.x - (dw - santa.w) / 2;
      const dy = drawY + bob;

      if (invincible || jetpack) {
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.22) * 0.2;
        ctx.shadowColor = jetpack ? '#ff6600' : '#60c0ff';
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(images.santa, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Shadow only when grounded
      if (santa.grounded && !jetpack) {
        ctx.fillStyle = 'rgba(0, 20, 50, 0.2)';
        ctx.beginPath();
        ctx.ellipse(santa.x + santa.w / 2, groundY + 4, santa.ducking ? 16 : 24, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Particles
    for (let p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color || 'rgba(255,255,255,0.85)';
      ctx.fill();
    }

    // Power status text
    if (state === 'playing') {
      if (jetpack && jetpackTimer > 0) {
        ctx.font = 'bold 17px system-ui';
        ctx.fillStyle = '#ff8800';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText('🚀 JETPACK  ' + Math.ceil(jetpackTimer / 60) + 's', W / 2, 46);
        ctx.shadowBlur = 0;
      } else if (invincible && invincibleTimer > 0) {
        ctx.font = 'bold 17px system-ui';
        ctx.fillStyle = '#60c0ff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText('INVINCIBLE  ' + Math.ceil(invincibleTimer / 60) + 's', W / 2, 46);
        ctx.shadowBlur = 0;
      }
    }

    if (state === 'gameover' && lootTimer > 30) {
      ctx.font = 'bold 20px system-ui';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText('Kids are looting Santa!', W / 2, H * 0.28);
      ctx.shadowBlur = 0;
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    showStart();
    hiscoreEl.textContent = highScore;
    bestDisplay.textContent = highScore;

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (state === 'playing') pauseGame();
        else if (state === 'paused') resumeGame();
        return;
      }
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        jump();
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        keys.down = true;
        setDuck(true);
      }
    });
    window.addEventListener('keyup', e => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        keys.down = false;
        setDuck(false);
      }
    });

    // Touch on canvas
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (state !== 'playing') { jump(); return; }
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y < rect.height * 0.55) jump();
      else { keys.down = true; setDuck(true); }
    });
    canvas.addEventListener('pointerup', () => { keys.down = false; setDuck(false); });
    canvas.addEventListener('pointercancel', () => { keys.down = false; setDuck(false); });

    // Buttons
    if (btnUp) {
      const h = e => { e.preventDefault(); e.stopPropagation(); jump(); };
      btnUp.addEventListener('pointerdown', h);
      btnUp.addEventListener('click', h);
    }
    if (btnDown) {
      btnDown.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        keys.down = true; setDuck(true);
      });
      const rel = () => { keys.down = false; setDuck(false); };
      btnDown.addEventListener('pointerup', rel);
      btnDown.addEventListener('pointerleave', rel);
      btnDown.addEventListener('pointercancel', rel);
    }

    startBtn.addEventListener('click', e => { e.stopPropagation(); startGame(); });
    pauseBtn.addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
    resumeBtn.addEventListener('click', e => { e.stopPropagation(); resumeGame(); });
    quitBtn.addEventListener('click', e => { e.stopPropagation(); quitToMenu(); });

    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    loop();
  }

  setTimeout(() => {
    if (assetsLoaded < totalAssets) {
      assetsLoaded = totalAssets;
      init();
    }
  }, 4500);
})();
