const video = document.getElementById('camera');
const startBtn = document.getElementById('startBtn');
const retakeBtn = document.getElementById('retakeBtn');
const nextBtn = document.getElementById('nextBtn');
const mirrorBtn = document.getElementById('mirrorBtn');
const countdownEl = document.getElementById('countdown');
const snapshots = document.querySelectorAll('.snapshot');

let stream;
let currentShot = 0;
let isMirrored = false;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1920 }, // Resolusi ideal dari kamera
        height: { ideal: 1080 }
      },
      audio: false
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      console.log("Camera started, resolution:", video.videoWidth, "x", video.videoHeight);
      // Aktifkan tombol setelah kamera siap
      startBtn.disabled = false;
      nextBtn.disabled = false;
      retakeBtn.disabled = false;
      mirrorBtn.disabled = false;
    };
  } catch (err) {
    alert("Gagal mengakses kamera: " + err.message + ". Pastikan Anda memberikan izin kamera.");
    console.error("Camera error:", err);
    // Nonaktifkan tombol jika kamera gagal
    startBtn.disabled = true;
    nextBtn.disabled = true;
    retakeBtn.disabled = true;
    mirrorBtn.disabled = true;
  }
}

mirrorBtn.addEventListener('click', () => {
  isMirrored = !isMirrored;
  video.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';

  mirrorBtn.classList.toggle('mirror-on', isMirrored);
  mirrorBtn.classList.toggle('mirror-off', !isMirrored);
});

function showCountdown(seconds, callback) {
  countdownEl.style.display = 'flex';
  countdownEl.textContent = seconds;
  let interval = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      countdownEl.textContent = seconds;
    } else {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      callback();
    }
  }, 1000);
}

function takePhoto(index) {
  const canvas = snapshots[index];
  const context = canvas.getContext('2d');

  // Pastikan video memiliki dimensi yang valid
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.warn("Video stream tidak memiliki dimensi yang valid saat mengambil foto.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (isMirrored) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (isMirrored) {
    context.setTransform(1, 0, 0, 1, 0, 0); // reset transform
  }
  console.log(`Foto ${index + 1} berhasil diambil ke canvas dengan dimensi: ${canvas.width}x${canvas.height}`);
}

startBtn.addEventListener('click', () => {
  if (!video.srcObject || video.videoWidth === 0) {
    alert("Kamera belum siap! Tunggu beberapa detik dan coba lagi.");
    return;
  }
  // Nonaktifkan tombol saat proses pengambilan foto
  startBtn.disabled = true;
  retakeBtn.disabled = true;
  nextBtn.disabled = true;
  mirrorBtn.disabled = true;

  currentShot = 0;
  // Bersihkan semua canvas sebelum memulai sesi baru
  snapshots.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  takeNextPhoto();
});

retakeBtn.addEventListener('click', () => {
  currentShot = 0;
  snapshots.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  // Aktifkan kembali tombol start setelah retake
  startBtn.disabled = false;
  nextBtn.disabled = false; // Next bisa diakses jika ada foto sebelumnya
  mirrorBtn.disabled = false;
});

function takeNextPhoto() {
  if (currentShot >= snapshots.length) {
    // Semua foto sudah diambil, aktifkan tombol kembali
    startBtn.disabled = false;
    retakeBtn.disabled = false;
    nextBtn.disabled = false;
    mirrorBtn.disabled = false;
    return;
  }

  // Tambahkan delay untuk kestabilan di mobile
  setTimeout(() => {
    showCountdown(3, () => {
      takePhoto(currentShot);
      currentShot++;
      if (currentShot < snapshots.length) {
        takeNextPhoto();
      } else {
        // Semua foto sudah diambil, aktifkan tombol kembali
        startBtn.disabled = false;
        retakeBtn.disabled = false;
        nextBtn.disabled = false;
        mirrorBtn.disabled = false;
      }
    });
  }, 500);
}

function savePhotosToSessionStorage() {
  const photoData = [];
  let allPhotosValid = true;

  snapshots.forEach((canvas, i) => {
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn(`Canvas ${i} kosong atau tidak valid, tidak akan disimpan.`);
      allPhotosValid = false;
      return; // Lewati canvas yang kosong
    }

    // --- Bagian Kompresi Gambar ---
    const tempCanvas = document.createElement('canvas');
    const MAX_DIMENSION = 1200; // Batasi dimensi maksimum (lebar atau tinggi)
    let width = canvas.width;
    let height = canvas.height;

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }

    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, width, height);

    // Gunakan JPEG dengan kualitas yang lebih rendah untuk ukuran file yang lebih kecil
    // Kualitas 0.7-0.8 biasanya cukup baik untuk web
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.7);
    console.log(`Canvas ${i} (kompresi) size: ${tempCanvas.width}x${tempCanvas.height}, dataURL length: ${dataUrl.length}`);
    photoData.push(dataUrl);
  });

  if (!allPhotosValid && photoData.length === 0) {
    alert("Tidak ada foto yang valid untuk disimpan. Pastikan kamera berfungsi dan Anda telah mengambil foto.");
    return false; // Indikasi bahwa tidak ada foto yang disimpan
  }

  try {
    sessionStorage.setItem('photostrip', JSON.stringify(photoData));
    console.log("Photos saved to sessionStorage successfully.");
    return true; // Indikasi sukses
  } catch (e) {
    console.error("Failed to save photos to sessionStorage:", e);
    alert("Gagal menyimpan foto ke memori perangkat. Mungkin memori penuh atau foto terlalu besar setelah kompresi. Coba ambil ulang dengan resolusi lebih rendah atau bersihkan cache browser.");
    return false; // Indikasi gagal
  }
}

nextBtn.addEventListener('click', () => {
  // Nonaktifkan tombol saat proses penyimpanan dan navigasi
  nextBtn.disabled = true;
  startBtn.disabled = true;
  retakeBtn.disabled = true;
  mirrorBtn.disabled = true;

  const saved = savePhotosToSessionStorage();

  if (saved) {
    // Delay penting untuk pastikan data tersimpan di mobile sebelum navigasi
    // Tingkatkan delay untuk keandalan lebih tinggi di mobile
    setTimeout(() => {
      window.location.href = 'editing.html';
    }, 1500); // Meningkatkan delay menjadi 1.5 detik
  } else {
    // Jika penyimpanan gagal, aktifkan kembali tombol
    nextBtn.disabled = false;
    startBtn.disabled = false;
    retakeBtn.disabled = false;
    mirrorBtn.disabled = false;
  }
});

// Panggil startCamera saat halaman dimuat
startCamera();

// Nonaktifkan tombol secara default sampai kamera siap
startBtn.disabled = true;
nextBtn.disabled = true;
retakeBtn.disabled = true;
mirrorBtn.disabled = true;
