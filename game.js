// backend/routes/game.js (Front‑end version)
// (If you already use CommonJS for your backend, you may need to set this up so that it runs in the browser—for example, by using a bundler or by moving this file to your static files folder.)

class SnakeGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.gridSize = 25;
    this.setupCanvas();
    this.resetGameState();

    // Define color stops for the "moon" (food)
    this.moonColors = [
      { color: "#FFFFFF", glow: "rgba(255, 255, 255, 0.5)" },
      { color: "#FFFF99", glow: "rgba(255, 255, 153, 0.5)" },
      { color: "#FFCC66", glow: "rgba(255, 204, 102, 0.5)" },
      { color: "#FF9933", glow: "rgba(255, 153, 51, 0.5)" },
      { color: "#FF6600", glow: "rgba(255, 102, 0, 0.5)" },
      { color: "#CC3300", glow: "rgba(204, 51, 0, 0.5)" },
      { color: "#990099", glow: "rgba(153, 0, 153, 0.5)" },
      { color: "#330066", glow: "rgba(51, 0, 102, 0.5)" },
      { color: "#000000", glow: "rgba(0, 0, 0, 0.5)" }
    ];
    this.currentMoonColorIndex = 0;
    this.moonsCollected = 0;
    this.moonsPerColorChange = 5;

    this.score = 0;
    this.timeLeft = 60;
    this.baseSpeed = 10;
    this.currentSpeed = this.baseSpeed;
    this.trails = [];
    this.maxTrailLength = 50;
    this.touchStart = null;
    this.bindControls();

    this.startGame();
  }

  setupCanvas() {
    // Fill the entire viewport and disable scrolling
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.style.overflow = "hidden";
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.cellSize = Math.min(this.canvas.width, this.canvas.height) / this.gridSize;
    });
    this.cellSize = Math.min(this.canvas.width, this.canvas.height) / this.gridSize;
  }

  resetGameState() {
    // Start the snake in the middle of the grid
    const mid = Math.floor(this.gridSize / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.moon = this.getRandomPosition();
    this.score = 0;
    this.timeLeft = 60;
    this.currentSpeed = this.baseSpeed;
    this.gameOver = false;
    this.trails = [];
    document.getElementById("score-shield").textContent = `Score: ${this.score}`;
    document.getElementById("timer").textContent = this.timeLeft;
    document.getElementById("menu").style.display = "none";
  }

  bindControls() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      const keyMap = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        if (keyMap[e.key].x !== -this.direction.x || keyMap[e.key].y !== -this.direction.y) {
          this.nextDirection = keyMap[e.key];
        }
      }
    });
    // Swipe controls for mobile
    document.addEventListener("touchstart", (e) => {
      this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    document.addEventListener("touchend", (e) => {
      if (!this.touchStart) return;
      const dx = e.changedTouches[0].clientX - this.touchStart.x;
      const dy = e.changedTouches[0].clientY - this.touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30 && this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
        else if (dx < -30 && this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
      } else {
        if (dy > 30 && this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
        else if (dy < -30 && this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
      }
      this.touchStart = null;
    });
  }

  getRandomPosition() {
    const cols = Math.floor(this.canvas.width / this.cellSize);
    const rows = Math.floor(this.canvas.height / this.cellSize);
    return {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
  }

  updateGame() {
    // Update direction
    this.direction = this.nextDirection;
    const cols = Math.floor(this.canvas.width / this.cellSize);
    const rows = Math.floor(this.canvas.height / this.cellSize);
    const newHead = {
      x: (this.snake[0].x + this.direction.x + cols) % cols,
      y: (this.snake[0].y + this.direction.y + rows) % rows,
    };

    // Add the new head
    this.snake.unshift(newHead);

    // Check if the snake eats the moon
    if (newHead.x === this.moon.x && newHead.y === this.moon.y) {
      this.score += 10;
      this.moonsCollected++;
      if (this.moonsCollected >= this.moonsPerColorChange) {
        this.moonsCollected = 0;
        this.currentMoonColorIndex = (this.currentMoonColorIndex + 1) % this.moonColors.length;
      }
      this.moon = this.getRandomPosition();
      document.getElementById("score-shield").textContent = `Score: ${this.score}`;
    } else {
      // Remove the tail
      this.snake.pop();
    }

    // Add a simple trail effect
    this.trails.push({ x: newHead.x, y: newHead.y, opacity: 1 });
    if (this.trails.length > this.maxTrailLength) {
      this.trails.shift();
    }

    // Self-collision: if the snake intersects itself, end the game
    for (let i = 1; i < this.snake.length; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.endGame();
        break;
      }
    }
  }

  drawGame() {
    // Clear the canvas with a semitransparent fill for an “ice‐field” trailing effect
    this.ctx.fillStyle = "rgba(17, 17, 17, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake
    this.snake.forEach((segment, i) => {
      this.ctx.fillStyle = i === 0 ? "#9CFF9C" : "#8BC34A";
      this.ctx.beginPath();
      this.ctx.arc(
        segment.x * this.cellSize + this.cellSize / 2,
        segment.y * this.cellSize + this.cellSize / 2,
        this.cellSize * 0.4,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });

    // Draw fading trails
    this.trails.forEach(trail => {
      this.ctx.fillStyle = `rgba(255,255,255,${trail.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(
        trail.x * this.cellSize + this.cellSize / 2,
        trail.y * this.cellSize + this.cellSize / 2,
        this.cellSize * 0.2,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      trail.opacity *= 0.96;
    });

    // Draw the moon (food) with a gradient based on the current moon color
    const moon = this.moon;
    const currentColor = this.moonColors[this.currentMoonColorIndex];
    const moonX = moon.x * this.cellSize + this.cellSize / 2;
    const moonY = moon.y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.45;
    const gradient = this.ctx.createRadialGradient(
      moonX - radius * 0.3,
      moonY - radius * 0.3,
      radius * 0.2,
      moonX,
      moonY,
      radius
    );
    gradient.addColorStop(0, currentColor.glow);
    gradient.addColorStop(0.7, currentColor.color);
    gradient.addColorStop(1, "#000");
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  updateTimer() {
    this.timeLeft--;
    const timerEl = document.getElementById("timer");
    timerEl.textContent = this.timeLeft;
    if (this.timeLeft <= 10) {
      timerEl.classList.add("timer-warning");
    } else {
      timerEl.classList.remove("timer-warning");
    }
    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  gameLoop() {
    if (this.gameOver) return;
    this.updateGame();
    this.drawGame();
  }

  startGame() {
    this.resetGameState();
    // Start the game loop at the current speed (ms per frame)
    this.intervalID = setInterval(() => this.gameLoop(), 1000 / this.currentSpeed);
    // Start the countdown timer
    this.timerID = setInterval(() => this.updateTimer(), 1000);
  }

  endGame() {
    clearInterval(this.intervalID);
    clearInterval(this.timerID);
    this.gameOver = true;
    // Show end-of-game menu and update final score and leaderboard
    document.getElementById("menu").style.display = "block";
    document.getElementById("final-score").textContent = this.score;
    // (Optional: send score to the server via fetch to store it and then retrieve leaderboard data.)
    // For now, we update a local leaderboard from localStorage:
    let highScores = JSON.parse(localStorage.getItem("snakeHighScores") || "[]");
    highScores.push(this.score);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, 10);
    localStorage.setItem("snakeHighScores", JSON.stringify(highScores));
    const scoresList = document.getElementById("scores-list");
    scoresList.innerHTML = "";
    highScores.forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      if (s === this.score) {
        li.style.color = "#4CAF50";
        li.style.fontWeight = "bold";
      }
      scoresList.appendChild(li);
    });
  }
}

// Buttons in the menu
document.getElementById("play-again").addEventListener("click", () => {
  // Restart the game
  new SnakeGame();
});
document.getElementById("exit-menu").addEventListener("click", () => {
  // For example, you might simply reload the page or navigate to your Telegram bot main menu
  window.location.reload();
});

// Start the game when the page loads
window.addEventListener("load", () => {
  new SnakeGame();
});
