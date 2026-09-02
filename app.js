(() => {
  "use strict";

  const ASSET_ROOT = "./design";
  const DEFAULT_ORDER = [
    { id: "brain", label: "뇌", icon: `${ASSET_ROOT}/icon_images/icon_06_뇌.png`, resultImage: `${ASSET_ROOT}/result_images/06_뇌.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/06_뇌.mp4` },
    { id: "vr", label: "VR", icon: `${ASSET_ROOT}/icon_images/icon_03_VR.png`, resultImage: `${ASSET_ROOT}/result_images/03_VR.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/03_VR.mp4` },
    { id: "art", label: "예술", icon: `${ASSET_ROOT}/icon_images/icon_05_예술.png`, resultImage: `${ASSET_ROOT}/result_images/05_예술.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/05_예술.mp4` },
    { id: "code", label: "코딩", icon: `${ASSET_ROOT}/icon_images/icon_04_코딩.png`, resultImage: `${ASSET_ROOT}/result_images/04_코딩.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/04_코딩.mp4` },
    { id: "think", label: "생각", icon: `${ASSET_ROOT}/icon_images/icon_01_생각.png`, resultImage: `${ASSET_ROOT}/result_images/01_생각.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/01_생각.mp4` },
    { id: "book", label: "책", icon: `${ASSET_ROOT}/icon_images/icon_02_책.png`, resultImage: `${ASSET_ROOT}/result_images/02_책.jpg`, resultVideo: `${ASSET_ROOT}/result_movies/02_책.mp4` },
  ];
  const SLOT_ANGLES = [-120, -60, 0, 60, 120, 180];
  const SLOT_POSITIONS = [
    { left: "35%", top: "27%" },
    { left: "63.5%", top: "26.6%" },
    { left: "77%", top: "50%" },
    { left: "65%", top: "76%" },
    { left: "36.5%", top: "73.4%" },
    { left: "23%", top: "50%" },
  ];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const rotor = document.querySelector("#wheel-rotor");
  const pointer = document.querySelector("#wheel-pointer");
  const wheelStage = document.querySelector("#wheel-stage");
  const itemElements = [...document.querySelectorAll(".roulette-wheel__item[data-item-id]")];
  const startButton = document.querySelector("#start-button");
  const startLabel = startButton.querySelector(".start-button__label");
  const shuffleButton = document.querySelector("#shuffle-button");
  const resetButton = document.querySelector("#reset-button");
  const soundToggle = document.querySelector("#sound-toggle");
  const status = document.querySelector("#game-status");
  const resultScreen = document.querySelector("#result-screen");
  const resultDialog = resultScreen.querySelector(".result-dialog");
  const resultImage = document.querySelector("#result-image");
  const resultVideo = document.querySelector("#result-video");
  const resultDescription = document.querySelector("#result-description");
  const resultClose = document.querySelector("#result-close");
  const celebrationLayer = document.querySelector("#celebration-layer");

  let order = DEFAULT_ORDER.map((item) => ({ ...item }));
  let rotation = 0;
  let interactionLocked = false;
  let previousFocus = null;
  let pointerAnimation = null;
  let resultPlaybackToken = 0;

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
  const randomBetween = (min, max) => min + Math.random() * (max - min);

  class SoundEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.enabled = true;
      this.spinSource = null;
      this.spinGain = null;
      this.spinFilter = null;
      this.spinBodySource = null;
      this.spinBodyGain = null;
      this.spinBodyFilter = null;
      this.spinEnvelope = null;
    }

    async ensure() {
      if (!this.enabled) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.context) {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = 0.34;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context;
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (!this.master || !this.context) return;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled ? 0.34 : 0.0001, now, 0.025);
      if (!enabled) this.stopSpin();
    }

    tone(frequency, delay = 0, duration = 0.12, volume = 0.12, type = "sine", endFrequency = null) {
      if (!this.enabled || !this.context || !this.master) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + Math.min(0.018, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    }

    noiseSweep(duration = 0.5, volume = 0.06, startFrequency = 1400, endFrequency = 520) {
      if (!this.enabled || !this.context || !this.master) return;
      const length = Math.ceil(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.Q.value = 0.72;
      filter.frequency.setValueAtTime(startFrequency, now);
      filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + duration * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(gain).connect(this.master);
      source.start(now);
      source.stop(now + duration + 0.02);
    }

    startCue() {
      this.tone(220, 0, 0.1, 0.11, "triangle", 330);
      this.tone(330, 0.07, 0.13, 0.1, "triangle", 520);
      this.tone(520, 0.14, 0.16, 0.08, "sine", 680);
    }

    tick(intensity = 0.7) {
      const frequency = 720 + intensity * 520;
      this.tone(frequency, 0, 0.035 + (1 - intensity) * 0.025, 0.035 + intensity * 0.035, "square", frequency * 0.72);
    }

    shuffleCue() {
      this.noiseSweep(0.48, 0.045, 1250, 620);
      [360, 430, 510, 610, 720, 860].forEach((frequency, index) => {
        this.tone(frequency, index * 0.045, 0.075, 0.055, "triangle", frequency * 1.16);
      });
      this.tone(660, 0.36, 0.2, 0.085, "triangle", 840);
      this.tone(990, 0.4, 0.22, 0.065, "sine", 1180);
    }

    resetCue() {
      this.tone(520, 0, 0.12, 0.075, "sine", 330);
      this.tone(330, 0.08, 0.15, 0.065, "triangle", 220);
    }

    celebrate() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.tone(frequency, index * 0.08, 0.34, 0.12 - index * 0.012, "triangle", frequency * 1.012);
      });
      [1318.5, 1568, 2093].forEach((frequency, index) => {
        this.tone(frequency, 0.18 + index * 0.075, 0.15, 0.045, "sine", frequency * 1.06);
      });
    }

    startSpin() {
      if (!this.enabled || !this.context || !this.master || this.spinSource) return;
      const bufferLength = this.context.sampleRate * 1.5;
      const buffer = this.context.createBuffer(1, bufferLength, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < bufferLength; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * 0.985 + white * 0.015;
        data[index] = (white * 0.72 + previous * 1.4) * 0.65;
      }
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      const bodySource = this.context.createBufferSource();
      const bodyFilter = this.context.createBiquadFilter();
      const bodyGain = this.context.createGain();
      const envelope = this.context.createGain();
      const now = this.context.currentTime;
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = 1.9;
      filter.type = "bandpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.45;
      gain.gain.setValueAtTime(0.21, now);

      bodySource.buffer = buffer;
      bodySource.loop = true;
      bodySource.playbackRate.value = 0.9;
      bodyFilter.type = "lowpass";
      bodyFilter.frequency.value = 700;
      bodyFilter.Q.value = 0.7;
      bodyGain.gain.setValueAtTime(0.085, now);

      const attackCurve = new Float32Array(48);
      for (let index = 0; index < attackCurve.length; index += 1) {
        const progress = index / (attackCurve.length - 1);
        const smoothProgress = progress * progress * (3 - 2 * progress);
        attackCurve[index] = Math.max(0.0001, Math.pow(smoothProgress, 1.35));
      }
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.setValueCurveAtTime(attackCurve, now, 1.05);

      source.connect(filter).connect(gain).connect(envelope);
      bodySource.connect(bodyFilter).connect(bodyGain).connect(envelope);
      envelope.connect(this.master);
      source.start(now);
      bodySource.start(now);
      this.spinSource = source;
      this.spinGain = gain;
      this.spinFilter = filter;
      this.spinBodySource = bodySource;
      this.spinBodyGain = bodyGain;
      this.spinBodyFilter = bodyFilter;
      this.spinEnvelope = envelope;
    }

    updateSpin(intensity) {
      if (!this.spinSource || !this.spinGain || !this.spinFilter || !this.context) return;
      const now = this.context.currentTime;
      const inputStrength = Math.max(0, Math.min(1, intensity));
      const strength = Math.pow(inputStrength, 1.35);
      this.spinFilter.frequency.setTargetAtTime(420 + strength * 2080, now, 0.09);
      this.spinGain.gain.setTargetAtTime(0.012 + strength * 0.198, now, 0.11);
      this.spinSource.playbackRate.setTargetAtTime(0.65 + strength * 1.25, now, 0.11);

      if (this.spinBodySource && this.spinBodyGain && this.spinBodyFilter) {
        this.spinBodyFilter.frequency.setTargetAtTime(150 + strength * 550, now, 0.12);
        this.spinBodyGain.gain.setTargetAtTime(0.008 + strength * 0.077, now, 0.14);
        this.spinBodySource.playbackRate.setTargetAtTime(0.48 + strength * 0.42, now, 0.14);
      }
    }

    stopSpin() {
      if (!this.spinSource || !this.spinGain || !this.context) return;
      const source = this.spinSource;
      const bodySource = this.spinBodySource;
      const envelope = this.spinEnvelope;
      const now = this.context.currentTime;
      if (envelope) {
        if (typeof envelope.gain.cancelAndHoldAtTime === "function") {
          envelope.gain.cancelAndHoldAtTime(now);
        } else {
          const currentLevel = Math.max(envelope.gain.value, 0.0002);
          envelope.gain.cancelScheduledValues(now);
          envelope.gain.setValueAtTime(currentLevel, now);
        }
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
      }
      source.stop(now + 0.56);
      if (bodySource) bodySource.stop(now + 0.56);
      this.spinSource = null;
      this.spinGain = null;
      this.spinFilter = null;
      this.spinBodySource = null;
      this.spinBodyGain = null;
      this.spinBodyFilter = null;
      this.spinEnvelope = null;
    }
  }

  const sound = new SoundEngine();

  function renderWheel() {
    itemElements.forEach((itemElement) => {
      const itemId = itemElement.dataset.itemId;
      const slotIndex = order.findIndex((item) => item.id === itemId);
      const item = order[slotIndex];
      const position = SLOT_POSITIONS[slotIndex];
      const image = itemElement.querySelector("img");
      itemElement.dataset.slot = String(slotIndex);
      itemElement.style.left = position.left;
      itemElement.style.top = position.top;
      image.src = item.icon;
      image.alt = item.id === "think" ? "로댕의 생각하는 사람" : item.label;
    });
  }

  function preloadResultPosters() {
    DEFAULT_ORDER.forEach((item) => {
      const image = new Image();
      image.src = item.resultImage;
    });
  }

  function showResultPoster() {
    resultPlaybackToken += 1;
    resultVideo.pause();
    if (Number.isFinite(resultVideo.duration)) resultVideo.currentTime = 0;
    resultVideo.classList.remove("is-ready");
  }

  function prepareResultVideo(item) {
    showResultPoster();
    resultVideo.dataset.itemId = item.id;
    resultVideo.poster = item.resultImage;
    resultVideo.preload = "auto";
    resultVideo.src = item.resultVideo;
    resultVideo.load();
  }

  async function playResultVideo(item) {
    if (reducedMotion.matches || resultVideo.dataset.itemId !== item.id) return;
    const playbackToken = ++resultPlaybackToken;
    try {
      resultVideo.currentTime = 0;
      await resultVideo.play();
      if (
        playbackToken !== resultPlaybackToken
        || resultScreen.hidden
        || resultVideo.dataset.itemId !== item.id
      ) {
        resultVideo.pause();
        return;
      }
      resultVideo.classList.add("is-ready");
    } catch {
      if (playbackToken === resultPlaybackToken) showResultPoster();
    }
  }

  function setControlsDisabled(disabled) {
    startButton.disabled = disabled;
    shuffleButton.disabled = disabled;
    resetButton.disabled = disabled;
    startButton.setAttribute("aria-busy", String(disabled));
  }

  function setStatus(message, excited = false) {
    status.textContent = message;
    status.classList.toggle("is-excited", excited);
  }

  function setStartButtonLabel(message) {
    startLabel.textContent = message;
    startButton.classList.toggle("has-long-label", message.length > 4);
  }

  function bouncePointer(intensity = 0.7, finalBounce = false) {
    if (reducedMotion.matches || !pointer.animate) return;
    if (pointerAnimation) pointerAnimation.cancel();
    const amplitude = finalBounce ? 24 : 12 + intensity * 11;
    const duration = finalBounce ? 620 : 135 + (1 - intensity) * 220;
    pointerAnimation = pointer.animate(
      [
        { transform: "translateX(-50%) rotate(0deg)", offset: 0 },
        { transform: `translateX(-50%) rotate(${amplitude}deg)`, offset: 0.24 },
        { transform: `translateX(-50%) rotate(${-amplitude * 0.52}deg)`, offset: 0.5 },
        { transform: `translateX(-50%) rotate(${amplitude * 0.24}deg)`, offset: 0.72 },
        { transform: "translateX(-50%) rotate(0deg)", offset: 1 },
      ],
      { duration, easing: "cubic-bezier(0.22, 0.82, 0.24, 1)" },
    );
  }

  function animateSpin(startAngle, endAngle, duration) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let lastBoundary = Math.floor(startAngle / 60);
      function frame(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const angle = startAngle + (endAngle - startAngle) * eased;
        const currentBoundary = Math.floor(angle / 60);
        rotor.style.transform = `rotate(${angle}deg)`;
        sound.updateSpin(1 - progress);
        if (currentBoundary > lastBoundary) {
          const crossings = Math.min(currentBoundary - lastBoundary, 2);
          const intensity = Math.max(0.18, 1 - progress * 0.86);
          for (let index = 0; index < crossings; index += 1) {
            bouncePointer(intensity);
            sound.tick(intensity);
          }
          lastBoundary = currentBoundary;
        }
        if (progress < 1) window.requestAnimationFrame(frame);
        else resolve();
      }
      window.requestAnimationFrame(frame);
    });
  }

  function clearCelebration() {
    celebrationLayer.replaceChildren();
  }

  function createCelebration() {
    clearCelebration();
    if (reducedMotion.matches) return;
    const fragment = document.createDocumentFragment();
    const colors = ["#FFD200", "#ffffff", "#111111", "#ffe978"];
    for (let index = 0; index < 54; index += 1) {
      const piece = document.createElement("i");
      piece.className = `confetti-piece${index % 5 === 0 ? " is-round" : ""}`;
      piece.style.setProperty("--x", `${randomBetween(2, 98)}%`);
      piece.style.setProperty("--size", `${randomBetween(7, 14)}px`);
      piece.style.setProperty("--color", colors[index % colors.length]);
      piece.style.setProperty("--delay", `${randomBetween(0, 0.55)}s`);
      piece.style.setProperty("--duration", `${randomBetween(2.1, 3.4)}s`);
      piece.style.setProperty("--drift", `${randomBetween(-90, 90)}px`);
      piece.style.setProperty("--spin", `${randomBetween(420, 980)}deg`);
      fragment.append(piece);
    }
    for (let index = 0; index < 12; index += 1) {
      const sparkle = document.createElement("i");
      sparkle.className = "sparkle";
      sparkle.style.setProperty("--x", `${index % 2 === 0 ? randomBetween(8, 28) : randomBetween(72, 92)}%`);
      sparkle.style.setProperty("--y", `${randomBetween(18, 82)}%`);
      sparkle.style.setProperty("--size", `${randomBetween(18, 42)}px`);
      sparkle.style.setProperty("--delay", `${randomBetween(0.15, 1.2)}s`);
      fragment.append(sparkle);
    }
    celebrationLayer.append(fragment);
  }

  function showResult(item) {
    previousFocus = document.activeElement;
    resultImage.src = item.resultImage;
    resultImage.alt = `${item.label} 선택 결과 삽화`;
    resultDescription.textContent = `룰렛 결과는 ${item.label}입니다.`;
    createCelebration();
    resultScreen.hidden = false;
    resultScreen.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    window.requestAnimationFrame(() => {
      resultScreen.classList.add("is-visible");
      resultClose.focus({ preventScroll: true });
      playResultVideo(item);
    });
  }

  async function hideResult({ restoreFocus = true } = {}) {
    if (resultScreen.hidden) return;
    showResultPoster();
    resultScreen.classList.remove("is-visible");
    document.body.classList.remove("is-modal-open");
    await wait(reducedMotion.matches ? 1 : 360);
    resultScreen.hidden = true;
    resultScreen.setAttribute("aria-hidden", "true");
    clearCelebration();
    if (restoreFocus && previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }

  async function spinWheel() {
    if (interactionLocked) return;
    interactionLocked = true;
    setControlsDisabled(true);
    await hideResult({ restoreFocus: false });
    await sound.ensure();
    setStartButtonLabel("돌아가는 중!");
    setStatus("두근두근… 어디에 멈출까요?", true);
    wheelStage.classList.add("is-spinning");
    sound.startCue();
    sound.startSpin();

    const selectedSlot = Math.floor(Math.random() * order.length);
    const selectedItem = order[selectedSlot];
    prepareResultVideo(selectedItem);
    const safeJitter = randomBetween(-11, 11);
    const desiredRotation = normalizeAngle(-90 + safeJitter - SLOT_ANGLES[selectedSlot]);
    const alignmentDelta = normalizeAngle(desiredRotation - normalizeAngle(rotation));
    const fullTurns = reducedMotion.matches ? 2 : 6 + Math.floor(Math.random() * 3);
    const endRotation = rotation + fullTurns * 360 + alignmentDelta;
    const duration = reducedMotion.matches ? 1500 : randomBetween(5200, 6100);

    await animateSpin(rotation, endRotation, duration);
    sound.stopSpin();
    bouncePointer(0.35, true);
    await wait(reducedMotion.matches ? 40 : 380);
    rotation = normalizeAngle(endRotation);
    rotor.style.transform = `rotate(${rotation}deg)`;
    sound.celebrate();
    setStatus(`오늘의 선택은 ${selectedItem.label}!`, true);
    showResult(selectedItem);

    setStartButtonLabel("다시 돌리기");
    wheelStage.classList.remove("is-spinning");
    setControlsDisabled(false);
    interactionLocked = false;
  }

  function shuffledCopy(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  async function animateIconShuffle(nextOrder) {
    if (reducedMotion.matches || !Element.prototype.animate) {
      order = nextOrder;
      renderWheel();
      return;
    }

    const disappearingAnimations = itemElements.map((itemElement) => itemElement.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          filter: "drop-shadow(0 5px 4px rgba(0,0,0,.12))",
        },
        {
          transform: "translate(-50%, -50%) scale(.12)",
          opacity: 0,
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0))",
        },
      ],
      {
        duration: 300,
        easing: "cubic-bezier(.4, 0, .7, .2)",
        fill: "forwards",
      },
    ));

    await Promise.all(disappearingAnimations.map((animation) => animation.finished.catch(() => undefined)));

    order = nextOrder;
    renderWheel();

    const appearingAnimations = itemElements.map((itemElement, index) => itemElement.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(.12)",
          opacity: 0,
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0))",
        },
        {
          transform: "translate(-50%, -50%) scale(1.14)",
          opacity: 1,
          filter: "drop-shadow(0 0 12px rgba(255,210,0,.62))",
          offset: 0.72,
        },
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          filter: "drop-shadow(0 5px 4px rgba(0,0,0,.12))",
        },
      ],
      {
        duration: 460,
        delay: index * 24,
        easing: "cubic-bezier(.2, .82, .22, 1)",
        fill: "both",
      },
    ));

    disappearingAnimations.forEach((animation) => animation.cancel());
    await Promise.all(appearingAnimations.map((animation) => animation.finished.catch(() => undefined)));
    appearingAnimations.forEach((animation) => animation.cancel());
  }

  async function shuffleWheel() {
    if (interactionLocked) return;
    interactionLocked = true;
    setControlsDisabled(true);
    await hideResult({ restoreFocus: false });
    await sound.ensure();
    sound.shuffleCue();
    setStatus("선택지 위치를 신나게 섞는 중!", true);
    let nextOrder = shuffledCopy(order);
    if (nextOrder.every((item, index) => item.id === order[index].id)) {
      nextOrder = [...nextOrder.slice(1), nextOrder[0]];
    }
    await animateIconShuffle(nextOrder);
    setStatus("새로운 순서로 섞었어요!", false);
    setStartButtonLabel("시작하기");
    setControlsDisabled(false);
    interactionLocked = false;
  }

  async function resetWheel() {
    if (interactionLocked) return;
    interactionLocked = true;
    setControlsDisabled(true);
    await hideResult({ restoreFocus: false });
    await sound.ensure();
    sound.resetCue();
    order = DEFAULT_ORDER.map((item) => ({ ...item }));
    renderWheel();
    rotor.classList.add("is-resetting");
    window.requestAnimationFrame(() => { rotor.style.transform = "rotate(0deg)"; });
    rotation = 0;
    setStatus("처음 상태로 돌아왔어요.", false);
    setStartButtonLabel("시작하기");
    await wait(reducedMotion.matches ? 1 : 780);
    rotor.classList.remove("is-resetting");
    setControlsDisabled(false);
    interactionLocked = false;
  }

  async function toggleSound() {
    const nextEnabled = !sound.enabled;
    sound.setEnabled(nextEnabled);
    if (nextEnabled) await sound.ensure();
    soundToggle.setAttribute("aria-pressed", String(nextEnabled));
    soundToggle.setAttribute("aria-label", nextEnabled ? "소리 끄기" : "소리 켜기");
    if (nextEnabled) sound.tone(660, 0, 0.1, 0.07, "sine", 880);
  }

  startButton.addEventListener("click", spinWheel);
  shuffleButton.addEventListener("click", shuffleWheel);
  resetButton.addEventListener("click", resetWheel);
  soundToggle.addEventListener("click", toggleSound);
  resultVideo.addEventListener("error", showResultPoster);
  resultClose.addEventListener("click", () => hideResult());
  resultScreen.addEventListener("click", (event) => {
    if (event.target === resultScreen || event.target === celebrationLayer) hideResult();
  });
  resultDialog.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !resultScreen.hidden) hideResult();
  });

  renderWheel();
  preloadResultPosters();
})();
