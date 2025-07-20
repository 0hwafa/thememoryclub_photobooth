const stripCanvas = document.getElementById("stripCanvas");
const ctx = stripCanvas.getContext("2d");
const frameOptions = document.querySelectorAll(".frame-preview");

let photos = [];
let dragTarget = null;
let dragStartX = 0;
let dragStartY = 0;
let initialX = [];
let initialY = [];
let selectedFrame = null;
let currentFilter = "none";
let frameImage = null;

// Ukuran foto
const canvasWidth = 719;
const canvasHeight = 1732;

const photoHeight = 577.33;
const photoSpacing = 0;
const photoWidth = canvasWidth;


const devicePixelRatio = window.devicePixelRatio || 1;
stripCanvas.width = canvasWidth * devicePixelRatio;
stripCanvas.height = canvasHeight * devicePixelRatio;
stripCanvas.style.width = canvasWidth + "px";
stripCanvas.style.height = canvasHeight + "px";
ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

// Load saved photos
// Load saved photos
const savedPhotos = JSON.parse(sessionStorage.getItem("photostrip") || "[]");
console.log("Loaded from sessionStorage:", savedPhotos);
console.log("Jumlah foto ditemukan:", savedPhotos.length);

const loadedCount = Math.min(savedPhotos.length, 3);

savedPhotos.slice(0, loadedCount).forEach((dataUrl, index) => {
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    console.log("Gambar", index + 1, "berhasil dimuat. Dimensi:", img.width, "x", img.height);
    photos.push({
      img,
      x: 0,
      y: index * (photoHeight + photoSpacing) + photoSpacing,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    });
    if (photos.length === loadedCount) {
      drawStrip();
      generateFilterPreviews();
    }
  };
  img.onerror = () => {
    console.warn("Gambar", index + 1, "gagal dimuat.");
  };
});

function drawStrip() {
  console.log("drawStrip dipanggil. Jumlah foto:", photos.length);

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  photos.forEach(photo => {
    ctx.filter = currentFilter;
    const crop = cropToFit(photo.img, photoWidth, photoHeight);

    ctx.drawImage(
      photo.img,
      crop.sx + photo.offsetX,
      crop.sy + photo.offsetY,
      crop.sw / photo.scale,
      crop.sh / photo.scale,
      photo.x,
      photo.y,
      photoWidth,
      photoHeight
    );
  });

  ctx.filter = "none";
  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvasWidth, canvasHeight);
  }
}


// Crop IMage
function cropToFit(img, targetWidth, targetHeight) {
  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgAspect > targetAspect) {
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetAspect;
    sy = (img.height - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

function drawStrip() {
  // Background putih
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Gambar foto
  photos.forEach(photo => {
    ctx.filter = currentFilter;
    const crop = cropToFit(photo.img, photoWidth, photoHeight);

    ctx.drawImage(
      photo.img,
      crop.sx + photo.offsetX,
      crop.sy + photo.offsetY,
      crop.sw / photo.scale,
      crop.sh / photo.scale,
      photo.x,
      photo.y,
      photoWidth,
      photoHeight
    );
  });

  // Gambar frame jika ada
  ctx.filter = "none";
  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvasWidth, canvasHeight);
  }
}

// Drag Foto 
stripCanvas.addEventListener("mousedown", e => {
  const rect = stripCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    if (mx >= p.x && mx <= p.x + photoWidth && my >= p.y && my <= p.y + photoHeight) {
      dragTarget = i;
      dragStartX = mx;
      dragStartY = my;
      initialX[i] = p.offsetX;
      initialY[i] = p.offsetY;
      break;
    }
  }
});

stripCanvas.addEventListener("mousemove", e => {
  if (dragTarget === null) return;
  const rect = stripCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const p = photos[dragTarget];
  p.offsetX = initialX[dragTarget] - (mx - dragStartX) * 2;
  p.offsetY = initialY[dragTarget] - (my - dragStartY) * 2;

  drawStrip();
});

stripCanvas.addEventListener("mouseup", () => dragTarget = null);

// Zoom
stripCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = stripCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    if (mx >= p.x && mx <= p.x + photoWidth && my >= p.y && my <= p.y + photoHeight) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      p.scale = Math.min(3, Math.max(0.5, p.scale * delta));
      drawStrip();
      break;
    }
  }
});

// Frame
frameOptions.forEach(option => {
  option.addEventListener("click", () => {
    frameOptions.forEach(o => o.classList.remove("selected"));
    option.classList.add("selected");

    selectedFrame = option.getAttribute("data-frame");
    frameImage = new Image();
    frameImage.src = selectedFrame;
    frameImage.onload = () => drawStrip();
  });
});

// Download Foto strip : Ganti nama file
function downloadImage() {
  const link = document.createElement("a");
  link.download = "tmc_photobooth.png";
  link.href = stripCanvas.toDataURL("image/png");
  link.click();
}

// Filter thumbnails
function generateFilterPreviews() {
  const container = document.getElementById("filterPreviewContainer");
  if (!container) return;
  container.innerHTML = "";

  const filters = [
    { name: "Normal", value: "none" },
    { name: "Grayscale", value: "grayscale(100%)" },
    { name: "Sephia", value: "sepia(80%)" },
    { name: "Contrast", value: "contrast(150%)" },
    { name: "Bright", value: "brightness(120%)" }
  ];

  const img = photos[0]?.img;
  if (!img) return;

  filters.forEach(filter => {
    const thumb = document.createElement("canvas");
    thumb.width = 120;
    thumb.height = 90;
    const tctx = thumb.getContext("2d");

    tctx.filter = filter.value;
    tctx.drawImage(img, 0, 0, 120, 90);
    thumb.classList.add("filter-thumb");
    thumb.title = filter.name;

    thumb.addEventListener("click", () => {
      currentFilter = filter.value;
      document.querySelectorAll(".filter-thumb").forEach(el => el.classList.remove("selected"));
      thumb.classList.add("selected");
      drawStrip();
    });

    container.appendChild(thumb);
  });
}
