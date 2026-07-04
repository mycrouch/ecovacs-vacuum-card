class EcovacsVacuumCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity (a vacuum.* entity id)');
    }
    this._config = config;
    this._selectedRooms = [];
    this._showAreas = false;
    this._showFan = false;
    this._built = false;
    this._errorShown = false;
    this._animClass = '';
    this._lastChanged = null;
  }

  // The DOM is built exactly ONCE, then patched in place on every update.
  // Rebuilding innerHTML (even occasionally) recreates the robot SVG element,
  // which silently restarts its CSS animation from frame 0 — the source of the
  // jitter/snapping. The reference vacuum-card avoids this because Lit diffs
  // the DOM and never recreates the animated node; this card now does the same
  // manually.
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const stateObj = hass.states[this._config.entity];
    if (!stateObj) {
      if (!this._errorShown) {
        this.innerHTML = `<ha-card><div style="padding:16px;">Entity not found: ${this._config.entity}</div></ha-card>`;
        this._errorShown = true;
        this._built = false;
      }
      return;
    }
    this._errorShown = false;
    if (!this._built) {
      this._buildDom();
      this._built = true;
    }
    this._updateDynamic();
  }

  connectedCallback() {
    // Keep the "x minutes ago" text fresh without touching anything else.
    this._timeTimer = setInterval(() => this._updateTimeText(), 30000);
  }

  disconnectedCallback() {
    if (this._timeTimer) {
      clearInterval(this._timeTimer);
      this._timeTimer = null;
    }
  }

  getCardSize() {
    return 6;
  }

  static get ROOM_LABELS() {
    return {
      hall: 'Hallway',
      entry: 'Entry',
      entry_hall: 'Entry Hall',
      kitchen: 'Kitchen',
      lounge: 'Lounge Room',
      dining: 'Dining Room',
      bedroom: 'Bedroom',
      powder_room: 'Powder Room',
      mpr: 'Multi Purpose Room',
    };
  }

  static get ROOM_ICONS() {
    return {
      hall: 'mdi:floor-plan',
      entry: 'mdi:door',
      entry_hall: 'mdi:door-open',
      kitchen: 'mdi:coffee',
      lounge: 'mdi:sofa',
      dining: 'mdi:silverware-fork-knife',
      bedroom: 'mdi:bed-empty',
      powder_room: 'mdi:toilet',
      mpr: 'mdi:view-grid',
    };
  }

  static get STATE_LABELS() {
    return {
      cleaning: 'Cleaning',
      docked: 'Docked',
      idle: 'Idle',
      paused: 'Paused',
      returning: 'Returning to dock',
      error: 'Error',
    };
  }

  // Robot-vacuum illustration, reused (with attribution) from the MIT-licensed
  // "vacuum-card" by Denys Dovhan: https://github.com/denysdovhan/vacuum-card
  static get ROBOT_SVG() {
    return `<svg viewBox='0 0 490 490' preserveAspectRatio='xMidYMid meet' fill='none' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;display:block;'><path d='M490 245c0 135.31-109.69 245-245 245S0 380.31 0 245c0-3.013.0543891-6.013.162239-9H5l5 3v-12l-8.84919-5.899C13.1643 97.0064 117.754 0 245 0c127.089 0 231.578 96.7672 243.804 220.641L480 227v12.5l5-4h4.819c.12 3.152.181 6.319.181 9.5Z' fill='white'/><path d='M411.749 119c-6.307-8.348-13.27-16.258-20.851-23.6492C351.81 57.243 299.364 35.941 244.774 36.0001c-54.59.0591-106.99 21.4746-145.9954 59.667C59.7735 133.86 37.2596 185.797 36.0512 240.374l2.0895.046c.918-41.46 14.2556-81.382 37.8593-114.798V126h116v-2H77.1576c.7253-1.006 1.46-2.006 2.204-3H192v-2H80.8779c5.8988-7.683 12.3626-14.985 19.3631-21.8395 38.615-37.8105 90.491-59.0119 144.535-59.0704 54.044-.0585 105.966 21.0305 144.663 58.7572 7.123 6.9447 13.694 14.3517 19.683 22.1527H299v2h111.638c.744.994 1.479 1.994 2.204 3H299v2h115.266c23.35 33.213 36.583 72.821 37.583 113.972l2.089-.051c-1.066-43.848-15.882-85.962-41.938-120.589V119h-.251Z' fill='#AAA'/><path fill-rule='evenodd' clip-rule='evenodd' d='M300 122.5c0 30.1-24.624 54.5-55 54.5s-55-24.4-55-54.5c0-30.0995 24.624-54.5 55-54.5s55 24.4005 55 54.5Zm-4 0c0 27.856-22.799 50.5-51 50.5s-51-22.644-51-50.5S216.799 72 245 72s51 22.644 51 50.5Z' fill='#666'/><path fill-rule='evenodd' clip-rule='evenodd' d='M1.12741 221.523C6.9567 160.97 35.1055 104.75 80.0964 63.8045 125.087 22.8589 183.702.115675 244.536.00044016 305.369-.114809 364.07 22.4061 409.216 63.1811c44.985 40.6299 73.305 96.4879 79.5 156.7719l.011.001c-.002.013-.004.025-.007.038.021.202.042.405.062.607l-.279.028c-.145.286-.312.483-.382.565l-.003.005c-.185.218-.402.426-.611.612-.425.377-.994.817-1.651 1.294-1.325.963-3.171 2.194-5.341 3.588-.17.109-.341.219-.515.33v12.215l.249-.174c1.54-1.073 2.823-1.981 3.736-2.644.39-.283.703-.515.936-.693l-.007-.183.254-.01c.048-.038.083-.067.106-.087l.008-.007-.01.01c-.01.009-.033.032-.063.066l-.015.017 4.616-.182c1.298 32.938-4.063 65.799-15.764 96.616-11.7 30.816-29.499 58.955-52.331 82.731-22.832 23.776-50.226 42.7-80.544 55.64-30.317 12.939-62.934 19.627-95.898 19.664-32.963.037-65.594-6.579-95.941-19.45-30.346-12.872-57.783-31.735-80.6677-55.46-22.8846-23.725-40.7463-51.824-52.5157-82.614-11.76935-30.791-17.20429-63.64-15.979377-96.58l3.830807.142V236c.18555 0 .35898.025.50489.057l.56091.021-.00581.158c.13048.053.26118.112.38589.171.35305.167.78483.397 1.26649.667.87404.489 1.99915 1.158 3.2876 1.949v-12.13l-.4815-.302c-2.17716-1.367-4.02092-2.536-5.35246-3.398-.66426-.431-1.21155-.792-1.61262-1.066-.19905-.136-.37589-.261-.51834-.366l-.01222-.009c-.04061-.03-.11781-.087-.20795-.163l-.6875-.066ZM464.644 236.475c3.564-2.147 7.127-4.312 10.356-6.313v12.528c-1.909 1.31-3.945 2.699-5.987 4.086-4.093 2.779-8.206 5.546-11.376 7.648-1.586 1.052-2.93 1.933-3.915 2.566-.474.304-.857.546-1.14.719l-.19-.011-.007.131c-.063.037-.107.062-.135.079-.03.017-.042.025-.042.025l.024-.009c.01-.004.023-.01.039-.016l.095.241c-3.217 52.86-26.453 102.516-64.989 138.858-38.646 36.444-89.759 56.743-142.878 56.743-53.12 0-104.232-20.3-142.878-56.745-38.6453-36.445-61.9029-86.281-65.0136-139.31l-.2108.013c-.0549-.17-.1194-.3-.1616-.378-.0859-.16-.1788-.29-.2489-.38-.1401-.181-.2992-.346-.4386-.482-.2858-.279-.6601-.598-1.0796-.936-.8488-.684-2.029-1.563-3.413-2.556-2.7761-1.991-6.4661-4.507-10.1873-6.974-1.9862-1.317-3.9866-2.622-5.8676-3.83v-12.157c3.2173 2.001 6.7542 4.19 10.2783 6.365 5.686 3.509 11.3427 6.985 15.5776 9.583 2.1175 1.299 3.8798 2.379 5.1126 3.134l1.0774.66c1.0989 51.017 21.909 99.675 58.1301 135.725 36.902 36.729 86.816 57.401 138.881 57.518 52.066.116 102.072-20.331 139.139-56.895 36.507-36.012 57.554-84.787 58.75-135.992.352-.224.817-.513 1.385-.861 1.325-.813 3.172-1.923 5.371-3.238 1.287-.77 2.693-1.609 4.183-2.498l.097-.058c3.574-2.133 7.624-4.55 11.662-6.983ZM6.22995 219.764l.11131.072c1.3071.847 3.13156 2.004 5.30424 3.368 4.343 2.727 10.0507 6.265 15.7336 9.772 5.6819 3.507 11.3354 6.98 15.5686 9.578 2.1165 1.298 3.8778 2.377 5.11 3.132l1.9049 1.166.9921-.007c.3546 51.024 20.8428 99.843 57.0073 135.837 36.165 35.995 85.08 56.253 136.104 56.367 51.025.115 100.03-19.924 136.356-55.756 36.325-35.832 57.032-84.559 57.615-135.58l.585.006-.071-.066c.19-.204.434-.374.522-.435l.012-.008c.144-.101.323-.22.524-.35.406-.262.96-.607 1.631-1.018 1.346-.826 3.21-1.946 5.409-3.261 1.321-.79 2.764-1.651 4.292-2.563 3.571-2.131 7.608-4.54 11.639-6.969 5.757-3.469 11.476-6.963 15.773-9.723 2.152-1.384 3.921-2.565 5.152-3.459.053-.038.104-.076.154-.113l.102-.075c-6.233-58.782-33.937-113.219-77.829-152.8616C361.689 26.858 304.162 4.78749 244.545 4.90042 184.928 5.01336 127.486 27.3017 83.3945 67.4284 39.856 107.052 12.4116 161.271 6.22995 219.764Zm2.09908 22.928c-1.35577-.837-2.51273-1.53-3.38991-2.026-.55505 30.74 4.79901 61.315 15.78648 90.06 11.534 30.175 29.0385 57.712 51.4654 80.963 22.427 23.25 49.315 41.736 79.055 54.35 29.739 12.614 61.718 19.097 94.022 19.061 32.304-.036 64.269-6.591 93.98-19.271 29.711-12.681 56.558-31.226 78.933-54.527 22.375-23.3 39.818-50.876 51.284-81.077 10.871-28.632 16.159-59.064 15.594-89.655-.734.522-1.584 1.119-2.522 1.773-3.095 2.159-7.176 4.958-11.277 7.742-4.101 2.785-8.227 5.56-11.412 7.673-1.284.851-2.419 1.597-3.34 2.194-3.637 53.361-27.268 103.418-66.216 140.147C350.858 437.287 298.702 458 244.498 458c-54.204 0-106.359-20.714-145.7927-57.903-39.1679-36.938-62.8452-87.356-66.2735-141.057-.1301-.112-.2876-.243-.4742-.394-.7611-.613-1.8697-1.441-3.2341-2.419-2.7209-1.952-6.3663-4.439-10.0659-6.891-3.6986-2.452-7.4329-4.857-10.32857-6.644Z' fill='#666'/><rect x='233' y='365' width='24' height='53' rx='12' stroke='#AAA' stroke-width='2'/></svg>`;
  }

  _friendlyRoom(key) {
    const labels = EcovacsVacuumCard.ROOM_LABELS;
    if (labels[key]) return labels[key];
    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _friendlyWord(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _roomIcon(key) {
    return EcovacsVacuumCard.ROOM_ICONS[key] || 'mdi:map-marker-radius';
  }

  _relTime(dateStr) {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.round(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }

  _batteryIcon(level) {
    if (level === null || level === undefined || isNaN(level)) return 'mdi:battery-unknown';
    if (level >= 100) return 'mdi:battery';
    if (level <= 5) return 'mdi:battery-outline';
    const rounded = Math.round(level / 10) * 10;
    return `mdi:battery-${rounded}`;
  }

  _callService(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  // ---------------------------------------------------------------------
  // One-time DOM construction. Nothing in here runs again after first build.
  // ---------------------------------------------------------------------
  _buildDom() {
    const entityId = this._config.entity;

    this.innerHTML = `
      <ha-card>
        <style>
          .acard { padding: 16px; }
          .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
          .state-text { font-size: 28px; font-weight: 400; color: var(--primary-text-color); }
          .battery-wrap { display: flex; align-items: center; gap: 4px; color: var(--secondary-text-color); font-size: 14px; margin-top: 6px; }
          .time-text { color: var(--secondary-text-color); font-size: 14px; margin-top: 2px; }
          .image-wrap { display: flex; justify-content: center; align-items: center; margin: 20px 0; }
          .robot-image { width: 220px; height: 220px; transform-origin: 50% 50%; }
          .robot-image.cleaning { animation: ecovacs-cleaning-motion 5s linear infinite; }
          .robot-image.returning { animation: ecovacs-returning-motion 2s linear infinite; }
          @keyframes ecovacs-cleaning-motion {
            0% { transform: rotate(0deg) translate(0px); }
            5% { transform: rotate(0deg) translate(0px, -10px); }
            10% { transform: rotate(0deg) translate(0px, 5px); }
            15% { transform: rotate(0deg) translate(0px); }
            20% { transform: rotate(30deg) translate(0px); }
            25% { transform: rotate(30deg) translate(0px, -10px); }
            30% { transform: rotate(30deg) translate(0px, 5px); }
            35% { transform: rotate(30deg) translate(0px); }
            40% { transform: rotate(0deg) translate(0px); }
            45% { transform: rotate(-30deg) translate(0px); }
            50% { transform: rotate(-30deg) translate(0px, -10px); }
            55% { transform: rotate(-30deg) translate(0px, 5px); }
            60% { transform: rotate(-30deg) translate(0px); }
            70% { transform: rotate(0deg) translate(0px); }
            100% { transform: rotate(0deg); }
          }
          @keyframes ecovacs-returning-motion {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(10deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-10deg); }
            100% { transform: rotate(0deg); }
          }
          .button-row { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; }
          .icon-btn { width: 56px; height: 44px; border-radius: 12px; border: none; background: var(--secondary-background-color, #f2f2f2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .icon-btn:hover { background: var(--divider-color, #e0e0e0); }
          .option-row { display: flex; gap: 12px; position: relative; }
          .option-btn { flex: 1; text-align: left; border: none; border-radius: 12px; background: var(--secondary-background-color, #f2f2f2); padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--primary-text-color); font-family: inherit; }
          .option-btn:hover { background: var(--divider-color, #e0e0e0); }
          .option-btn .sub { display: block; font-size: 14px; font-weight: 500; }
          .option-btn .label { display: block; font-size: 12px; color: var(--secondary-text-color); }
          .option-btn ha-icon { --mdc-icon-size: 20px; }
          .chevron { margin-left: auto; --mdc-icon-size: 18px; color: var(--secondary-text-color); }
          .dropdown-menu { position: absolute; top: 52px; left: 0; background: var(--card-background-color, #fff); box-shadow: 0 2px 8px rgba(0,0,0,0.25); border-radius: 8px; padding: 4px 0; z-index: 5; min-width: 140px; }
          .dropdown-item { padding: 10px 16px; cursor: pointer; font-size: 14px; }
          .dropdown-item:hover { background: var(--secondary-background-color, #f2f2f2); }
          .dropdown-item.selected { color: var(--primary-color); font-weight: 600; }
          .areas-panel { margin-top: 16px; border-top: 1px solid var(--divider-color, #e0e0e0); padding-top: 16px; }
          .areas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; }
          .area-tile { position: relative; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; padding: 12px 8px; text-align: center; cursor: pointer; }
          .area-tile ha-icon { --mdc-icon-size: 22px; color: var(--secondary-text-color); }
          .area-tile .area-label { font-size: 12px; margin-top: 6px; color: var(--primary-text-color); }
          .area-tile.selected { background: rgba(3, 169, 244, 0.15); border-color: var(--primary-color, #03a9f4); }
          .area-tile .badge { position: absolute; top: -6px; right: -6px; background: var(--primary-color, #03a9f4); color: #fff; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; display: flex; align-items: center; justify-content: center; }
          .areas-footer { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
          .hint { font-size: 12px; color: var(--secondary-text-color); }
          .areas-actions { display: flex; justify-content: flex-end; gap: 8px; }
          .text-btn { background: none; border: none; color: var(--secondary-text-color); font-weight: 500; padding: 8px 12px; cursor: pointer; }
          .start-btn { background: var(--primary-color, #03a9f4); color: #fff; border: none; border-radius: 20px; padding: 8px 16px; font-weight: 500; cursor: pointer; }
          .start-btn[disabled] { opacity: 0.4; cursor: default; }
        </style>
        <div class="acard">
          <div class="top-row">
            <div>
              <div class="state-text" data-ref="state"></div>
              <div class="time-text" data-ref="time"></div>
            </div>
            <div class="battery-wrap" data-ref="battery-wrap" style="display:none;">
              <span data-ref="battery-text"></span>
              <ha-icon data-ref="battery-icon" icon="mdi:battery-unknown"></ha-icon>
            </div>
          </div>
          <div class="image-wrap">
            <div class="robot-image" data-ref="robot">${EcovacsVacuumCard.ROBOT_SVG}</div>
          </div>
          <div class="button-row">
            <button class="icon-btn" data-ref="play-btn"><ha-icon data-ref="play-icon" icon="mdi:play"></ha-icon></button>
            <button class="icon-btn" data-ref="stop-btn"><ha-icon icon="mdi:stop"></ha-icon></button>
            <button class="icon-btn" data-ref="dock-btn"><ha-icon icon="mdi:home-import-outline"></ha-icon></button>
            <button class="icon-btn" data-ref="locate-btn"><ha-icon icon="mdi:map-marker"></ha-icon></button>
          </div>
          <div class="option-row">
            <button class="option-btn" data-ref="fan-btn">
              <ha-icon icon="mdi:fan"></ha-icon>
              <span><span class="label">Fan speed</span><span class="sub" data-ref="fan-sub">—</span></span>
            </button>
            <button class="option-btn" data-ref="area-btn">
              <ha-icon icon="mdi:checkerboard"></ha-icon>
              <span><span class="label">Cleaning</span><span class="sub">By area</span></span>
              <ha-icon class="chevron" icon="mdi:chevron-right"></ha-icon>
            </button>
            <div data-ref="fan-menu"></div>
          </div>
          <div data-ref="areas"></div>
        </div>
      </ha-card>
    `;

    // Cache element references.
    this._els = {};
    this.querySelectorAll('[data-ref]').forEach((el) => {
      this._els[el.getAttribute('data-ref')] = el;
    });

    // Wire static events once. Handlers read current state at click time.
    this._els['play-btn'].addEventListener('click', () => {
      this._callService('vacuum', this._isCleaning ? 'pause' : 'start', { entity_id: entityId });
    });
    this._els['stop-btn'].addEventListener('click', () => {
      this._callService('vacuum', 'stop', { entity_id: entityId });
    });
    this._els['dock-btn'].addEventListener('click', () => {
      this._callService('vacuum', 'return_to_base', { entity_id: entityId });
    });
    this._els['locate-btn'].addEventListener('click', () => {
      this._callService('vacuum', 'locate', { entity_id: entityId });
    });
    this._els['fan-btn'].addEventListener('click', (e) => {
      e.stopPropagation();
      this._showFan = !this._showFan;
      this._showAreas = false;
      this._renderFanMenu();
      this._renderAreasPanel();
    });
    this._els['area-btn'].addEventListener('click', () => {
      this._showAreas = !this._showAreas;
      this._showFan = false;
      this._renderFanMenu();
      this._renderAreasPanel();
    });
  }

  // ---------------------------------------------------------------------
  // In-place updates. The robot SVG element is NEVER touched here except to
  // toggle its animation class when the vacuum's motion state changes.
  // ---------------------------------------------------------------------
  _updateDynamic() {
    const stateObj = this._hass.states[this._config.entity];
    const state = stateObj.state;
    this._isCleaning = state === 'cleaning';
    this._stateObj = stateObj;

    // State label
    const stateLabel =
      EcovacsVacuumCard.STATE_LABELS[state] || state.charAt(0).toUpperCase() + state.slice(1);
    this._setText(this._els['state'], stateLabel);

    // Relative time
    this._lastChanged = stateObj.last_changed;
    this._updateTimeText();

    // Battery
    const batteryEntity = this._config.battery_entity;
    const batteryObj = batteryEntity ? this._hass.states[batteryEntity] : undefined;
    const batteryLevel = batteryObj ? parseFloat(batteryObj.state) : null;
    if (batteryLevel !== null && !isNaN(batteryLevel)) {
      this._els['battery-wrap'].style.display = 'flex';
      this._setText(this._els['battery-text'], `${Math.round(batteryLevel)}%`);
      this._setIcon(this._els['battery-icon'], this._batteryIcon(batteryLevel));
    } else {
      this._els['battery-wrap'].style.display = 'none';
    }

    // Play/pause icon
    this._setIcon(this._els['play-icon'], this._isCleaning ? 'mdi:pause' : 'mdi:play');

    // Fan speed label
    const fanSpeed = stateObj.attributes && stateObj.attributes.fan_speed;
    this._setText(this._els['fan-sub'], fanSpeed ? this._friendlyWord(fanSpeed) : '—');

    // Animation class — only touch classList when the motion state actually
    // changes, so a running animation is never interrupted.
    const desired = state === 'cleaning' ? 'cleaning' : state === 'returning' ? 'returning' : '';
    if (desired !== this._animClass) {
      const robot = this._els['robot'];
      if (this._animClass) robot.classList.remove(this._animClass);
      if (desired) robot.classList.add(desired);
      this._animClass = desired;
    }

    // If the fan menu is open, keep its selected item in sync.
    if (this._showFan) this._renderFanMenu();
  }

  _setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  _setIcon(el, icon) {
    if (el.getAttribute('icon') !== icon) el.setAttribute('icon', icon);
  }

  _updateTimeText() {
    if (!this._els || !this._lastChanged) return;
    this._setText(this._els['time'], this._relTime(this._lastChanged));
  }

  // ---------------------------------------------------------------------
  // Subsection renders — these rebuild ONLY their own container, never the
  // animated image or the rest of the card.
  // ---------------------------------------------------------------------
  _renderFanMenu() {
    const container = this._els['fan-menu'];
    if (!this._showFan) {
      if (container.innerHTML !== '') container.innerHTML = '';
      return;
    }
    const attrs = (this._stateObj && this._stateObj.attributes) || {};
    const fanSpeed = attrs.fan_speed;
    const fanSpeedList = attrs.fan_speed_list || [];
    container.innerHTML = `<div class="dropdown-menu">
      ${fanSpeedList
        .map(
          (f) =>
            `<div class="dropdown-item ${f === fanSpeed ? 'selected' : ''}" data-fan="${f}">${this._friendlyWord(f)}</div>`
        )
        .join('')}
    </div>`;
    container.querySelectorAll('.dropdown-item').forEach((el) => {
      el.addEventListener('click', () => {
        const fan = el.getAttribute('data-fan');
        this._callService('vacuum', 'set_fan_speed', {
          entity_id: this._config.entity,
          fan_speed: fan,
        });
        this._showFan = false;
        this._renderFanMenu();
      });
    });
  }

  _renderAreasPanel() {
    const container = this._els['areas'];
    if (!this._showAreas) {
      if (container.innerHTML !== '') container.innerHTML = '';
      return;
    }
    const attrs = (this._stateObj && this._stateObj.attributes) || {};
    const rooms = attrs.rooms || {};
    const roomKeys = Object.keys(rooms);

    container.innerHTML = `<div class="areas-panel">
      <div class="areas-grid">
        ${roomKeys
          .map((key) => {
            const roomId = rooms[key];
            const selIdx = this._selectedRooms.indexOf(roomId);
            const selected = selIdx !== -1;
            return `<div class="area-tile ${selected ? 'selected' : ''}" data-room="${roomId}">
                ${selected ? `<div class="badge">${selIdx + 1}</div>` : ''}
                <ha-icon icon="${this._roomIcon(key)}"></ha-icon>
                <div class="area-label">${this._friendlyRoom(key)}</div>
              </div>`;
          })
          .join('')}
      </div>
      <div class="areas-footer">
        <span class="hint">Tap rooms to select, then start cleaning.</span>
        <div class="areas-actions">
          <button class="text-btn" data-ref="cancel-areas">Cancel</button>
          <button class="start-btn" data-ref="start-areas" ${this._selectedRooms.length === 0 ? 'disabled' : ''}>
            Start cleaning${this._selectedRooms.length ? ` (${this._selectedRooms.length})` : ''}
          </button>
        </div>
      </div>
    </div>`;

    container.querySelectorAll('.area-tile').forEach((el) => {
      el.addEventListener('click', () => {
        const roomId = parseInt(el.getAttribute('data-room'), 10);
        const idx = this._selectedRooms.indexOf(roomId);
        if (idx === -1) {
          this._selectedRooms.push(roomId);
        } else {
          this._selectedRooms.splice(idx, 1);
        }
        this._renderAreasPanel();
      });
    });
    const cancelBtn = container.querySelector('[data-ref="cancel-areas"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._selectedRooms = [];
        this._showAreas = false;
        this._renderAreasPanel();
      });
    }
    const startBtn = container.querySelector('[data-ref="start-areas"]');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this._selectedRooms.length === 0) return;
        this._callService('vacuum', 'send_command', {
          entity_id: this._config.entity,
          command: 'spot_area',
          params: {
            rooms: [...this._selectedRooms],
            cleanings: 1,
          },
        });
        this._selectedRooms = [];
        this._showAreas = false;
        this._renderAreasPanel();
      });
    }
  }
}

customElements.define('ecovacs-vacuum-card', EcovacsVacuumCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ecovacs-vacuum-card',
  name: 'Ecovacs Vacuum Card',
  description: 'Always-expanded vacuum card replicating the native more-info dialog, including area-based cleaning. Built for the Ecovacs integration but works with any vacuum entity that exposes a "rooms" attribute.',
});
