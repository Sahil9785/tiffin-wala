/* ==========================================================================
   TIFFINWALA FIREBASE INTEGRATION ENGINE
   Project: Tiffin wala | Project ID: tiffin-wala-30264
   Uses Firebase Web SDK v10 (Modular ESM via CDN — No npm / Node.js required)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* --------------------------------------------------------------------------
   FIREBASE WEB CONFIGURATION
   Project ID: tiffin-wala-30264
   Note: Replace apiKey / appId if you have a custom web app registration in 
   Firebase Console -> Project Settings -> General -> Your apps -> Web app.
   -------------------------------------------------------------------------- */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvM6bRzm_yLdYzi4Ey-E0K1i4PjIS_3Hg",
  authDomain: "tiffin-wala-30264.firebaseapp.com",
  projectId: "tiffin-wala-30264",
  storageBucket: "tiffin-wala-30264.firebasestorage.app",
  messagingSenderId: "776666775613",
  appId: "1:776666775613:web:0cc466351dcd1f774aaa54",
  measurementId: "G-TDX0Y5MP7G"
};

// Initialize Firebase App
let app;
let auth;
let db;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  console.log("✓ Firebase initialized successfully for TiffinWala (Project ID: tiffin-wala-30264)");
} catch (err) {
  console.error("Firebase initialization warning:", err);
}

/* --------------------------------------------------------------------------
   AUTHENTICATION SERVICE HELPERS
   -------------------------------------------------------------------------- */

/**
 * Sign in with Google Popup
 */
async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user data to Firestore users/{uid}
    await syncUserToFirestore(user);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        name: user.displayName || 'Tiffin Lover',
        email: user.email || '',
        photoURL: user.photoURL || ''
      }
    };
  } catch (error) {
    console.error("Google Sign-in error:", error);
    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }
}

/**
 * Sign out current user
 */
async function signOutCurrentUser() {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Sign-out error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sync Google User to Firestore `users/{uid}` collection
 * Preserves existing address and coordinates if already set.
 */
async function syncUserToFirestore(user) {
  if (!db || !user || !user.uid) return;
  console.log("Authenticated UID:", user.uid);
  console.log("auth.currentUser:", user);
  console.log("auth.currentUser.uid:", user.uid);
  console.log("auth.currentUser.email:", user.email);

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First time login - create new user document
      await setDoc(userRef, {
        name: user.displayName || 'Tiffin Lover',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Existing user - update basic profile and timestamp
      const existingData = userSnap.data() || {};
      await setDoc(userRef, {
        name: user.displayName || existingData.name || 'Tiffin Lover',
        email: user.email || existingData.email || '',
        photoURL: user.photoURL || existingData.photoURL || '',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Exact error syncing user profile to Firestore:", error);
  }
}

/**
 * Get user profile from Firestore `users/{uid}`
 */
async function getUserProfile(uid) {
  if (!db || !uid) return null;
  console.log("Fetching user profile...");
  const currentAuthUser = auth ? auth.currentUser : null;
  if (currentAuthUser) {
    console.log("Authenticated UID:", currentAuthUser.uid);
    console.log("auth.currentUser:", currentAuthUser);
    console.log("auth.currentUser.uid:", currentAuthUser.uid);
    console.log("auth.currentUser.email:", currentAuthUser.email);
  }

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Exact Firebase error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user delivery location and coordinates in Firestore `users/{uid}`
 */
async function updateUserLocation(uid, locationData) {
  if (!db || !uid) return false;
  console.log("Updating user location...");
  const currentAuthUser = auth ? auth.currentUser : null;
  if (currentAuthUser) {
    console.log("Authenticated UID:", currentAuthUser.uid);
    console.log("auth.currentUser:", currentAuthUser);
    console.log("auth.currentUser.uid:", currentAuthUser.uid);
    console.log("auth.currentUser.email:", currentAuthUser.email);
  }

  try {
    const userRef = doc(db, "users", uid);
    const payload = {
      address: locationData.address || '',
      city: locationData.city || '',
      state: locationData.state || '',
      pincode: locationData.pincode || '',
      landmark: locationData.landmark || '',
      latitude: locationData.latitude !== undefined ? locationData.latitude : null,
      longitude: locationData.longitude !== undefined ? locationData.longitude : null,
      updatedAt: serverTimestamp()
    };
    await setDoc(userRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error("Exact Firebase error updating user location:", error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   FIRESTORE ORDERS SERVICE HELPERS
   -------------------------------------------------------------------------- */

/**
 * Save new order to Firestore `orders/{orderId}` collection
 */
async function createOrder(orderData) {
  if (!db) {
    throw new Error("Firestore Database is not initialized. Please verify your Firebase connection.");
  }
  
  const currentAuthUser = auth ? auth.currentUser : null;
  
  if (!currentAuthUser || !currentAuthUser.uid) {
    console.error("[Firestore] Auth check failed: Firebase auth.currentUser is null.");
    throw new Error("User must be signed in with Google to place an order. Please click 'Sign In' at the top.");
  }

  console.log("Authenticated UID:", currentAuthUser.uid);
  console.log("auth.currentUser:", currentAuthUser);
  console.log("auth.currentUser.uid:", currentAuthUser.uid);
  console.log("auth.currentUser.email:", currentAuthUser.email);
  console.log("Creating Firestore order...");

  const currentUid = currentAuthUser.uid;
  const subtotalVal = Number(orderData.pricing?.subtotal !== undefined ? orderData.pricing.subtotal : 70);
  const extrasVal = Number(orderData.pricing?.extras !== undefined ? orderData.pricing.extras : 0);
  const totalVal = Number(orderData.pricing?.totalPrice !== undefined ? orderData.pricing.totalPrice : ((subtotalVal + extrasVal) * (Number(orderData.quantity) || 1)));

  const orderPayload = {
    userId: currentUid,
    customerName: orderData.customerName || currentAuthUser.displayName || 'Customer',
    customerEmail: orderData.customerEmail || currentAuthUser.email || '',
    location: {
      address: orderData.location?.address || '',
      city: orderData.location?.city || '',
      state: orderData.location?.state || '',
      pincode: orderData.location?.pincode || '',
      landmark: orderData.location?.landmark || '',
      latitude: orderData.location?.latitude !== undefined ? orderData.location.latitude : null,
      longitude: orderData.location?.longitude !== undefined ? orderData.location.longitude : null
    },
    tiffin: {
      dal: orderData.tiffin?.dal || '',
      sabzi: orderData.tiffin?.sabzi || '',
      rice: orderData.tiffin?.rice || '',
      roti: orderData.tiffin?.roti || '',
      salad: orderData.tiffin?.salad || '',
      extras: orderData.tiffin?.extras || []
    },
    quantity: Number(orderData.quantity) || 1,
    deliveryTime: orderData.deliveryTime || 'Lunch (12:00 PM – 2:00 PM)',
    pricing: {
      subtotal: subtotalVal,
      extras: extrasVal,
      totalPrice: totalVal
    },
    paymentMethod: orderData.paymentMethod || 'COD',
    paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'COD' ? 'COD' : 'Pending'),
    razorpayOrderId: orderData.razorpayOrderId || null,
    razorpayPaymentId: orderData.razorpayPaymentId || null,
    razorpaySignature: orderData.razorpaySignature || null,
    orderStatus: "Confirmed",
    createdAt: serverTimestamp()
  };

  try {
    const ordersCol = collection(db, "orders");
    const docRef = await addDoc(ordersCol, orderPayload);
    console.log("Order saved successfully: " + docRef.id);
    
    return {
      success: true,
      orderId: docRef.id,
      data: orderPayload
    };
  } catch (error) {
    console.error("Exact Firestore createOrder error:", error);
    throw error;
  }
}

/**
 * Get all orders placed by a specific user from Firestore `orders` collection
 */
async function fetchUserOrders(uid) {
  if (!db || !uid) return [];
  try {
    const ordersCol = collection(db, "orders");
    const q = query(
      ordersCol, 
      where("userId", "==", uid)
    );
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((docSnap) => {
      orders.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Sort client-side by date descending
    orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return orders;
  } catch (error) {
    console.error("Error fetching user orders from Firestore:", error);
    return [];
  }
}

/**
 * Real-time listener for user orders
 */
function listenToUserOrders(uid, callback) {
  if (!db || !uid) return () => {};
  try {
    const ordersCol = collection(db, "orders");
    const q = query(ordersCol, where("userId", "==", uid));
    return onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      callback(orders);
    }, (err) => {
      console.warn("Orders listener error:", err);
    });
  } catch (error) {
    console.warn("Could not attach orders listener:", error);
    return () => {};
  }
}

/**
 * Listen to live order status updates for real-time tracking (Step 8)
 */
function listenToOrderUpdates(orderId, callback) {
  if (!db || !orderId) return () => {};
  try {
    const orderRef = doc(db, "orders", orderId);
    return onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });
  } catch (error) {
    console.warn("Could not attach order listener:", error);
    return () => {};
  }
}

/* --------------------------------------------------------------------------
   REAL REVIEWS SERVICE (Starts with 0 reviews & 0 rating)
   -------------------------------------------------------------------------- */

/**
 * Submit real customer review to Firestore `reviews/{reviewId}`
 */
async function submitCustomerReview(reviewData) {
  if (!db) throw new Error("Firestore is not initialized.");
  const currentAuthUser = auth ? auth.currentUser : null;
  if (!currentAuthUser) throw new Error("You must be signed in to submit a review.");

  const payload = {
    userId: currentAuthUser.uid,
    customerName: currentAuthUser.displayName || 'Verified Customer',
    customerEmail: currentAuthUser.email || '',
    photoURL: currentAuthUser.photoURL || '',
    rating: Number(reviewData.rating) || 5,
    comment: reviewData.comment || '',
    planTag: reviewData.planTag || 'Tiffin Order',
    createdAt: serverTimestamp()
  };

  const reviewsCol = collection(db, "reviews");
  const docRef = await addDoc(reviewsCol, payload);
  return { success: true, id: docRef.id };
}

/**
 * Real-time listener for customer reviews
 */
function listenToReviews(callback) {
  if (!db) return () => {};
  try {
    const reviewsCol = collection(db, "reviews");
    return onSnapshot(reviewsCol, (querySnapshot) => {
      const reviews = [];
      querySnapshot.forEach((docSnap) => {
        reviews.push({ id: docSnap.id, ...docSnap.data() });
      });
      reviews.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      callback(reviews);
    }, (err) => {
      // Gracefully handle if reviews collection is not configured in security rules
    });
  } catch (error) {
    return () => {};
  }
}

/* --------------------------------------------------------------------------
   EXPOSE SERVICE ON WINDOW FOR SEAMLESS CLIENT INTEGRATION
   -------------------------------------------------------------------------- */
window.FirebaseService = {
  app,
  auth,
  db,
  signInWithGoogle,
  signOutCurrentUser,
  syncUserToFirestore,
  getUserProfile,
  updateUserLocation,
  createOrder,
  fetchUserOrders,
  listenToUserOrders,
  listenToOrderUpdates,
  submitCustomerReview,
  listenToReviews,
  onAuthStateChanged: (callback) => {
    if (auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  }
};

// Dispatch ready event so app.js can immediately bind auth listeners
window.dispatchEvent(new CustomEvent('FirebaseServiceReady'));
