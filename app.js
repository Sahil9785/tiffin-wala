/* ==========================================================================
   TIFFINWALA JAVASCRIPT APPLICATION ENGINE
   Ghar Ka Swad, Aapke Dwar
   Manual "Build Your Tiffin" Food Customization & Firebase Integration
   ========================================================================== */

// ==========================================================================
// 1. TIFFIN CONFIGURATION — EDITABLE FOOD ITEMS & PRICES
// You can easily add, remove, or edit any items and pricing below!
// ==========================================================================
const TIFFIN_CONFIG = {
  // Base food price per single standard tiffin (subtotal)
  basePricePerTiffin: 70,

  // DAL: Dal Tadka, Dal Fry, Dal Makhani, Moong Dal
  dalOptions: [
    { id: 'dal_tadka', name: 'Dal Tadka' },
    { id: 'dal_fry', name: 'Dal Fry' },
    { id: 'dal_makhani', name: 'Dal Makhani' },
    { id: 'moong_dal', name: 'Moong Dal' }
  ],

  // SABZI: Aloo Gobi, Aloo Matar, Bhindi Masala, Mix Veg, Palak Paneer
  sabziOptions: [
    { id: 'aloo_gobi', name: 'Aloo Gobi' },
    { id: 'aloo_matar', name: 'Aloo Matar' },
    { id: 'bhindi_masala', name: 'Bhindi Masala' },
    { id: 'mix_veg', name: 'Mix Veg' },
    { id: 'palak_paneer', name: 'Palak Paneer' }
  ],

  // RICE: Steamed Rice, Jeera Rice, Veg Pulao, No Rice
  riceOptions: [
    { id: 'steamed_rice', name: 'Steamed Rice' },
    { id: 'jeera_rice', name: 'Jeera Rice' },
    { id: 'veg_pulao', name: 'Veg Pulao' },
    { id: 'no_rice', name: 'No Rice' }
  ],

  // ROTI: 2 Roti, 3 Roti, 4 Roti, No Roti
  rotiOptions: [
    { id: '2_roti', name: '2 Roti' },
    { id: '3_roti', name: '3 Roti' },
    { id: '4_roti', name: '4 Roti' },
    { id: 'no_roti', name: 'No Roti' }
  ],

  // SALAD: Regular Salad, No Salad
  saladOptions: [
    { id: 'regular_salad', name: 'Regular Salad' },
    { id: 'no_salad', name: 'No Salad' }
  ],

  // EXTRA ITEMS: Extra Roti, Extra Rice, Extra Dal, Extra Sabzi, Curd, Pickle
  extrasOptions: [
    { id: 'extra_roti', name: 'Extra Roti', price: 10 },
    { id: 'extra_rice', name: 'Extra Rice', price: 20 },
    { id: 'extra_dal', name: 'Extra Dal', price: 20 },
    { id: 'extra_sabzi', name: 'Extra Sabzi', price: 25 },
    { id: 'curd', name: 'Curd', price: 10 },
    { id: 'pickle', name: 'Pickle', price: 5 }
  ]
};

// ==========================================================================
// 2. CENTRAL APPLICATION STATE
// ==========================================================================
const AppState = {
  currentStep: 1,
  locationConfirmed: false,
  auth: {
    isLoggedIn: false,
    uid: null,
    email: '',
    photoURL: '',
    name: ''
  },
  pendingRedirectToLocation: false,
  location: {
    address: 'B.K. Birla Institute of Engineering and Technology, Pilani, Rajasthan 333031',
    houseNo: '',
    areaStreet: 'BKBIET Campus',
    city: 'Pilani',
    state: 'Rajasthan',
    pincode: '333031',
    landmark: '',
    latitude: 28.3615,
    longitude: 75.6015
  },
  user: {
    name: 'Sahil Jangir',
    address: 'B.K. Birla Institute of Engineering and Technology, Pilani, Rajasthan 333031',
    phone: '+91 98765 43210'
  },
  // Manual Tiffin Selections (Customer manually chooses every single item - No auto selection)
  tiffinSelection: {
    dal: null,
    sabzi: null,
    rice: null,
    roti: null,
    salad: null,
    extras: [] // [{ id, name, price }]
  },
  quantity: 1, // 1 Tiffin, 2 Tiffins, etc.
  deliveryTime: {
    id: 'lunch',
    name: 'Lunch (12:00 PM – 2:00 PM)'
  },
  paymentMethod: 'cod', // Default to Cash on Delivery
  orderId: '#TW' + new Date().getFullYear() + '0927' + Math.floor(100 + Math.random() * 900),
  currentFirestoreOrderId: null,
  activeOrderListenerUnsub: null,
  tempGps: null
};

// --- AUDIO SYNTHESIS FOR TACTILE USER FEEDBACK ---
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },
  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  },
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }
};

// ==========================================================================
// 3. FIREBASE AUTHENTICATION & USER PROFILE SYNC
// ==========================================================================

function initFirebaseAuthListener() {
  if (!window.FirebaseService) {
    window.addEventListener('FirebaseServiceReady', () => {
      bindAuthChanges();
    }, { once: true });
    return;
  }
  bindAuthChanges();
}

function bindAuthChanges() {
  if (!window.FirebaseService) return;
  window.FirebaseService.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      AppState.auth.isLoggedIn = true;
      AppState.auth.uid = firebaseUser.uid;
      AppState.auth.email = firebaseUser.email || '';
      AppState.auth.photoURL = firebaseUser.photoURL || '';
      AppState.auth.name = firebaseUser.displayName || 'Tiffin Lover';
      AppState.user.name = firebaseUser.displayName || AppState.user.name;

      // Fetch saved profile from Firestore (address & location fields)
      try {
        const profile = await window.FirebaseService.getUserProfile(firebaseUser.uid);
        if (profile) {
          if (profile.address) {
            AppState.location.address = profile.address;
            AppState.user.address = profile.address;
            AppState.locationConfirmed = true;
          }
          if (profile.city) AppState.location.city = profile.city;
          if (profile.state) AppState.location.state = profile.state;
          if (profile.pincode) AppState.location.pincode = profile.pincode;
          if (profile.landmark) AppState.location.landmark = profile.landmark;
          if (profile.latitude !== undefined) AppState.location.latitude = profile.latitude;
          if (profile.longitude !== undefined) AppState.location.longitude = profile.longitude;
        }
      } catch (err) {
        console.warn("Could not load user profile:", err);
      }

      renderLoggedInNavUI();
      updateLiveUserDisplay();
      closeAuthModal();

      // If user was prompted to sign in when clicking Order Now, continue automatically to Location
      if (AppState.pendingRedirectToLocation) {
        AppState.pendingRedirectToLocation = false;
        setTimeout(() => {
          openLocationModal();
        }, 400);
      }
    } else {
      AppState.auth.isLoggedIn = false;
      AppState.auth.uid = null;
      AppState.auth.email = '';
      AppState.auth.photoURL = '';
      AppState.auth.name = '';

      renderLoggedOutNavUI();
    }
  });
}

function renderLoggedInNavUI() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  const user = AppState.auth;
  const initials = (user.name || 'TW').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarHtml = user.photoURL 
    ? `<img src="${user.photoURL}" class="user-avatar-img" alt="${user.name}" referrerpolicy="no-referrer">`
    : `<div class="user-avatar-fallback">${initials}</div>`;

  const firstName = (user.name || 'User').split(' ')[0];

  container.innerHTML = `
    <div class="user-profile-menu-wrap" id="user-profile-wrap">
      <div class="user-profile-chip" onclick="toggleUserDropdown(event)">
        ${avatarHtml}
        <span class="user-profile-name">${firstName}</span>
        <i class="fa-solid fa-chevron-down user-profile-chevron"></i>
      </div>

      <div class="user-dropdown-menu" id="user-dropdown-menu">
        <div class="dropdown-user-header">
          <div class="dropdown-user-name">${user.name}</div>
          <div class="dropdown-user-email">${user.email}</div>
        </div>
        <button type="button" class="dropdown-item" onclick="openOrdersModal()">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>My Orders</span>
        </button>
        <button type="button" class="dropdown-item" onclick="openLocationModal()">
          <i class="fa-solid fa-location-dot"></i>
          <span>Set Delivery Location</span>
        </button>
        <button type="button" class="dropdown-item dropdown-logout" onclick="triggerSignOut()">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;

  const mobileOrders = document.getElementById('nav-my-orders-mobile');
  if (mobileOrders) mobileOrders.style.display = 'block';
}

function renderLoggedOutNavUI() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  container.innerHTML = `
    <button class="btn-google-auth" id="btn-google-signin" onclick="triggerGoogleSignIn()">
      <svg class="google-icon-svg" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Sign In</span>
    </button>
  `;

  const mobileOrders = document.getElementById('nav-my-orders-mobile');
  if (mobileOrders) mobileOrders.style.display = 'none';
}

function toggleUserDropdown(event) {
  event.stopPropagation();
  const wrap = document.getElementById('user-profile-wrap');
  if (wrap) {
    wrap.classList.toggle('open');
  }
}

window.addEventListener('click', (e) => {
  const wrap = document.getElementById('user-profile-wrap');
  if (wrap && !wrap.contains(e.target)) {
    wrap.classList.remove('open');
  }
});

async function triggerGoogleSignIn() {
  SoundFX.playClick();
  if (!window.FirebaseService) {
    showAppNotification("Connecting to authentication service... Please try in a moment.", "info");
    return;
  }

  const result = await window.FirebaseService.signInWithGoogle();
  if (result.success) {
    SoundFX.playSuccess();
    showAppNotification(`Welcome back, ${result.user.name}! ♡`, "success");
    closeAuthModal();
  } else {
    if (result.code === 'auth/popup-closed-by-user') {
      showAppNotification("Sign-in popup was closed. Please try again when ready.", "info");
    } else if (result.code === 'auth/unauthorized-domain') {
      showAppNotification("Domain not authorized in Firebase Console. Please add localhost to Authorized Domains.", "error");
    } else {
      showAppNotification("Unable to sign in with Google. Please try again.", "error");
    }
  }
}

async function triggerSignOut() {
  SoundFX.playClick();
  const wrap = document.getElementById('user-profile-wrap');
  if (wrap) wrap.classList.remove('open');

  if (window.FirebaseService) {
    await window.FirebaseService.signOutCurrentUser();
    showAppNotification("Signed out successfully. See you again soon!", "info");
  }
}

function openAuthModal() {
  SoundFX.playClick();
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeAuthModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function closeAuthModalOnBackdrop(e) {
  if (e.target.id === 'auth-modal-overlay') {
    closeAuthModal();
  }
}

// ==========================================================================
// 4. DELIVERY LOCATION MANAGEMENT & GEOLOCATION
// ==========================================================================

function switchLocationTab(tabMode) {
  SoundFX.playClick();
  const gpsTabBtn = document.getElementById('loc-tab-gps-btn');
  const manualTabBtn = document.getElementById('loc-tab-manual-btn');
  const gpsPanel = document.getElementById('loc-panel-gps');
  const manualPanel = document.getElementById('loc-panel-manual');

  if (tabMode === 'gps') {
    if (gpsTabBtn) gpsTabBtn.classList.add('active');
    if (manualTabBtn) manualTabBtn.classList.remove('active');
    if (gpsPanel) gpsPanel.classList.add('active');
    if (manualPanel) manualPanel.classList.remove('active');
  } else {
    if (manualTabBtn) manualTabBtn.classList.add('active');
    if (gpsTabBtn) gpsTabBtn.classList.remove('active');
    if (manualPanel) manualPanel.classList.add('active');
    if (gpsPanel) gpsPanel.classList.remove('active');
  }
}

function openLocationModal() {
  SoundFX.playClick();
  const overlay = document.getElementById('location-modal-overlay');

  // Pre-fill manual form with current state if available
  const hNo = document.getElementById('manual-house-no');
  const area = document.getElementById('manual-area-street');
  const city = document.getElementById('manual-city');
  const state = document.getElementById('manual-state');
  const pincode = document.getElementById('manual-pincode');
  const landmark = document.getElementById('manual-landmark');

  if (hNo && AppState.location.houseNo) hNo.value = AppState.location.houseNo;
  if (area && AppState.location.areaStreet) area.value = AppState.location.areaStreet;
  if (city) city.value = AppState.location.city || 'Pilani';
  if (state) state.value = AppState.location.state || 'Rajasthan';
  if (pincode) pincode.value = AppState.location.pincode || '333031';
  if (landmark && AppState.location.landmark) landmark.value = AppState.location.landmark;

  // Reset GPS detected card
  const detectedCard = document.getElementById('detected-loc-card');
  const deniedAlert = document.getElementById('loc-denied-alert');
  if (detectedCard) detectedCard.style.display = 'none';
  if (deniedAlert) deniedAlert.style.display = 'none';

  if (overlay) overlay.classList.add('open');
}

function closeLocationModal() {
  const overlay = document.getElementById('location-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function closeLocationModalOnBackdrop(e) {
  if (e.target.id === 'location-modal-overlay') {
    closeLocationModal();
  }
}

/**
 * Option 1: Browser Geolocation on explicit user click (no continuous tracking)
 */
function getCurrentLocation() {
  SoundFX.playClick();
  if (!navigator.geolocation) {
    showAppNotification("Geolocation is not supported by your browser.", "error");
    return;
  }

  const gpsBtn = document.getElementById('btn-use-gps');
  const gpsText = document.getElementById('gps-btn-text');
  const detectedCard = document.getElementById('detected-loc-card');
  const detectedAddress = document.getElementById('detected-address-text');
  const detectedCoords = document.getElementById('detected-coords-text');
  const deniedAlert = document.getElementById('loc-denied-alert');

  if (deniedAlert) deniedAlert.style.display = 'none';
  if (gpsBtn) gpsBtn.classList.add('detecting');
  if (gpsText) gpsText.textContent = "Detecting current location... 🛰️";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      let resolvedAddress = "Pilani, Rajasthan 333031";

      // Reverse geocode via OpenStreetMap Nominatim
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          resolvedAddress = data.display_name;
        } else {
          resolvedAddress = `Near BKBIET Campus, Pilani, Rajasthan 333031`;
        }
      } catch (err) {
        resolvedAddress = `BKBIET Campus / Hostel Road, Pilani, Rajasthan 333031`;
      }

      AppState.tempGps = {
        address: resolvedAddress,
        houseNo: '',
        areaStreet: 'BKBIET Campus & Vicinity',
        city: 'Pilani',
        state: 'Rajasthan',
        pincode: '333031',
        landmark: '',
        latitude: lat,
        longitude: lng
      };

      if (detectedAddress) detectedAddress.textContent = resolvedAddress;
      if (detectedCoords) detectedCoords.textContent = `GPS Pin: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
      if (detectedCard) detectedCard.style.display = 'block';

      if (gpsBtn) gpsBtn.classList.remove('detecting');
      if (gpsText) gpsText.textContent = "📍 Location Detected ✓";
      
      SoundFX.playSuccess();
      showAppNotification("Location detected successfully! Please confirm to proceed.", "success");
    },
    (error) => {
      if (gpsBtn) gpsBtn.classList.remove('detecting');
      if (gpsText) gpsText.textContent = "📍 Use Current Location";
      
      if (error.code === 1) { // PERMISSION_DENIED
        if (deniedAlert) deniedAlert.style.display = 'flex';
        showAppNotification("Location permission was denied. Please enter your address manually.", "info");
        setTimeout(() => switchLocationTab('manual'), 1200);
      } else {
        showAppNotification("Could not detect location. Please type your address manually.", "info");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Confirm GPS location
 */
async function confirmGpsLocation() {
  if (!AppState.tempGps) {
    showAppNotification("Please detect your current location first.", "error");
    return;
  }

  AppState.location = { ...AppState.tempGps };
  AppState.user.address = AppState.tempGps.address;
  AppState.locationConfirmed = true;

  // Save to Firestore for logged-in user
  if (AppState.auth.isLoggedIn && window.FirebaseService) {
    await window.FirebaseService.updateUserLocation(AppState.auth.uid, AppState.location);
  }

  updateLiveUserDisplay();
  syncOrderSummary();
  closeLocationModal();
  SoundFX.playSuccess();
  showAppNotification("Location confirmed successfully! ♡", "success");

  // Move directly to Step 3 (Build Your Tiffin)
  navigateStepTo(3);
  const targetSection = document.getElementById('order-flow');
  if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Confirm Manual Address Form
 */
async function confirmManualLocation() {
  const houseNo = document.getElementById('manual-house-no')?.value.trim();
  const areaStreet = document.getElementById('manual-area-street')?.value.trim();
  const city = document.getElementById('manual-city')?.value.trim() || 'Pilani';
  const state = document.getElementById('manual-state')?.value.trim() || 'Rajasthan';
  const pincode = document.getElementById('manual-pincode')?.value.trim() || '333031';
  const landmark = document.getElementById('manual-landmark')?.value.trim() || '';

  if (!houseNo || !areaStreet || !city || !state || !pincode) {
    showAppNotification("Please fill in all required address fields.", "error");
    return;
  }

  const formattedAddress = `${houseNo}, ${areaStreet}${landmark ? ', Near ' + landmark : ''}, ${city}, ${state} - ${pincode}`;

  AppState.location = {
    address: formattedAddress,
    houseNo,
    areaStreet,
    city,
    state,
    pincode,
    landmark,
    latitude: 28.3615,
    longitude: 75.6015
  };

  AppState.user.address = formattedAddress;
  AppState.locationConfirmed = true;

  // Save to Firestore
  if (AppState.auth.isLoggedIn && window.FirebaseService) {
    await window.FirebaseService.updateUserLocation(AppState.auth.uid, AppState.location);
  }

  updateLiveUserDisplay();
  syncOrderSummary();
  closeLocationModal();
  SoundFX.playSuccess();
  showAppNotification("Delivery address confirmed successfully! ♡", "success");

  // Move directly to Step 3 (Build Your Tiffin)
  navigateStepTo(3);
  const targetSection = document.getElementById('order-flow');
  if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
}

function updateLiveUserDisplay() {
  const nameEl = document.getElementById('live-user-name');
  if (nameEl) nameEl.textContent = AppState.user.name;

  const addrEl = document.getElementById('live-user-address');
  if (addrEl) addrEl.textContent = AppState.user.address;

  const summaryCustomerEl = document.getElementById('summary-customer-name');
  if (summaryCustomerEl) summaryCustomerEl.textContent = AppState.user.name;
}

// ==========================================================================
// 5. MANUAL "BUILD YOUR TIFFIN" ENGINE (100% CUSTOMER CONTROLLED)
// ==========================================================================

/**
 * Render the entire manual tiffin customization interface dynamically from TIFFIN_CONFIG
 */
function renderTiffinBuilder() {
  const mount = document.getElementById('tiffin-builder-mount');
  if (!mount) return;

  const t = AppState.tiffinSelection;

  mount.innerHTML = `
    <!-- 1. DAL SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-bowl-rice"></i>
          <span>1. Choose Dal</span>
        </div>
        <span class="builder-category-badge">Select 1</span>
      </div>
      <div class="food-options-grid">
        ${TIFFIN_CONFIG.dalOptions.map(dal => {
          const isSelected = t.dal === dal.name;
          return `
            <div class="food-option-card ${isSelected ? 'selected' : ''}" onclick="selectTiffinDal('${dal.name}')">
              <div class="option-radio-circle">${isSelected ? '✓' : ''}</div>
              <span class="option-name-label">${dal.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 2. SABZI SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-carrot"></i>
          <span>2. Choose Sabzi</span>
        </div>
        <span class="builder-category-badge">Select 1</span>
      </div>
      <div class="food-options-grid">
        ${TIFFIN_CONFIG.sabziOptions.map(sabzi => {
          const isSelected = t.sabzi === sabzi.name;
          return `
            <div class="food-option-card ${isSelected ? 'selected' : ''}" onclick="selectTiffinSabzi('${sabzi.name}')">
              <div class="option-radio-circle">${isSelected ? '✓' : ''}</div>
              <span class="option-name-label">${sabzi.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 3. RICE SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-plate-wheat"></i>
          <span>3. Choose Rice</span>
        </div>
        <span class="builder-category-badge">Select 1</span>
      </div>
      <div class="food-options-grid">
        ${TIFFIN_CONFIG.riceOptions.map(rice => {
          const isSelected = t.rice === rice.name;
          return `
            <div class="food-option-card ${isSelected ? 'selected' : ''}" onclick="selectTiffinRice('${rice.name}')">
              <div class="option-radio-circle">${isSelected ? '✓' : ''}</div>
              <span class="option-name-label">${rice.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 4. ROTI SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-cookie"></i>
          <span>4. Choose Roti</span>
        </div>
        <span class="builder-category-badge">Select Portion</span>
      </div>
      <div class="food-options-grid">
        ${TIFFIN_CONFIG.rotiOptions.map(roti => {
          const isSelected = t.roti === roti.name;
          return `
            <div class="food-option-card ${isSelected ? 'selected' : ''}" onclick="selectTiffinRoti('${roti.name}')">
              <div class="option-radio-circle">${isSelected ? '✓' : ''}</div>
              <span class="option-name-label">${roti.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 5. SALAD SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-leaf"></i>
          <span>5. Choose Salad</span>
        </div>
        <span class="builder-category-badge">Select 1</span>
      </div>
      <div class="food-options-grid">
        ${TIFFIN_CONFIG.saladOptions.map(salad => {
          const isSelected = t.salad === salad.name;
          return `
            <div class="food-option-card ${isSelected ? 'selected' : ''}" onclick="selectTiffinSalad('${salad.name}')">
              <div class="option-radio-circle">${isSelected ? '✓' : ''}</div>
              <span class="option-name-label">${salad.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 6. EXTRAS SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-circle-plus"></i>
          <span>6. Add Extras (Optional)</span>
        </div>
        <span class="builder-category-badge" style="background: var(--bg-subtle); color: var(--text-secondary);">Add-ons</span>
      </div>
      <div class="extras-chips-grid">
        ${TIFFIN_CONFIG.extrasOptions.map(extra => {
          const isChecked = t.extras.some(e => e.id === extra.id);
          return `
            <div class="extra-option-chip ${isChecked ? 'selected' : ''}" onclick="toggleTiffinExtra('${extra.id}')">
              <div class="extra-chip-left">
                <div class="extra-check-box">${isChecked ? '✓' : ''}</div>
                <span>${extra.name}</span>
              </div>
              <div class="extra-chip-price">+₹${extra.price}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 7. QUANTITY SECTION -->
    <div class="builder-category-block">
      <div class="builder-category-header">
        <div class="builder-category-title">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>7. Tiffin Quantity</span>
        </div>
        <span class="builder-category-badge">Live Price</span>
      </div>
      <div class="qty-stepper-row">
        <div class="qty-stepper-label">Number of Tiffins:</div>
        <div class="qty-stepper-control">
          <button type="button" class="qty-btn-step" onclick="adjustTiffinQty(-1)">-</button>
          <span class="qty-display-val" id="builder-qty-val">${AppState.quantity}</span>
          <button type="button" class="qty-btn-step" onclick="adjustTiffinQty(1)">+</button>
        </div>
      </div>
    </div>
  `;

  syncOrderSummary();
}

// Selection Handlers
function selectTiffinDal(dalName) {
  SoundFX.playClick();
  AppState.tiffinSelection.dal = dalName;
  renderTiffinBuilder();
}

function selectTiffinSabzi(sabziName) {
  SoundFX.playClick();
  AppState.tiffinSelection.sabzi = sabziName;
  renderTiffinBuilder();
}

function selectTiffinRice(riceName) {
  SoundFX.playClick();
  AppState.tiffinSelection.rice = riceName;
  renderTiffinBuilder();
}

function selectTiffinRoti(rotiName) {
  SoundFX.playClick();
  AppState.tiffinSelection.roti = rotiName;
  renderTiffinBuilder();
}

function selectTiffinSalad(saladName) {
  SoundFX.playClick();
  AppState.tiffinSelection.salad = saladName;
  renderTiffinBuilder();
}

function toggleTiffinExtra(extraId) {
  SoundFX.playClick();
  const extraObj = TIFFIN_CONFIG.extrasOptions.find(e => e.id === extraId);
  if (!extraObj) return;

  const existingIndex = AppState.tiffinSelection.extras.findIndex(e => e.id === extraId);
  if (existingIndex >= 0) {
    AppState.tiffinSelection.extras.splice(existingIndex, 1);
  } else {
    AppState.tiffinSelection.extras.push({
      id: extraObj.id,
      name: extraObj.name,
      price: extraObj.price
    });
  }

  renderTiffinBuilder();
}

function adjustTiffinQty(delta) {
  SoundFX.playClick();
  let updated = AppState.quantity + delta;
  if (updated < 1) updated = 1;
  if (updated > 20) updated = 20;

  AppState.quantity = updated;
  
  const qtyEl = document.getElementById('builder-qty-val');
  if (qtyEl) qtyEl.textContent = updated;

  syncOrderSummary();
}

// Price Calculations
function calculateExtrasTotal() {
  return AppState.tiffinSelection.extras.reduce((sum, item) => sum + item.price, 0);
}

function calculateTotalAmount() {
  const base = TIFFIN_CONFIG.basePricePerTiffin;
  const extras = calculateExtrasTotal();
  const singleTiffinTotal = base + extras;
  return singleTiffinTotal * AppState.quantity;
}

// Sync Live Summaries (Step 3 banner & Step 5 review screen)
function syncOrderSummary() {
  const base = TIFFIN_CONFIG.basePricePerTiffin;
  const extras = calculateExtrasTotal();
  const total = calculateTotalAmount();
  const t = AppState.tiffinSelection;

  // 1. Update Step 3 Live Banner
  const liveTotalChip = document.getElementById('builder-live-total');
  if (liveTotalChip) {
    liveTotalChip.textContent = `₹${total} (${AppState.quantity} ${AppState.quantity > 1 ? 'Tiffins' : 'Tiffin'})`;
  }

  const livePillsContainer = document.getElementById('builder-live-pills');
  if (livePillsContainer) {
    const pills = [];
    if (t.dal) pills.push(`✓ ${t.dal}`);
    else pills.push(`• Select Dal`);

    if (t.sabzi) pills.push(`✓ ${t.sabzi}`);
    else pills.push(`• Select Sabzi`);

    if (t.rice) pills.push(`✓ ${t.rice}`);
    else pills.push(`• Select Rice`);

    if (t.roti) pills.push(`✓ ${t.roti}`);
    else pills.push(`• Select Roti`);

    if (t.salad) pills.push(`✓ ${t.salad}`);
    else pills.push(`• Select Salad`);

    t.extras.forEach(ext => {
      pills.push(`+ ${ext.name} (₹${ext.price})`);
    });

    livePillsContainer.innerHTML = pills.map(p => `<span class="live-item-pill">${p}</span>`).join('');
  }

  // 2. Update Step 5 Detailed Review Screen
  const customerNameEl = document.getElementById('summary-customer-name');
  if (customerNameEl) {
    customerNameEl.textContent = AppState.user.name || (AppState.auth.isLoggedIn ? AppState.auth.name : 'Customer');
  }

  const addrEl = document.getElementById('summary-address-text');
  if (addrEl) {
    const addr = AppState.location.address || 'Pilani, Rajasthan';
    addrEl.textContent = addr;
  }

  const dalVal = document.getElementById('summary-dal-val');
  if (dalVal) dalVal.textContent = t.dal || 'Not Selected';

  const sabziVal = document.getElementById('summary-sabzi-val');
  if (sabziVal) sabziVal.textContent = t.sabzi || 'Not Selected';

  const riceVal = document.getElementById('summary-rice-val');
  if (riceVal) riceVal.textContent = t.rice || 'Not Selected';

  const rotiVal = document.getElementById('summary-roti-val');
  if (rotiVal) rotiVal.textContent = t.roti || 'Not Selected';

  const saladVal = document.getElementById('summary-salad-val');
  if (saladVal) saladVal.textContent = t.salad || 'Not Selected';

  const extrasVal = document.getElementById('summary-extras-val');
  if (extrasVal) {
    if (t.extras.length > 0) {
      extrasVal.textContent = t.extras.map(e => `${e.name} (+₹${e.price})`).join(', ');
    } else {
      extrasVal.textContent = 'None';
    }
  }

  const qtyVal = document.getElementById('summary-quantity-val');
  if (qtyVal) {
    qtyVal.textContent = `${AppState.quantity} ${AppState.quantity > 1 ? 'Tiffins' : 'Tiffin'}`;
  }

  const timeVal = document.getElementById('summary-time-text');
  if (timeVal) {
    timeVal.textContent = AppState.deliveryTime.name;
  }

  const basePriceEl = document.getElementById('summary-base-price');
  if (basePriceEl) basePriceEl.textContent = `₹${base}`;

  const extrasPriceEl = document.getElementById('summary-extras-price');
  if (extrasPriceEl) extrasPriceEl.textContent = `₹${extras}`;

  const qtyMultiplierEl = document.getElementById('summary-qty-multiplier');
  if (qtyMultiplierEl) qtyMultiplierEl.textContent = `× ${AppState.quantity}`;

  const totalPriceEl = document.getElementById('summary-total-price');
  if (totalPriceEl) totalPriceEl.textContent = `₹${total}`;

  // 3. Update Step 6 Pay Button Text
  const btnPayText = document.getElementById('btn-pay-text');
  if (btnPayText) {
    if (AppState.paymentMethod === 'cod') {
      btnPayText.textContent = `Place COD Order (₹${total})`;
    } else {
      btnPayText.textContent = `Pay with UPI / QR (₹${total})`;
    }
  }
}

/**
 * Validate customer manual food selection before moving from Step 3 to Step 4
 */
function proceedFromTiffinBuilder() {
  const t = AppState.tiffinSelection;
  const missing = [];
  if (!t.dal) missing.push("Dal");
  if (!t.sabzi) missing.push("Sabzi");
  if (!t.rice) missing.push("Rice");
  if (!t.roti) missing.push("Roti");
  if (!t.salad) missing.push("Salad");

  if (missing.length > 0) {
    SoundFX.playClick();
    showAppNotification(`Please select your: ${missing.join(', ')}`, "error");
    return;
  }
  navigateStep(1);
}

// ==========================================================================
// 6. ORDER FLOW TRIGGER & STEP NAVIGATION
// ==========================================================================

function openOrderModal(step = 1) {
  SoundFX.playClick();

  // If not logged in -> Prompt Google Auth
  if (!AppState.auth.isLoggedIn) {
    AppState.pendingRedirectToLocation = true;
    openAuthModal();
    showAppNotification("Please sign in with Google to set your delivery location.", "info");
    return;
  }

  // If logged in but location is not confirmed -> Open Choose Location modal
  if (!AppState.locationConfirmed) {
    openLocationModal();
    return;
  }

  // Move directly to Step 3 (Build Your Tiffin)
  navigateStepTo(3);
  const targetSection = document.getElementById('order-flow');
  if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
}

function selectAppPlan(planId, price) {
  SoundFX.playClick();
  ['daily', 'weekly', 'monthly'].forEach(p => {
    const el = document.getElementById(`plan-opt-${p}`);
    if (el) {
      if (p === planId) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  });
  if (price) {
    TIFFIN_CONFIG.basePricePerTiffin = price;
  }
  syncOrderSummary();
}

function openOrderModalWithPlan(planId, price) {
  if (price) {
    TIFFIN_CONFIG.basePricePerTiffin = price;
  }
  selectAppPlan(planId, price);

  if (!AppState.auth.isLoggedIn) {
    AppState.pendingRedirectToLocation = true;
    openAuthModal();
    showAppNotification("Please sign in with Google to confirm your delivery location.", "info");
    return;
  }

  if (!AppState.locationConfirmed) {
    openLocationModal();
    return;
  }

  navigateStepTo(3); // Go straight to manual tiffin customization
  const targetSection = document.getElementById('order-flow');
  if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
}

function closeOrderModal() {
  const overlay = document.getElementById('order-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function closeModalOnBackdrop(e) {
  if (e.target.id === 'order-modal-overlay') {
    closeOrderModal();
  }
}

function navigateStep(delta) {
  SoundFX.playClick();
  let next = AppState.currentStep + delta;
  if (next < 1) next = 1;
  if (next > 8) next = 8;
  navigateStepTo(next);
}

function navigateStepTo(stepNumber) {
  SoundFX.playClick();
  AppState.currentStep = stepNumber;
  
  // Hide all screens in phone device
  for (let i = 1; i <= 8; i++) {
    const screen = document.getElementById(`app-screen-${i}`);
    if (screen) screen.classList.remove('active');
    
    const pill = document.getElementById(`pill-step-${i}`);
    if (pill) {
      pill.classList.remove('active');
      if (i < stepNumber) {
        pill.classList.add('completed');
      } else {
        pill.classList.remove('completed');
      }
    }
  }

  // Activate target screen & nav pill
  const activeScreen = document.getElementById(`app-screen-${stepNumber}`);
  if (activeScreen) activeScreen.classList.add('active');

  const activePill = document.getElementById(`pill-step-${stepNumber}`);
  if (activePill) activePill.classList.add('active');

  // Update Back button visibility
  const backBtn = document.getElementById('phone-btn-back');
  if (backBtn) {
    backBtn.style.visibility = (stepNumber === 1 || stepNumber === 7) ? 'hidden' : 'visible';
  }

  updateStepExplanation(stepNumber);

  if (stepNumber === 3) {
    renderTiffinBuilder();
  } else if (stepNumber === 5) {
    syncOrderSummary();
  }
}

// --- STEP EXPLANATION CONTENT MAP ---
const StepExplanations = {
  1: {
    title: "1. Smart Location Pinning",
    tip: "Fresh Food Coming Soon! ♡",
    desc: "Pin your hostel room or campus building for direct doorstep delivery with zero phone calls or confusion.",
    bullets: [
      "Automatic hostel and room number routing",
      "Saved addresses for 1-tap reordering",
      "Contactless handoff option at hostel gates"
    ]
  },
  2: {
    title: "2. Flexible Tiffin Plans",
    tip: "Best Value for You ♡",
    desc: "Choose between Daily trial, Weekly 7-day plan, or Monthly 30-day plan with massive discounts for college students.",
    bullets: [
      "Daily Tiffin: ₹70/day (Zero commitment)",
      "Weekly Plan: ₹65/day (Save ₹35/week)",
      "Monthly Plan: ₹60/day (Save ₹300/month)"
    ]
  },
  3: {
    title: "3. Build Your Tiffin (Manual Choice)",
    tip: "Just the Way You Like It ♡",
    desc: "Manually select your favorite Dal, Sabzi, Rice, Roti, Salad & Extras with live price and portion feedback.",
    bullets: [
      "Choose from 4 Dal and 5 Sabzi specialties",
      "Select Phulkas, Rice, and fresh Salad portions",
      "Delicious homemade Add-ons like Curd & Mango Pickle"
    ]
  },
  4: {
    title: "4. Precise Delivery Slots",
    tip: "Hot & Fresh Guarantee ♡",
    desc: "Choose when your tiffin is dispatched so it arrives steaming hot directly when you are ready to eat.",
    bullets: [
      "Lunch Slot: 12:00 PM – 2:00 PM (Sharp mess delivery)",
      "Dinner Slot: 7:00 PM – 9:00 PM (Fresh evening cooking)",
      "Both (Lunch + Dinner): Combo option with extra savings"
    ]
  },
  5: {
    title: "5. Transparent Order Summary",
    tip: "Zero Hidden Costs ♡",
    desc: "Review your manual food selections, address details, quantity, and live price breakdown before confirming.",
    bullets: [
      "Full item-by-item food breakdown",
      "Editable Tiffin, Location, Quantity & Delivery Time",
      "No delivery fee or extra packaging charges"
    ]
  },
  6: {
    title: "6. Secure Payment Options",
    tip: "100% Safe & Instant ♡",
    desc: "Pay securely via Cash on Delivery or UPI options with instant confirmation.",
    bullets: [
      "Cash on Delivery: Pay when hot food reaches your door",
      "UPI payment architecture ready for instant connection",
      "No card credentials stored on device"
    ]
  },
  7: {
    title: "7. Instant Order Confirmation",
    tip: "Thank You for Choosing Us ♡",
    desc: "Instant live receipt generated with order reference ID, exact food selections saved to Firestore database.",
    bullets: [
      "Live order reference ID saved to Firestore",
      "Automated kitchen dispatch ticket generated",
      "1-click button to track delivery progress"
    ]
  },
  8: {
    title: "8. Live Real-Time Order Tracker",
    tip: "Almost There! ♡",
    desc: "Follow your food in real time across all 4 stages: Order Confirmed, Food Being Prepared, Out on Scooter, and Delivered.",
    bullets: [
      "Live rider distance countdown and contact info",
      "Stainless steel tiffin swap alert",
      "Direct helpline to delivery partner"
    ]
  }
};

function updateStepExplanation(step) {
  const exp = StepExplanations[step];
  if (!exp) return;

  const titleEl = document.getElementById('exp-title');
  const tipEl = document.getElementById('exp-tip');
  const descEl = document.getElementById('exp-desc');
  const listEl = document.getElementById('exp-list');

  if (titleEl) titleEl.textContent = exp.title;
  if (tipEl) tipEl.textContent = exp.tip;
  if (descEl) descEl.textContent = exp.desc;
  
  if (listEl) {
    listEl.innerHTML = exp.bullets.map(b => `<li><span class="check-icon">✓</span> ${b}</li>`).join('');
  }
}

// --- DELIVERY TIME SELECTION ---
function selectTimeSlot(slotId) {
  SoundFX.playClick();
  AppState.deliveryTime.id = slotId;
  
  const slotMap = {
    lunch: 'Lunch (12:00 PM – 2:00 PM)',
    dinner: 'Dinner (7:00 PM – 9:00 PM)',
    both: 'Both (Lunch + Dinner)'
  };
  AppState.deliveryTime.name = slotMap[slotId] || slotId;

  ['lunch', 'dinner', 'both'].forEach(s => {
    const el = document.getElementById(`slot-${s}`);
    if (el) {
      if (s === slotId) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  });

  syncOrderSummary();
}

// --- PAYMENT METHOD SELECTION ---
function selectPaymentMethod(methodId) {
  SoundFX.playClick();
  AppState.paymentMethod = methodId;

  ['cod', 'upi'].forEach(m => {
    const el = document.getElementById(`pay-opt-${m}`);
    if (el) {
      if (m === methodId) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  });

  const infoCod = document.getElementById('info-cod-text');
  const infoUpi = document.getElementById('info-upi-text');

  if (methodId === 'cod') {
    if (infoCod) infoCod.style.display = 'block';
    if (infoUpi) infoUpi.style.display = 'none';
  } else {
    if (infoCod) infoCod.style.display = 'none';
    if (infoUpi) infoUpi.style.display = 'block';
  }

  syncOrderSummary();
}

// ==========================================================================
// 7. PLACE ORDER & RAZORPAY CHECKOUT INTEGRATION
// ==========================================================================

async function executeMockPayment() {
  SoundFX.playClick();

  const btnPay = document.getElementById('btn-pay-text');

  // 1. Enforce Authentication with active Firebase user
  const activeFirebaseUser = window.FirebaseService?.auth?.currentUser;
  console.log("[TiffinWala] Placing order... Current Firebase Auth user:", activeFirebaseUser ? {
    uid: activeFirebaseUser.uid,
    email: activeFirebaseUser.email,
    displayName: activeFirebaseUser.displayName
  } : "NULL (User is not signed in)");

  if (!AppState.auth.isLoggedIn || !AppState.auth.uid || !activeFirebaseUser) {
    console.warn("[TiffinWala] Order blocked: User is not logged in with Firebase Google Auth.");
    AppState.pendingRedirectToLocation = true;
    openAuthModal();
    showAppNotification("Please sign in with Google (top right) to place your order.", "info", 5000);
    return;
  }

  // 2. Enforce Location Confirmation
  if (!AppState.locationConfirmed || !AppState.location.address) {
    openLocationModal();
    showAppNotification("Please confirm your delivery location before placing the order.", "error");
    return;
  }

  // 3. Validate Manual Food Selections
  const t = AppState.tiffinSelection;
  if (!t.dal || !t.sabzi || !t.rice || !t.roti || !t.salad) {
    showAppNotification("Please manually select Dal, Sabzi, Rice, Roti, and Salad before ordering.", "error");
    navigateStepTo(3);
    return;
  }

  // 4. Validate Delivery Time
  if (!AppState.deliveryTime || !AppState.deliveryTime.name) {
    showAppNotification("Please select a delivery time slot.", "error");
    navigateStepTo(4);
    return;
  }

  // 5. Validate Firebase Service readiness
  if (!window.FirebaseService) {
    showAppNotification("Connecting to Firestore database... Please try again.", "info");
    return;
  }

  const isCOD = AppState.paymentMethod === 'cod';
  const subtotal = TIFFIN_CONFIG.basePricePerTiffin;
  const extrasPrice = calculateExtrasTotal();
  const totalPrice = calculateTotalAmount();
  const amountInPaise = Math.round(totalPrice * 100);

  // Base Order Payload matching required schema
  const baseOrderPayload = {
    userId: AppState.auth.uid,
    customerName: AppState.user.name || AppState.auth.name || 'Customer',
    customerEmail: AppState.auth.email || '',

    location: {
      address: AppState.location.address || '',
      city: AppState.location.city || 'Pilani',
      state: AppState.location.state || 'Rajasthan',
      pincode: AppState.location.pincode || '333031',
      landmark: AppState.location.landmark || '',
      latitude: AppState.location.latitude !== undefined ? AppState.location.latitude : null,
      longitude: AppState.location.longitude !== undefined ? AppState.location.longitude : null
    },

    tiffin: {
      dal: t.dal,
      sabzi: t.sabzi,
      rice: t.rice,
      roti: t.roti,
      salad: t.salad,
      extras: t.extras.map(e => ({ name: e.name, price: e.price }))
    },

    quantity: AppState.quantity,
    deliveryTime: AppState.deliveryTime.name,

    pricing: {
      subtotal: subtotal,
      extras: extrasPrice,
      totalPrice: totalPrice
    },

    orderStatus: "Confirmed"
  };

  // --- BRANCH A: CASH ON DELIVERY (COD) ---
  if (isCOD) {
    if (btnPay) btnPay.textContent = 'Saving COD Order to Firestore... 🔒';
    console.log("Saving COD order to Firestore...");

    try {
      const codOrderPayload = {
        ...baseOrderPayload,
        paymentMethod: 'COD',
        paymentStatus: 'COD',
        orderStatus: 'Confirmed'
      };

      await processAndConfirmFirestoreOrder(codOrderPayload, 'COD (Pay on Delivery)');
    } catch (error) {
      console.error("Firestore order error:", error);
      if (btnPay) btnPay.textContent = `Place COD Order (₹${totalPrice})`;
      let userFriendlyMsg = error.message || "Could not save order. Please try again.";
      showAppNotification(`❌ Order Failed: ${userFriendlyMsg}`, "error", 6000);
    }
    return;
  }

/**
 * Robust helper for invoking Razorpay Serverless Netlify Functions / Backend API.
 * Prevents HTML/JSON parse crashes, validates response headers, and returns clean errors.
 */
async function callBackendApi(endpoint, payload) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (netErr) {
    throw new Error(`Could not connect to backend server (${endpoint}): ${netErr.message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Backend returned invalid JSON: ${parseErr.message}`);
    }
  } else {
    // Backend returned HTML or plain text (e.g., Netlify static 404 fallback)
    const rawText = await response.text();
    const cleanSnippet = rawText.replace(/<[^>]*>?/gm, '').trim().substring(0, 120);
    throw new Error(`Backend endpoint (${endpoint}) returned non-JSON response [Status ${response.status}]: ${cleanSnippet || 'Serverless function not active or endpoint not found.'}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data?.error || `Request failed with HTTP status ${response.status}`);
  }

  return data;
}

  // --- BRANCH B: ONLINE PAYMENT VIA RAZORPAY STANDARD CHECKOUT (UPI / QR / ONLINE) ---
  if (btnPay) btnPay.textContent = 'Generating Razorpay Test Order... 💳';

  try {
    // 1. Check if Razorpay SDK script is loaded
    if (typeof window.Razorpay === 'undefined') {
      throw new Error("Razorpay Checkout SDK is not loaded. Please check your internet connection.");
    }

    // 2. Call backend POST /.netlify/functions/create-razorpay-order
    console.log(`[Razorpay] Creating backend order for ₹${totalPrice} (${amountInPaise} paise)...`);
    const orderData = await callBackendApi('/.netlify/functions/create-razorpay-order', {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    if (!orderData || !orderData.order_id) {
      throw new Error(orderData.error || "Failed to create Razorpay payment order on server.");
    }

    console.log(`[Razorpay] Server returned Order ID: ${orderData.order_id}`);
    if (btnPay) btnPay.textContent = 'Waiting for Payment in Razorpay... 📱';

    // 3. Configure Razorpay Standard Checkout options with UPI / QR support
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'TiffinWala',
      description: `${AppState.quantity}x Homemade Tiffin (${t.dal}, ${t.sabzi})`,
      image: 'assets/hero_delivery.jpg',
      order_id: orderData.order_id,
      prefill: {
        name: AppState.user.name || AppState.auth.name || 'Customer',
        email: AppState.auth.email || '',
        contact: AppState.user.phone || '+919876543210'
      },
      notes: {
        address: AppState.location.address || 'Pilani',
        deliveryTime: AppState.deliveryTime.name || 'Lunch',
        tiffinQuantity: String(AppState.quantity)
      },
      theme: {
        color: '#f25c05'
      },
      modal: {
        ondismiss: function () {
          console.log("[Razorpay] Checkout modal closed by user without completing payment.");
          showAppNotification("Payment cancelled. You can retry or choose COD.", "info", 4000);
          if (btnPay) btnPay.textContent = `Pay with UPI / QR (₹${totalPrice})`;
        },
        escape: true,
        backdropclose: false
      },
      handler: async function (response) {
        console.log("[Razorpay] Payment submitted by user. Verifying signature on server...", response);
        if (btnPay) btnPay.textContent = 'Verifying Payment with Server... 🔒';

        try {
          // 4. Call backend POST /.netlify/functions/verify-razorpay-payment
          const verifyData = await callBackendApi('/.netlify/functions/verify-razorpay-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          console.log("[Razorpay] ✓ Payment signature verified successfully!", verifyData);

          // 5. Save order to Firestore only after verified payment
          const paidOrderPayload = {
            ...baseOrderPayload,
            paymentMethod: 'Razorpay',
            paymentStatus: 'Paid',
            orderStatus: 'Confirmed',
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          };

          console.log("Saving paid order to Firestore...");
          await processAndConfirmFirestoreOrder(paidOrderPayload, `Paid via Razorpay (ID: ${response.razorpay_payment_id})`);

        } catch (err) {
          console.error("[Razorpay] Verification/Firestore error:", err);
          if (btnPay) btnPay.textContent = `Pay with UPI / QR (₹${totalPrice})`;
          showAppNotification(`❌ Payment Verification Failed: ${err.message}`, "error", 6000);
        }
      }
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response) {
      console.error("[Razorpay] Payment failed:", response.error);
      const failReason = response.error?.description || response.error?.reason || 'Payment could not be completed.';
      showAppNotification(`❌ Payment Failed: ${failReason}. Please try again.`, "error", 6000);
      if (btnPay) btnPay.textContent = `Pay with UPI / QR (₹${totalPrice})`;
    });

    rzp.open();

  } catch (error) {
    console.error("[Razorpay] Initialization error:", error);
    if (btnPay) btnPay.textContent = `Pay with UPI / QR (₹${totalPrice})`;
    showAppNotification(`❌ Could not open payment checkout: ${error.message}`, "error", 6000);
  }
}

/**
 * Shared helper to save order in Firestore and display Step 7 Confirmation screen
 */
async function processAndConfirmFirestoreOrder(orderPayload, paymentDisplayStatus) {
  const btnPay = document.getElementById('btn-pay-text');
  const t = AppState.tiffinSelection;
  const totalPrice = calculateTotalAmount();

  const result = await window.FirebaseService.createOrder(orderPayload);
  
  if (!result || !result.success || !result.orderId) {
    throw new Error(result?.message || "Failed to receive write confirmation from Firestore.");
  }

  console.log("Order saved successfully: " + result.orderId);

  const firestoreId = result.orderId;
  const formattedId = '#TW-' + firestoreId.substring(0, 6).toUpperCase();
  AppState.currentFirestoreOrderId = firestoreId;
  AppState.orderId = formattedId;

  // Attach live updates to Step 8 tracker
  if (AppState.activeOrderListenerUnsub) {
    AppState.activeOrderListenerUnsub();
  }
  AppState.activeOrderListenerUnsub = window.FirebaseService.listenToOrderUpdates(
    firestoreId,
    (updatedOrder) => {
      if (updatedOrder) {
        updateTrackingTimeline(updatedOrder.orderStatus || updatedOrder.status || 'Confirmed');
      }
    }
  );

  SoundFX.playSuccess();
  
  // Update Step 7 Order Confirmation screen
  const orderIdEl = document.getElementById('confirmed-order-id');
  if (orderIdEl) orderIdEl.textContent = formattedId;

  const paymentStatusEl = document.getElementById('confirmed-payment-status');
  if (paymentStatusEl) paymentStatusEl.textContent = paymentDisplayStatus || orderPayload.paymentMethod || 'Confirmed';

  const mealEl = document.getElementById('confirmed-meal-text');
  if (mealEl) {
    let extrasStr = t.extras.map(e => e.name).join(', ');
    mealEl.textContent = `${t.dal}, ${t.sabzi}, ${t.rice}, ${t.roti}, ${t.salad}${extrasStr ? ', ' + extrasStr : ''}`;
  }

  const qtyEl = document.getElementById('confirmed-qty-text');
  if (qtyEl) qtyEl.textContent = `${AppState.quantity} ${AppState.quantity > 1 ? 'Tiffins' : 'Tiffin'}`;

  const addrEl = document.getElementById('confirmed-address-text');
  if (addrEl) addrEl.textContent = AppState.location.address;

  const timeSlotEl = document.getElementById('confirmed-time-slot');
  if (timeSlotEl) timeSlotEl.textContent = AppState.deliveryTime.name;

  const priceEl = document.getElementById('confirmed-price-text');
  if (priceEl) priceEl.textContent = `₹${totalPrice}`;

  const statusBadge = document.getElementById('confirmed-status-badge');
  if (statusBadge) statusBadge.textContent = 'Confirmed';

  if (btnPay) {
    if (AppState.paymentMethod === 'cod') {
      btnPay.textContent = `Place COD Order (₹${totalPrice})`;
    } else {
      btnPay.textContent = `Pay with UPI / QR (₹${totalPrice})`;
    }
  }

  navigateStepTo(7);
  
  const successTitle = orderPayload.paymentMethod === 'Razorpay' 
    ? `🎉 Payment Successful / Order Placed! (Ref: ${formattedId})`
    : `🎉 Order Placed Successfully! (Ref: ${formattedId})`;
  showAppNotification(successTitle, "success", 5000);
}

function editAddressPrompt() {
  openLocationModal();
}

function simulateRiderCall() {
  SoundFX.playClick();
  alert("📞 Connecting to Rajesh Kumar (Delivery Partner - 🛵 PB 02 AX 2024)... 'Hello! I am just 5 minutes away from your hostel gate!'");
}

// ==========================================================================
// 8. MY ORDERS & REAL-TIME ORDER HISTORY ENGINE
// ==========================================================================
let userOrdersListenerUnsub = null;

function openOrdersModal() {
  SoundFX.playClick();

  const wrap = document.getElementById('user-profile-wrap');
  if (wrap) wrap.classList.remove('open');

  if (!AppState.auth.isLoggedIn || !AppState.auth.uid) {
    openAuthModal();
    showAppNotification("Please sign in with Google to view your order history.", "info");
    return;
  }

  const overlay = document.getElementById('orders-modal-overlay');
  if (overlay) overlay.classList.add('open');

  attachUserOrdersListener();
}

function closeOrdersModal() {
  const overlay = document.getElementById('orders-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  if (userOrdersListenerUnsub) {
    userOrdersListenerUnsub();
    userOrdersListenerUnsub = null;
  }
}

function closeOrdersModalOnBackdrop(e) {
  if (e.target.id === 'orders-modal-overlay') {
    closeOrdersModal();
  }
}

function attachUserOrdersListener() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 30px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
      <p style="margin-top: 10px; color: var(--text-secondary);">Loading your orders from Firestore...</p>
    </div>
  `;

  if (!window.FirebaseService || !AppState.auth.uid) {
    container.innerHTML = `<div class="orders-empty-state"><p>Firestore is initializing...</p></div>`;
    return;
  }

  if (userOrdersListenerUnsub) {
    userOrdersListenerUnsub();
  }

  userOrdersListenerUnsub = window.FirebaseService.listenToUserOrders(AppState.auth.uid, (orders) => {
    renderUserOrdersList(orders);
  });
}

function renderUserOrdersList(orders) {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="orders-empty-state">
        <div class="orders-empty-icon"><i class="fa-solid fa-box-open"></i></div>
        <h4 style="margin-bottom: 6px;">No orders placed yet</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">Enjoy healthy homemade food delivered right to your doorstep!</p>
        <button class="btn-primary" onclick="closeOrdersModal(); openOrderModal(3);">
          <span>Build Your First Tiffin</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map((ord) => {
    const orderRefId = '#TW-' + (ord.id ? ord.id.substring(0, 6).toUpperCase() : 'ORD');
    let orderDateFormatted = 'Recent order';
    if (ord.createdAt) {
      const d = ord.createdAt.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt);
      orderDateFormatted = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const orderStatus = ord.orderStatus || ord.status || 'Confirmed';
    let statusBadgeClass = 'status-confirmed';
    if (orderStatus === 'Preparing') statusBadgeClass = 'status-preparing';
    else if (orderStatus === 'Out for Delivery') statusBadgeClass = 'status-out-for-delivery';
    else if (orderStatus === 'Delivered') statusBadgeClass = 'status-delivered';
    else if (orderStatus === 'Cancelled') statusBadgeClass = 'status-cancelled';

    // Format exact tiffin items
    let tiffinItemsList = [];
    if (ord.tiffin) {
      if (ord.tiffin.dal) tiffinItemsList.push(ord.tiffin.dal);
      if (ord.tiffin.sabzi) tiffinItemsList.push(ord.tiffin.sabzi);
      if (ord.tiffin.rice) tiffinItemsList.push(ord.tiffin.rice);
      if (ord.tiffin.roti) tiffinItemsList.push(ord.tiffin.roti);
      if (ord.tiffin.salad) tiffinItemsList.push(ord.tiffin.salad);
      if (ord.tiffin.extras && ord.tiffin.extras.length > 0) {
        const extraNames = ord.tiffin.extras.map(e => e.name || e).join(', ');
        tiffinItemsList.push(`Extras: ${extraNames}`);
      }
    } else if (ord.meal) {
      tiffinItemsList.push(`Roti (${ord.meal.roti || 2}), Rice (${ord.meal.rice || 1}), Dal (${ord.meal.dal || 1}), Sabzi (${ord.meal.sabzi || 1})`);
    } else {
      tiffinItemsList.push('Fresh Home-style Tiffin');
    }

    const qty = ord.quantity || 1;
    const price = ord.pricing?.totalPrice !== undefined ? ord.pricing.totalPrice : (ord.pricing?.total !== undefined ? ord.pricing.total : (ord.price || 70));
    const deliveryAddr = ord.location?.address || ord.address || 'Pilani Campus';
    const paymentMethod = ord.paymentMethod || 'COD';
    const paymentStatus = ord.paymentStatus || (paymentMethod === 'COD' ? 'COD' : 'Pending');

    return `
      <div class="order-history-card">
        <div class="order-card-header">
          <div>
            <div class="order-id-title">${orderRefId}</div>
            <div class="order-date-text"><i class="fa-regular fa-calendar"></i> ${orderDateFormatted}</div>
          </div>
          <span class="order-status-badge ${statusBadgeClass}">${orderStatus}</span>
        </div>

        <div class="order-card-body">
          <div class="order-detail-row">
            <span class="order-detail-label">Food Items:</span>
            <span class="order-detail-val" style="font-weight: 700; color: #2d231e;">${tiffinItemsList.join(' • ')}</span>
          </div>
          <div class="order-detail-row">
            <span class="order-detail-label">Quantity:</span>
            <span class="order-detail-val"><strong>${qty} ${qty > 1 ? 'Tiffins' : 'Tiffin'}</strong></span>
          </div>
          <div class="order-detail-row">
            <span class="order-detail-label">Payment:</span>
            <span class="order-detail-val">${paymentMethod} (${paymentStatus})</span>
          </div>
          <div class="order-detail-row">
            <span class="order-detail-label">Delivery Address:</span>
            <span class="order-detail-val" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${deliveryAddr}</span>
          </div>
        </div>

        <div class="order-card-footer">
          <div class="order-price-total">₹${price}</div>
          <button class="btn-track-mini" onclick="trackSpecificOrder('${ord.id}', '${orderStatus}', '${ord.deliveryTime?.name || ord.deliveryTime || ''}')">
            <i class="fa-solid fa-location-crosshairs"></i>
            <span>Track Order</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function trackSpecificOrder(orderId, status, timeSlot) {
  closeOrdersModal();
  AppState.currentFirestoreOrderId = orderId;
  AppState.orderId = '#TW-' + (orderId ? orderId.substring(0, 6).toUpperCase() : 'ORD');
  
  const orderIdEl = document.getElementById('confirmed-order-id');
  if (orderIdEl) orderIdEl.textContent = AppState.orderId;

  if (timeSlot) {
    const timeSlotEl = document.getElementById('confirmed-time-slot');
    if (timeSlotEl) timeSlotEl.textContent = timeSlot;
  }

  updateTrackingTimeline(status);

  // Attach real-time Firestore listener for this order so admin updates reflect automatically
  if (AppState.activeOrderListenerUnsub) {
    AppState.activeOrderListenerUnsub();
  }
  if (window.FirebaseService) {
    AppState.activeOrderListenerUnsub = window.FirebaseService.listenToOrderUpdates(
      orderId,
      (updatedOrder) => {
        if (updatedOrder) {
          updateTrackingTimeline(updatedOrder.orderStatus || updatedOrder.status || 'Confirmed');
        }
      }
    );
  }

  navigateStepTo(8);

  const targetSection = document.getElementById('order-flow');
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function updateTrackingTimeline(status = 'Confirmed') {
  const timeline = document.querySelector('.tracking-timeline');
  if (!timeline) return;

  const events = timeline.querySelectorAll('.timeline-event');
  if (!events || events.length < 4) return;

  events.forEach(ev => {
    ev.classList.remove('completed', 'active');
  });

  const statusBadge = document.getElementById('confirmed-status-badge');
  if (statusBadge) {
    statusBadge.textContent = status;
    statusBadge.className = `order-status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  if (status === 'Confirmed') {
    events[0].classList.add('completed');
    events[1].classList.add('active');
  } else if (status === 'Preparing') {
    events[0].classList.add('completed');
    events[1].classList.add('completed');
    events[2].classList.add('active');
  } else if (status === 'Out for Delivery') {
    events[0].classList.add('completed');
    events[1].classList.add('completed');
    events[2].classList.add('completed');
    events[3].classList.add('active');
  } else if (status === 'Delivered') {
    events.forEach(ev => ev.classList.add('completed'));
  }
}

// ==========================================================================
// 9. NOTIFICATION & TOAST ALERT SYSTEM
// ==========================================================================
let appToastTimer = null;

function showAppNotification(message, type = 'info', duration = 4000) {
  const toastEl = document.getElementById('app-alert-toast');
  const msgEl = document.getElementById('app-alert-message');
  if (!toastEl || !msgEl) return;

  if (appToastTimer) clearTimeout(appToastTimer);

  msgEl.textContent = message;
  toastEl.className = `app-alert-toast toast-${type} show`;

  const iconEl = toastEl.querySelector('.alert-toast-icon i');
  if (iconEl) {
    if (type === 'success') iconEl.className = 'fa-solid fa-circle-check';
    else if (type === 'error') iconEl.className = 'fa-solid fa-circle-exclamation';
    else iconEl.className = 'fa-solid fa-circle-info';
  }

  appToastTimer = setTimeout(() => {
    hideAppNotification();
  }, duration);
}

function hideAppNotification() {
  const toastEl = document.getElementById('app-alert-toast');
  if (toastEl) {
    toastEl.classList.remove('show');
  }
}

// ==========================================================================
// 10. WEEKLY MENU FILTERING & ACTIONS
// ==========================================================================
function filterMenuDays(dayKey, btn) {
  SoundFX.playClick();
  
  const filterBtns = document.querySelectorAll('.day-filter-btn');
  filterBtns.forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const cards = document.querySelectorAll('.menu-day-card');
  cards.forEach(card => {
    if (dayKey === 'all') {
      card.style.display = 'flex';
    } else {
      const cardDay = card.getAttribute('data-day-item');
      if (cardDay === dayKey) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    }
  });
}

function orderDaySpecific(dayName) {
  SoundFX.playClick();
  openOrderModal(3);
}

// ==========================================================================
// 11. SAVINGS CALCULATOR
// ==========================================================================
function recalcSavings() {
  const mealsSlider = document.getElementById('calc-meals-slider');
  const daysSlider = document.getElementById('calc-days-slider');
  if (!mealsSlider || !daysSlider) return;
  
  const mealsCount = parseInt(mealsSlider.value, 10);
  const daysCount = parseInt(daysSlider.value, 10);

  const mealsLabel = document.getElementById('calc-meals-label');
  const daysLabel = document.getElementById('calc-days-label');
  const savingsVal = document.getElementById('calc-savings-val');

  if (mealsLabel) mealsLabel.textContent = mealsCount === 1 ? '1 Meal (Lunch)' : '2 Meals (Lunch + Dinner)';
  if (daysLabel) daysLabel.textContent = `${daysCount} Days / week`;

  const monthlyMeals = mealsCount * daysCount * 4.3;
  const totalSavings = Math.round(monthlyMeals * 65);

  if (savingsVal) {
    savingsVal.textContent = `₹${totalSavings.toLocaleString()}`;
  }
}

// ==========================================================================
// 12. FAQ ACCORDION
// ==========================================================================
function toggleFaq(headerEl) {
  SoundFX.playClick();
  const parent = headerEl.parentElement;
  if (parent) {
    parent.classList.toggle('open');
  }
}

// ==========================================================================
// 13. REAL CUSTOMER REVIEWS ENGINE (Starts at averageRating = 0, reviewCount = 0)
// ==========================================================================
let currentSelectedRating = 5;

function setReviewRating(rating) {
  SoundFX.playClick();
  currentSelectedRating = Number(rating);
  
  const starBtns = document.querySelectorAll('#star-rating-selector .star-picker-btn');
  starBtns.forEach(btn => {
    const btnRating = Number(btn.getAttribute('data-rating'));
    if (btnRating <= currentSelectedRating) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });

  const feedbackText = document.getElementById('rating-text-feedback');
  if (feedbackText) {
    const labels = {
      1: "1.0 — Needs Major Improvement",
      2: "2.0 — Fair / Below Average",
      3: "3.0 — Good Homemade Food",
      4: "4.0 — Very Tasty & Fresh",
      5: "5.0 — Excellent Homemade Food!"
    };
    feedbackText.textContent = labels[currentSelectedRating] || `${currentSelectedRating}.0 Rating`;
  }
}

function openReviewModal() {
  SoundFX.playClick();

  if (!AppState.auth.isLoggedIn) {
    openAuthModal();
    showAppNotification("Please sign in with Google to submit a verified customer review.", "info");
    return;
  }

  const overlay = document.getElementById('review-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeReviewModal() {
  const overlay = document.getElementById('review-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function closeReviewModalOnBackdrop(e) {
  if (e.target.id === 'review-modal-overlay') {
    closeReviewModal();
  }
}

async function handleReviewSubmit() {
  SoundFX.playClick();

  if (!AppState.auth.isLoggedIn) {
    openAuthModal();
    showAppNotification("Please sign in to write a review.", "info");
    return;
  }

  const commentEl = document.getElementById('review-comment');
  const planTagEl = document.getElementById('review-plan-tag');
  const btnSubmit = document.getElementById('btn-submit-review-action');

  const comment = commentEl ? commentEl.value.trim() : '';
  const planTag = planTagEl ? planTagEl.value : 'Custom Tiffin Order';

  if (!comment) {
    showAppNotification("Please write a few words about your meal.", "error");
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>Submitting Review...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
  }

  try {
    if (!window.FirebaseService) {
      throw new Error("Firebase Service is not available.");
    }

    const result = await window.FirebaseService.submitCustomerReview({
      rating: currentSelectedRating,
      comment: comment,
      planTag: planTag
    });

    if (result && result.success) {
      SoundFX.playSuccess();
      showAppNotification("🎉 Thank you! Your review has been published.", "success");
      if (commentEl) commentEl.value = '';
      closeReviewModal();
    } else {
      throw new Error(result?.message || "Could not publish review.");
    }
  } catch (error) {
    console.error("Review submission error:", error);
    showAppNotification(`❌ Failed to submit review: ${error.message || 'Please try again'}`, "error");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Submit Review</span> <i class="fa-solid fa-paper-plane"></i>`;
    }
  }
}

function generateStarsString(ratingNum) {
  const r = Math.round(Number(ratingNum) || 0);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= r ? '★' : '☆';
  }
  return stars;
}

function renderRealReviews(reviewsList) {
  const container = document.getElementById('reviews-list-container');
  const avgRatingEl = document.getElementById('reviews-avg-rating');
  const starsVisualEl = document.getElementById('reviews-stars-visual');
  const countBadgeEl = document.getElementById('reviews-count-badge');
  const heroAvgEl = document.getElementById('hero-avg-rating');
  const heroStarsEl = document.getElementById('hero-stars-display');
  const heroCountEl = document.getElementById('hero-review-count');

  if (!reviewsList || reviewsList.length === 0) {
    // Initial / Empty State: starts with averageRating = 0, reviewCount = 0
    if (avgRatingEl) avgRatingEl.textContent = '0.0';
    if (starsVisualEl) starsVisualEl.textContent = '☆☆☆☆☆';
    if (countBadgeEl) countBadgeEl.textContent = '0';
    if (heroAvgEl) heroAvgEl.textContent = '0.0';
    if (heroStarsEl) heroStarsEl.textContent = '☆☆☆☆☆';
    if (heroCountEl) heroCountEl.textContent = '0';

    if (container) {
      container.innerHTML = `
        <div class="reviews-empty-state">
          <div class="reviews-empty-icon">
            <i class="fa-regular fa-comment-dots"></i>
          </div>
          <h4 class="reviews-empty-title">No Reviews Yet</h4>
          <p class="reviews-empty-subtext">
            Be the first verified customer to share your homemade food review after enjoying your meal!
          </p>
          <button class="btn-primary" onclick="openReviewModal()">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Write the First Review</span>
          </button>
        </div>
      `;
    }
    return;
  }

  // Calculate real average rating & review count
  const count = reviewsList.length;
  const totalRatingSum = reviewsList.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const avg = (totalRatingSum / count).toFixed(1);
  const starsStr = generateStarsString(avg);

  if (avgRatingEl) avgRatingEl.textContent = avg;
  if (starsVisualEl) starsVisualEl.textContent = starsStr;
  if (countBadgeEl) countBadgeEl.textContent = `${count}`;
  if (heroAvgEl) heroAvgEl.textContent = avg;
  if (heroStarsEl) heroStarsEl.textContent = starsStr;
  if (heroCountEl) heroCountEl.textContent = `${count}`;

  if (container) {
    container.innerHTML = reviewsList.map(rev => {
      const name = rev.customerName || 'Verified Customer';
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const rating = Number(rev.rating) || 5;
      const starsDisplay = generateStarsString(rating);
      const planTag = rev.planTag || 'Custom Tiffin Order';
      const comment = rev.comment || '';

      let formattedDate = 'Verified Customer';
      if (rev.createdAt) {
        const d = rev.createdAt.toDate ? rev.createdAt.toDate() : new Date(rev.createdAt);
        formattedDate = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      const avatarHtml = rev.photoURL 
        ? `<img src="${rev.photoURL}" class="student-avatar" style="object-fit: cover; border-radius: 50%;" alt="${name}" referrerpolicy="no-referrer">`
        : `<div class="student-avatar">${initials}</div>`;

      return `
        <div class="review-card">
          <div class="review-card-top">
            <div class="student-profile">
              ${avatarHtml}
              <div>
                <div class="student-name-row">
                  <span class="student-name">${name}</span>
                  <i class="fa-solid fa-circle-check verified-icon" title="Verified Customer"></i>
                </div>
                <div class="student-college">${formattedDate}</div>
              </div>
            </div>
            <div class="rating-stars" style="color: #f59e0b; font-weight: 800;">${starsDisplay} ${rating}.0</div>
          </div>
          <p class="review-quote">
            "${comment}"
          </p>
          <div class="review-card-bottom">
            <span class="plan-ordered-pill">
              <i class="fa-solid fa-check"></i> ${planTag}
            </span>
            <div class="review-meal-thumb">
              <img src="assets/thali_classic.jpg" alt="TiffinWala Meal">
            </div>
          </div>
          <span class="review-doodle">♡</span>
        </div>
      `;
    }).join('');
  }
}

function initRealReviewsEngine() {
  if (window.FirebaseService && window.FirebaseService.listenToReviews) {
    window.FirebaseService.listenToReviews(renderRealReviews);
  } else {
    window.addEventListener('FirebaseServiceReady', () => {
      if (window.FirebaseService && window.FirebaseService.listenToReviews) {
        window.FirebaseService.listenToReviews(renderRealReviews);
      }
    }, { once: true });
  }
}

// ==========================================================================
// 14. INITIALIZATION & EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      SoundFX.playClick();
      navMenu.classList.toggle('open');
    });
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu) navMenu.classList.remove('open');
    });
  });

  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (navbar) {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Initialize UI components & real reviews engine (No fake social proof toasts)
  recalcSavings();
  renderTiffinBuilder();
  initFirebaseAuthListener();
  initRealReviewsEngine();

  // Throttled scroll listener using requestAnimationFrame to prevent mobile scroll lag
  let isScrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!isScrollTicking) {
      window.requestAnimationFrame(() => {
        updateMobileNavScrollSpy();
        isScrollTicking = false;
      });
      isScrollTicking = true;
    }
  }, { passive: true });
});

// ==========================================================================
// 15. MOBILE-FIRST NAVIGATION & GESTURE ENHANCEMENTS
// ==========================================================================
function setMobileNavActive(id) {
  const items = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item');
  items.forEach(item => item.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }
}

function updateMobileNavScrollSpy() {
  const sections = [
    { id: 'hero', navId: 'mob-nav-home' },
    { id: 'menu', navId: 'mob-nav-menu' },
    { id: 'pricing', navId: 'mob-nav-pricing' }
  ];

  const scrollPosition = window.scrollY + 220;

  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(sections[i].id);
    if (el) {
      const top = el.offsetTop;
      if (scrollPosition >= top) {
        const currentActive = document.querySelector('.mobile-bottom-nav .mobile-nav-item.active');
        const targetNav = document.getElementById(sections[i].navId);
        if (targetNav && currentActive !== targetNav) {
          document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(n => n.classList.remove('active'));
          targetNav.classList.add('active');
        }
        break;
      }
    }
  }
}

// Expose functions globally on window for inline HTML onclick and onsubmit handlers
window.TIFFIN_CONFIG = TIFFIN_CONFIG;
window.AppState = AppState;
window.selectTiffinDal = selectTiffinDal;
window.selectTiffinSabzi = selectTiffinSabzi;
window.selectTiffinRice = selectTiffinRice;
window.selectTiffinRoti = selectTiffinRoti;
window.selectTiffinSalad = selectTiffinSalad;
window.toggleTiffinExtra = toggleTiffinExtra;
window.adjustTiffinQty = adjustTiffinQty;
window.selectTimeSlot = selectTimeSlot;
window.selectPaymentMethod = selectPaymentMethod;
window.executeMockPayment = executeMockPayment;
window.openOrderModal = openOrderModal;
window.openOrderModalWithPlan = openOrderModalWithPlan;
window.openLocationModal = openLocationModal;
window.closeLocationModal = closeLocationModal;
window.closeLocationModalOnBackdrop = closeLocationModalOnBackdrop;
window.switchLocationTab = switchLocationTab;
window.getCurrentLocation = getCurrentLocation;
window.confirmGpsLocation = confirmGpsLocation;
window.confirmManualLocation = confirmManualLocation;
window.editAddressPrompt = editAddressPrompt;
window.openOrdersModal = openOrdersModal;
window.closeOrdersModal = closeOrdersModal;
window.closeOrdersModalOnBackdrop = closeOrdersModalOnBackdrop;
window.loadUserOrders = loadUserOrders;
window.trackSpecificOrder = trackSpecificOrder;
window.triggerGoogleSignIn = triggerGoogleSignIn;
window.triggerSignOut = triggerSignOut;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.closeAuthModalOnBackdrop = closeAuthModalOnBackdrop;
window.navigateStep = navigateStep;
window.navigateStepTo = navigateStepTo;
window.filterMenuDays = filterMenuDays;
window.orderDaySpecific = orderDaySpecific;
window.recalcSavings = recalcSavings;
window.toggleFaq = toggleFaq;
window.simulateRiderCall = simulateRiderCall;
window.hideAppNotification = hideAppNotification;
window.setReviewRating = setReviewRating;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.closeReviewModalOnBackdrop = closeReviewModalOnBackdrop;
window.selectAppPlan = selectAppPlan;
window.closeOrderModal = closeOrderModal;
window.closeModalOnBackdrop = closeModalOnBackdrop;
window.proceedFromTiffinBuilder = proceedFromTiffinBuilder;
window.handleReviewSubmit = handleReviewSubmit;
window.setMobileNavActive = setMobileNavActive;


