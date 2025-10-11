function KeyboardInputManager() {
  this.events = {};
  this.setupMode = false;
  this.selectedValue = 2;

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // Vim up
    76: 1, // Vim right
    74: 2, // Vim down
    72: 3, // Vim left
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  };

  // Respond to direction keys
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      }
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      self.restart.call(self, event);
    }
  });

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  this.bindButtonPress(".setup-button", this.toggleSetup);
  this.bindButtonPress(".start-game-button", this.startGame);
  this.bindButtonPress(".clear-board-button", this.clearBoard);

  // Bind tile value selector buttons
  this.bindTileValueButtons();

  // Bind grid cell clicks for setup mode
  this.bindGridCellClicks();

  // Respond to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener(this.eventTouchstart, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1) {
      return; // Ignore if touching with more than 1 finger
    }

    if (window.navigator.msPointerEnabled) {
      touchStartClientX = event.pageX;
      touchStartClientY = event.pageY;
    } else {
      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchend, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches.length > 0) {
      return; // Ignore if still touching with one or more fingers
    }

    var touchEndClientX, touchEndClientY;

    if (window.navigator.msPointerEnabled) {
      touchEndClientX = event.pageX;
      touchEndClientY = event.pageY;
    } else {
      touchEndClientX = event.changedTouches[0].clientX;
      touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};

KeyboardInputManager.prototype.toggleSetup = function (event) {
  event.preventDefault();
  this.setupMode = !this.setupMode;

  if (this.setupMode) {
    this.emit("enterSetup");
    document.querySelector(".setup-controls").style.display = "block";
    document.querySelector(".setup-button").textContent = "Exit Setup";
  } else {
    this.emit("exitSetup");
    document.querySelector(".setup-controls").style.display = "none";
    document.querySelector(".setup-button").textContent = "Setup Mode";
  }
};

KeyboardInputManager.prototype.startGame = function (event) {
  event.preventDefault();
  this.setupMode = false;
  this.emit("exitSetup");
  document.querySelector(".setup-controls").style.display = "none";
  document.querySelector(".setup-button").textContent = "Setup Mode";
};

KeyboardInputManager.prototype.clearBoard = function (event) {
  event.preventDefault();
  this.emit("clearBoard");
};

KeyboardInputManager.prototype.bindTileValueButtons = function () {
  var self = this;
  var buttons = document.querySelectorAll(".tile-value-button");

  buttons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      var value = parseInt(this.getAttribute("data-value"));
      self.selectedValue = value;

      // Update visual selection
      buttons.forEach(function (btn) {
        btn.classList.remove("selected");
      });
      this.classList.add("selected");
    });
  });

  // Select first button by default
  if (buttons.length > 0) {
    buttons[0].classList.add("selected");
  }
};

KeyboardInputManager.prototype.bindGridCellClicks = function () {
  var self = this;
  var gridContainer = document.querySelector(".grid-container");

  gridContainer.addEventListener("click", function (event) {
    if (!self.setupMode) return;

    // Find which cell was clicked
    var rect = gridContainer.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var cellSize = rect.width / 4;
    var col = Math.floor(x / cellSize);
    var row = Math.floor(y / cellSize);

    if (col >= 0 && col < 4 && row >= 0 && row < 4) {
      self.emit("setTile", {
        position: { x: col, y: row },
        value: self.selectedValue
      });
    }
  });
};
