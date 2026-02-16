// Cart functionality
const STORAGE_KEY = 'cart';
const DEFAULT_QTY = 1;
const MIN_QTY = 1;

const elements = {};
let cart = [];

(function init() {
  cacheElements();
  loadCart();
  bindEvents();
  updateCartCount();
  renderPopup();

  document.addEventListener('click', (e) => {
    if (!elements.popup || elements.popup.style.display !== 'block') return;
    
    const isClickOnCartLink = elements.cartLink && elements.cartLink.contains(e.target);
    const isClickOnPopup = elements.popup.contains(e.target);
    
    if (!isClickOnCartLink && !isClickOnPopup) {
      elements.popup.style.display = 'none';
    }
  });
})();

function cacheElements() {
  elements.cartCount = document.getElementById('cart-count');
  elements.popup = document.getElementById('cart-popup');
  elements.popupItems = document.getElementById('popup-items');
  elements.totalPrice = document.getElementById('total-price');
  elements.cartLink = document.querySelector('.cart a');
  elements.closePopup = document.getElementById('close-popup');
}

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    cart = stored ? JSON.parse(stored) : [];
    
    if (!Array.isArray(cart)) {
      console.warn('Invalid cart data, resetting to empty array');
      cart = [];
    }
    
    cart = cart.filter(item => 
      item && 
      typeof item.id !== 'undefined' && 
      typeof item.name !== 'undefined' && 
      typeof item.price === 'number' && 
      typeof item.quantity === 'number'
    );
  } catch (error) {
    console.error('Error loading cart:', error);
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

function bindEvents() {
  // Cart button toggle
  if (elements.cartLink) {
    elements.cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCartPopup();
    });
  }
  
  // Close popup
  if (elements.closePopup) {
    elements.closePopup.addEventListener('click', () => {
      if (elements.popup) {
        elements.popup.style.display = 'none'; 
      }
    });
  }
  
  // Product cards - bind events for all product cards
  const bookCards = document.querySelectorAll('.book-card');
  if (bookCards.length > 0) {
    bookCards.forEach(card => {
      bindBookCardEvents(card);
    });
  }
}

function bindBookCardEvents(card) {
  if (!card) return;
  
  const plus = card.querySelector('.plus') || card.querySelector('.increase');
  const minus = card.querySelector('.minus') || card.querySelector('.decrease');
  const addBtn = card.querySelector('.add-to-cart');
  
  // Get quantity display element
  const quantityDisplay = card.querySelector('.count .count') || 
                          card.querySelector('.count .quantity') ||
                          card.querySelector('.quantity');
  
  if (!plus || !minus || !addBtn || !quantityDisplay) {
    console.warn('Missing quantity controls in product card');
    return;
  }
  
  let quantity = DEFAULT_QTY;
  
  // Plus button
  plus.addEventListener('click', () => {
    quantity++;
    updateQuantityDisplay(quantityDisplay, quantity);
  });
  
  // Minus button
  minus.addEventListener('click', () => {
    if (quantity > MIN_QTY) {
      quantity--;
      updateQuantityDisplay(quantityDisplay, quantity);
    }
  });
  
  // Add to cart button
  addBtn.addEventListener('click', () => {
    const bookId = card.dataset.bookId;
    const bookName = card.querySelector('h3')?.textContent || 'Unknown';
    const bookPrice = parseFloat(card.querySelector('.price')?.textContent) || 90;
    
    if (!bookId) {
      console.error('Invalid product data');
      return;
    }
    
    const product = {
      id: bookId,
      name: bookName,
      price: bookPrice,
      quantity: quantity
    };
    
    addToCart(product);
    
    // Reset quantity after adding
    quantity = DEFAULT_QTY;
    updateQuantityDisplay(quantityDisplay, quantity);
  });
}

function updateQuantityDisplay(displayEl, quantity) {
  if (displayEl) {
    displayEl.textContent = quantity;
  }
}

function addToCart(product) {
  if (!product || !product.id || typeof product.price !== 'number') {
    console.error('Invalid product');
    return;
  }
  
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += product.quantity || 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity || 1
    });
  }
  
  saveCart();
  updateCartCount();
  renderPopup();
  
  // Auto-show popup when item is added
  if (elements.popup) {
    elements.popup.style.display = 'block';
    positionPopupUnderCartIcon();
  }
}

function toggleCartPopup() {
  if (!elements.popup) return;
  
  const isVisible = elements.popup.style.display === 'block';
  elements.popup.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    positionPopupUnderCartIcon();
    renderPopup();
  }
}

function positionPopupUnderCartIcon() {
  if (!elements.popup || !elements.cartLink) return;
  
  const cartRect = elements.cartLink.getBoundingClientRect();
  const popup = elements.popup;
  
  popup.style.top = (cartRect.bottom + 5) + 'px';
  popup.style.left = (cartRect.left - 180) + 'px';
}

function updateCartCount() {
  if (!elements.cartCount) return;
  
  const totalItems = cart.reduce((sum, item) => {
    return sum + (item.quantity || 0);
  }, 0);
  elements.cartCount.textContent = totalItems;
}

function renderPopup() {
  if (!elements.popupItems || !elements.totalPrice) return;
  
  elements.popupItems.innerHTML = '';
  
  if (cart.length === 0) {
    elements.popupItems.innerHTML = '<p>Your cart is empty</p>';
    elements.totalPrice.textContent = '0.00';
    return;
  }
  
  let total = 0;
  const fragment = document.createDocumentFragment();
  
  cart.forEach((item) => {
    if (!item) return;
    
    const itemTotal = (item.price || 0) * (item.quantity || 0);
    total += itemTotal;
    
    const itemEl = createCartItemElement(item);
    fragment.appendChild(itemEl);
  });
  
  elements.popupItems.appendChild(fragment);
  elements.totalPrice.textContent = total.toFixed(2);
}

function createCartItemElement(item) {
  const div = document.createElement('div');
  div.className = 'cart-item';
  div.dataset.id = item.id;
  div.innerHTML = `
    <span>${escapeHtml(item.name)}</span>
    <div class="popup-controls">
      <button class="popup-minus" aria-label="Decrease quantity">-</button>
      <span>${item.quantity}</span>
      <button class="popup-plus" aria-label="Increase quantity">+</button>
      <button class="popup-remove" aria-label="Remove item">✖</button>
    </div>
    <span class="item-price">EGP${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
  `;
  
  div.querySelector('.popup-plus').addEventListener('click', () => {
    incrementCartItem(item.id);
  });
  
  div.querySelector('.popup-minus').addEventListener('click', () => {
    decrementCartItem(item.id);
  });
  
  div.querySelector('.popup-remove').addEventListener('click', () => {
    removeFromCart(item.id);
  });
  
  return div;
}

function incrementCartItem(itemId) {
  const item = cart.find(i => i && i.id === itemId);
  if (item) {
    item.quantity++;
    saveCart();
    updateCartCount();
    renderPopup();
  }
}

function decrementCartItem(itemId) {
  const item = cart.find(i => i && i.id === itemId);
  if (item) {
    if (item.quantity > MIN_QTY) {
      item.quantity--;
      saveCart();
      updateCartCount();
      renderPopup();
    } else {
      removeFromCart(itemId);
    }
  }
}

function removeFromCart(itemId) {
  cart = cart.filter(item => item && item.id !== itemId);
  saveCart();
  updateCartCount();
  renderPopup();
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Mobile menu burger toggle
(function initMobileMenu() {
  const burger = document.querySelector('.burger');
  const navLinks = document.querySelector('.nav-links');
  
  if (burger && navLinks) {
    burger.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.classList.toggle('active');
      burger.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        burger.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
        burger.classList.remove('active');
      }
    });
  }
})();

// Language Switcher
(function initLanguageSwitcher() {
  const langBtns = document.querySelectorAll('.lang-btn');
  let currentLang = 'en';
  
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      
      currentLang = lang;
      langBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update direction
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      
      // Update all translatable elements (text content)
      document.querySelectorAll('[data-en][data-ar]').forEach(el => {
        if (!el.classList.contains('lang-btn')) {
          el.textContent = el.dataset[lang];
        }
      });
      
      // Update placeholders
      document.querySelectorAll('input[data-en][data-ar]').forEach(el => {
        el.placeholder = el.dataset[lang];
      });
      
      // Update button texts
      document.querySelectorAll('.add-to-cart[data-en][data-ar]').forEach(btn => {
        btn.textContent = btn.dataset[lang];
      });
    });
  });
})();

// Auth Modal
(function initAuthModal() {
  const signInBtn = document.getElementById('sign-in-btn');
  const authModal = document.getElementById('auth-modal');
  const closeAuth = document.querySelector('.close-auth');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  
  if (signInBtn && authModal) {
    signInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      authModal.classList.add('active');
    });
    
    if (closeAuth) {
      closeAuth.addEventListener('click', () => {
        authModal.classList.remove('active');
      });
    }
    
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        authModal.classList.remove('active');
      }
    });
    
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabName + '-form').classList.add('active');
      });
    });
    
    // Social Login Buttons
    initSocialLogin();
  }
})();

// Social Login Functionality
function initSocialLogin() {
  const socialButtons = document.querySelectorAll('.social-btn');
  
  socialButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const provider = btn.id.includes('google') ? 'google' : 'facebook';
      const action = btn.id.includes('login') ? 'login' : 'signup';
      
      handleSocialLogin(provider, action);
    });
  });
}

function handleSocialLogin(provider, action) {
  // Here you would integrate with actual OAuth providers
  // For demo purposes, we'll show an alert
  const currentLang = document.documentElement.lang || 'en';
  
  const messages = {
    en: {
      google: `Connecting to Google for ${action}...`,
      facebook: `Connecting to Facebook for ${action}...`,
      setup: 'Please set up Firebase or your preferred OAuth provider to enable this feature.'
    },
    ar: {
      google: `جاري الاتصال بجوجل لـ ${action === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}...`,
      facebook: `جاري الاتصال بفيسبوك لـ ${action === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}...`,
      setup: 'يرجى إعداد Firebase أو مزود OAuth المفضل لتمكين هذه الميزة.'
    }
  };
  
  console.log(`Social Login: ${provider} - ${action}`);
  
  // Show notification (in production, this would redirect to OAuth provider)
  alert(`${messages[currentLang][provider]}\n\n${messages[currentLang].setup}`);
  
  // For actual implementation, you would use:
  // Google: firebase.auth().GoogleAuthProvider()
  // Facebook: firebase.auth().FacebookAuthProvider()
  // Or use the Google Identity Services SDK
  // Or use Facebook Login SDK
}
