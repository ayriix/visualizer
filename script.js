const fileInput = document.getElementById("fileInput");
const audio = new Audio();
audio.volume = 0.05;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyser = audioContext.createAnalyser();
const progressBar = document.getElementById("progressBar");
const timeDisplay = document.getElementById("timeDisplay");
const trackList = document.getElementById("trackList");
const trackListContainer = document.querySelector(".track-list-container");
const toggleTrackList = document.querySelector("#toggleTrackList");

trackListContainer.addEventListener("click", () => {
  trackList.classList.toggle("active");
  trackListContainer.classList.toggle("active");
  toggleTrackList.classList.toggle("active");
});

let tracks = [],
  currentTrackIndex = 0,
  source;
let allFiles = [];

const playlistTitle = document.getElementById("playlistTitle");

playlistTitle.addEventListener("input", () => {
  localStorage.setItem("playlistTitle", playlistTitle.textContent);
  if (playlistTitle.textContent.length > 14) {
    playlistTitle.textContent = playlistTitle.textContent.slice();
  }
});

playlistTitle.addEventListener("keypress", (event) => {
  if (playlistTitle.textContent.length >= 14) {
    event.preventDefault();
  }
});

playlistTitle.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    playlistTitle.blur();
    localStorage.setItem("playlistTitle", playlistTitle.textContent);
  }
});

playlistTitle.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("DOMContentLoaded", () => {
  const savedPlaylistTitle = localStorage.getItem("playlistTitle");
  if (savedPlaylistTitle) {
    playlistTitle.textContent = savedPlaylistTitle;
  }
});

const slider = document.querySelector(".custom-slider");
const sliderThumb = document.querySelector(".slider-thumb");
const sliderTrack = document.querySelector(".slider-track");
const speedValue = document.getElementById("speedValue");

let isDragging = false;

let currentValue = 1.0;
updateSliderUI(currentValue);

slider.addEventListener("mousedown", (e) => {
  isDragging = true;
  updateSlider(e);
});

window.addEventListener("mousemove", (e) => {
  if (isDragging) updateSlider(e);
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

function updateSlider(e) {
  const rect = slider.getBoundingClientRect();
  let offsetX = e.clientX - rect.left;
  offsetX = Math.max(0, Math.min(offsetX, rect.width));

  const percent = (offsetX / rect.width) * 100;
  const value = Math.round((percent / 100) * 15 + 5) / 10;

  updateSliderUI(value);
  audio.playbackRate = value;
}

function updateSliderUI(value) {
  const percent = ((value - 0.5) / 1.5) * 100;
  sliderThumb.style.left = `${percent}%`;
  sliderTrack.style.width = `${percent}%`;
  speedValue.textContent = value.toFixed(1);
}

const filters = (frequencies = [
  62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
].map((freq) => {
  const filter = audioContext.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.setValueAtTime(freq, audioContext.currentTime);
  filter.gain.setValueAtTime(0, audioContext.currentTime);
  return filter;
}));

function createCustomSlider(
  sliderContainer,
  initialValue,
  min,
  max,
  step,
  onChange
) {
  const sliderTrack = sliderContainer.querySelector(".slider-track");
  const sliderThumb = sliderContainer.querySelector(".slider-thumb");
  const valueDisplay = sliderContainer.nextElementSibling;

  let isDragging = false;

  function updateSlider(value) {
    const percent = ((value - min) / (max - min)) * 100;
    sliderThumb.style.left = `${percent}%`;
    sliderTrack.style.width = `${percent}%`;
    valueDisplay.textContent = `${value.toFixed(1)} dB`;
  }

  sliderContainer.addEventListener("mousedown", (event) => {
    isDragging = true;
    updateSliderFromEvent(event);
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      updateSliderFromEvent(event);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  function updateSliderFromEvent(event) {
    const rect = sliderContainer.getBoundingClientRect();
    let offsetX = event.clientX - rect.left;
    offsetX = Math.max(0, Math.min(offsetX, rect.width));

    const percent = offsetX / rect.width;
    const value = min + percent * (max - min);
    const roundedValue = Math.round(value / step) * step;

    updateSlider(roundedValue);
    onChange(roundedValue);
  }

  updateSlider(initialValue);
}

const equalizerSliders = document.querySelectorAll(".equalizer > div");

equalizerSliders.forEach((sliderContainer, index) => {
  const initialValue = 0;
  const min = -12;
  const max = 12;
  const step = 0.1;

  createCustomSlider(
    sliderContainer.querySelector(".custom-slider"),
    initialValue,
    min,
    max,
    step,
    (value) => {
      filters[index].gain.setValueAtTime(value, audioContext.currentTime);
    }
  );
});

function setTrack(index) {
  audio.src = tracks[index];
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = 300;
}

resizeCanvas();

fileInput.addEventListener("change", () => {
  const newFiles = Array.from(fileInput.files);
  allFiles.push(...newFiles);
  const dataTransfer = new DataTransfer();
  allFiles.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;

  const newTracks = newFiles.map((file) => URL.createObjectURL(file));
  tracks.push(...newTracks);
  if (currentTrackIndex === -1 || !audio.src) {
    currentTrackIndex = 0;
    setTrack(currentTrackIndex);
  }

  updateTrackList();
  setupAudio();
  visualize();
});

function updateTrackList() {
  trackList.innerHTML = "";

  if (tracks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.id = "emptyMessage";
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "Nothing found 😢";
    trackList.appendChild(emptyMessage);
  } else {
    tracks.forEach((track, index) => {
      const listItem = document.createElement("li");
      const fileName = allFiles[index]?.name || `Трек ${index + 1}`;
      listItem.textContent = fileName;
      listItem.className = "track-item";
      if (index === currentTrackIndex) {
        listItem.classList.add("active-track");
      }

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-track";
      deleteButton.innerHTML = '<i class="fas fa-2x fa-trash"></i>';

      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        removeTrack(index);
      });

      listItem.appendChild(deleteButton);
      listItem.addEventListener("click", () => {
        currentTrackIndex = index;
        setTrack(currentTrackIndex);
        audio.play();
        updateTrackList();
      });
      trackList.appendChild(listItem);
    });
  }
}

function removeTrack(index) {
  tracks.splice(index, 1);
  allFiles.splice(index, 1);

  if (currentTrackIndex === index) {
    currentTrackIndex = Math.max(0, currentTrackIndex - 1);
    if (tracks.length > 0) {
      setTrack(currentTrackIndex);
      audio.play();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  updateTrackList();
}

function setupAudio() {
  source = audioContext.createMediaElementSource(audio);
  source.connect(filters[0]);
  filters.forEach((filter, index) => {
    if (index < filters.length - 1) {
      filter.connect(filters[index + 1]);
    }
  });
  filters[filters.length - 1].connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 8192;
}

document.getElementById("playButton").addEventListener("click", () => {
  audio.play();
});

document.getElementById("pauseButton").addEventListener("click", () => {
  audio.pause();
});

document.getElementById("stopButton").addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
});

document.getElementById("prevTrackButton").addEventListener("click", () => {
  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  setTrack(currentTrackIndex);
  audio.play();
  updateTrackList();
});

document.getElementById("nextTrackButton").addEventListener("click", () => {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  setTrack(currentTrackIndex);
  audio.play();
  updateTrackList();
});

document.getElementById("repeatButton").addEventListener("click", () => {
  audio.currentTime = 0;
  audio.play();
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

audio.addEventListener("ended", () => {
  if (true) {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    setTrack(currentTrackIndex);
    audio.play();
    updateTrackList();
  }
});

audio.addEventListener("timeupdate", () => {
  const currentTime = formatTime(audio.currentTime);
  const duration = isNaN(audio.duration) ? "0:00" : formatTime(audio.duration);
  const progress = isNaN(audio.duration)
    ? 0
    : (audio.currentTime / audio.duration) * 100;

  progressBar.style.width = progress + "%";
  timeDisplay.textContent = `${currentTime} / ${duration}`;
});

audio.addEventListener("play", () => {
  audioContext.resume();
});

progressBar.parentElement.addEventListener("click", (event) => {
  const progressBarWidth = progressBar.parentElement.clientWidth;
  const clickX = event.offsetX;
  const newTime = (clickX / progressBarWidth) * audio.duration;
  audio.currentTime = newTime;
});

let isDraggingProgressBar = false;

progressBar.parentElement.addEventListener("mousedown", () => {
  isDraggingProgressBar = true;
});

document.addEventListener("mouseup", () => {
  isDraggingProgressBar = false;
});

document.addEventListener("mousemove", (event) => {
  if (isDraggingProgressBar) {
    const progressBarWidth = progressBar.parentElement.clientWidth;
    const clickX =
      event.clientX - progressBar.parentElement.getBoundingClientRect().left;
    const newTime = (clickX / progressBarWidth) * audio.duration;
    audio.currentTime = newTime;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const colorPickerButton = document.getElementById("colorPickerButton");
  const colorPreview = document.getElementById("colorPreview");
  const visualizerColorInput = document.getElementById("visualizerColorInput");

  const savedColor = localStorage.getItem("visualizerColor") || "#ccc";
  colorPreview.style.backgroundColor = savedColor;
  if (visualizerColorInput) {
    visualizerColorInput.value = savedColor;
  }

  const pickr = Pickr.create({
    el: "#colorPickerButton",
    theme: "classic",
    position: "right",
    useAsButton: true,
    components: {
      opacity: true,
      hue: true,
      interaction: {
        input: true,
      },
    },
  });

  colorPickerButton.addEventListener("click", (event) => {
    event.preventDefault();
    pickr.show();
  });

  pickr.on("change", (color) => {
    const hexColor = color.toHEXA().toString();
    localStorage.setItem("visualizerColor", hexColor);
    colorPreview.style.backgroundColor = hexColor;
    if (visualizerColorInput) {
      visualizerColorInput.value = hexColor;
    }
    pickr.applyColor(false);
  });
});

function visualize() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 4;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] * 1.5;
      ctx.fillStyle = visualizerColorInput.value;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }
  }
  draw();
}
visualize();
