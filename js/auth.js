// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
  authDomain: "users-8be65.firebaseapp.com",
  databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
  projectId: "users-8be65",
  storageBucket: "users-8be65.firebasestorage.app",
  messagingSenderId: "829083030831",
  appId: "1:829083030831:web:36a370e62691e560bc3dda"
};

// Initialize Firebase if it's not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const AuthManager = {
    // Keys used for storing authentication data
    keys: {
        loggedIn: 'loggedIn',
        userId: 'userId',
        userEmail: 'userEmail',
        userName: 'userName',
        userRole: 'userRole',
        sessionExpiry: 'sessionExpiry'
    },
    
    // Initialize Firebase Auth
    init() {
        console.log("AuthManager init called");
        if (typeof firebase !== 'undefined' && firebase.auth) {
            this.auth = firebase.auth();
            this.database = firebase.database();
            this.setupAuthStateListener();
            return true;
        } else {
            console.warn("Firebase auth not available, using localStorage fallback");
            // If Firebase is not available, check localStorage immediately
            this.checkAuthAndRedirect();
            return false;
        }
    },

    // Set up listener for auth state changes
    setupAuthStateListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                console.log("Firebase auth: User is signed in", user.email);
                this.updateSessionData(user);
                this.updateUIForAuthenticatedUser(user);
            } else {
                // User is signed out
                console.log("Firebase auth: User is signed out");
                this.clearSessionData();
                
                // Only redirect on protected pages - don't redirect from login page or public pages
                const publicPages = ['login.html', 'index.html', 'register.html', 'signup.html'];
                const currentPage = window.location.pathname.split('/').pop();
                if (!publicPages.includes(currentPage)) {
                    this.redirectToLogin();
                } else if (currentPage === 'login.html') {
                    // We're already on the login page, do nothing
                    console.log("Already on login page, not redirecting");
                } else {
                    // On public pages like index.html, just update UI
                    console.log("On public page, updating UI for non-authenticated user");
                    this.updateUIForNonAuthenticatedUser();
                }
            }
        });
    },
    
    // Check if user is currently logged in
    isLoggedIn() {
        // First check Firebase auth status
        if (this.auth && this.auth.currentUser) {
            return true;
        }
        
        // Fallback to localStorage
        const loggedIn = localStorage.getItem(this.keys.loggedIn) === 'true';
        const expiry = localStorage.getItem(this.keys.sessionExpiry);
        
        // Check for session expiry
        if (loggedIn && expiry) {
            const now = new Date().getTime();
            if (now > parseInt(expiry)) {
                this.logout();
                return false;
            }
        }
        
        return loggedIn;
    },
    
    // Get current Firebase user
    getCurrentUser() {
        if (this.auth) {
            return this.auth.currentUser;
        }
        return null;
    },
    
    // Store user data in localStorage after successful authentication
    updateSessionData(user) {
        // Store user data
        localStorage.setItem(this.keys.loggedIn, 'true');
        localStorage.setItem(this.keys.userId, user.uid || '');
        localStorage.setItem(this.keys.userEmail, user.email || '');
        
        // Set session expiry (24 hours)
        const expiry = new Date().getTime() + (24 * 60 * 60 * 1000);
        localStorage.setItem(this.keys.sessionExpiry, expiry.toString());
        
        // Also get additional user info from database if available
        if (this.database) {
            this.database.ref(`users/${user.uid}`).once('value').then(snapshot => {
                const userData = snapshot.val() || {};
                if (userData.displayName) {
                    localStorage.setItem(this.keys.userName, userData.displayName);
                } else if (userData.firstName || userData.lastName) {
                    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    localStorage.setItem(this.keys.userName, fullName);
                }
                if (userData.role) {
                    localStorage.setItem(this.keys.userRole, userData.role);
                }
            }).catch(error => {
                console.error("Error fetching user data:", error);
            });
        }
    },
    
    // Clear authentication data
    clearSessionData() {
        localStorage.removeItem(this.keys.loggedIn);
        localStorage.removeItem(this.keys.userId);
        localStorage.removeItem(this.keys.userEmail);
        localStorage.removeItem(this.keys.userName);
        localStorage.removeItem(this.keys.userRole);
        localStorage.removeItem(this.keys.sessionExpiry);
    },
    
    // Update UI elements based on authentication state
    updateUIForAuthenticatedUser(user) {
        // Try to update UI elements that are common across pages
        try {
            // Update user email in dropdown
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) userEmailElement.textContent = user.email;
            
            // Update user initial
            const userInitialElement = document.getElementById('userInitial');
            if (userInitialElement) {
                userInitialElement.textContent = this.getUserInitial(user);
            }
            
            // Show logout button, hide login button
            const logoutButton = document.getElementById('logoutButton');
            const loginButton = document.getElementById('loginButton');
            if (logoutButton) logoutButton.style.display = 'block';
            if (loginButton && loginButton.parentNode.tagName !== 'FORM') {
                // Only hide login button in navigation, not in login form
                loginButton.style.display = 'none';
            }
        } catch (error) {
            console.warn("Error updating UI for authenticated user:", error);
        }
    },

    // Update UI elements for non-authenticated user
    updateUIForNonAuthenticatedUser() {
        try {
            // Update user initial to default
            const userInitialElement = document.getElementById('userInitial');
            if (userInitialElement) {
                userInitialElement.textContent = "?";
            }
            
            // Hide logout button, show login button
            const logoutButton = document.getElementById('logoutButton');
            const loginButton = document.getElementById('loginButton');
            if (logoutButton) logoutButton.style.display = 'none';
            if (loginButton && loginButton.parentNode.tagName !== 'FORM') {
                // Only show login button in navigation, not in login form
                loginButton.style.display = 'block';
            }
        } catch (error) {
            console.warn("Error updating UI for non-authenticated user:", error);
        }
    },
    
    // Get the initial letter for user avatar
    getUserInitial(user) {
        if (user.displayName) {
            return user.displayName.charAt(0).toUpperCase();
        }
        if (user.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return "?";
    },
    
    // Log user out
    logout() {
        this.clearSessionData();
        
        if (this.auth) {
            this.auth.signOut().then(() => {
                window.location.href = "login.html";
            }).catch(error => {
                console.error("Error signing out:", error);
                window.location.href = "login.html";
            });
        } else {
            window.location.href = "login.html";
        }
    },
    
    // Check auth status and redirect if not authenticated
    checkAuthAndRedirect() {
        // If Firebase is available, rely on the onAuthStateChanged listener
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return;
        }
        
        // Otherwise, check localStorage and redirect if not logged in
        if (!this.isLoggedIn()) {
            // Only redirect on protected pages
            const publicPages = ['login.html', 'index.html', 'register.html', 'signup.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (!publicPages.includes(currentPage)) {
                this.redirectToLogin();
            }
        }
    },
    

    
    // Initialize user avatar display
    initializeUserAvatar() {
        const user = this.getCurrentUser();
        if (user) {
            this.updateUIForAuthenticatedUser(user);
        } else {
            this.updateUIForNonAuthenticatedUser();
        }
    },
    
    // Update avatar display based on authentication state
    updateAvatarDisplay() {
        const user = this.getCurrentUser();
        if (user) {
            this.updateUIForAuthenticatedUser(user);
        } else {
            this.updateUIForNonAuthenticatedUser();
        }
    },
    
    // Ensure a page is protected - redirect if user is not authenticated
    requireAuth(publicPages = []) {
        const currentPage = window.location.pathname.split('/').pop();
        
        // If this is a public page, no authentication required
        if (publicPages.includes(currentPage)) {
            return;
        }
        
        // Check if user is authenticated, redirect to login if not
        if (!this.isLoggedIn()) {
            this.redirectToLogin();
        }
    },
    
    // Get current user data
    getUserData() {
        if (this.auth && this.auth.currentUser) {
            const user = this.auth.currentUser;
            return {
                userId: user.uid,
                email: user.email,
                name: user.displayName || localStorage.getItem(this.keys.userName) || user.email.split('@')[0],
                role: localStorage.getItem(this.keys.userRole) || 'user'
            };
        }
        
        // Fallback to localStorage
        if (!this.isLoggedIn()) return null;
        
        return {
            userId: localStorage.getItem(this.keys.userId),
            email: localStorage.getItem(this.keys.userEmail),
            name: localStorage.getItem(this.keys.userName),
            role: localStorage.getItem(this.keys.userRole) || 'user'
        };
    },
    
    // Log an action to the audit log
    logAction(action, details = {}) {
        const userData = this.getUserData();
        if (!userData) return;
        
        const logEntry = {
            timestamp: Date.now(),
            action: action,
            userId: userData.userId,
            userEmail: userData.email,
            userName: userData.name,
            details: details
        };
        
        // Try to log to Firebase
        this.logToFirebase(logEntry);
        
        // Also log locally as a fallback
        this.logLocally(logEntry);
    },
    
    // Log to Firebase
    logToFirebase(logEntry) {
        if (this.database) {
            try {
                this.database.ref('auditLogs').push(logEntry);
            } catch (error) {
                console.error("Error logging to Firebase:", error);
            }
        }
    },
    
    // Log locally as a fallback
    logLocally(logEntry) {
        try {
            let logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
            logs.push(logEntry);
            // Keep only the latest 100 logs locally
            if (logs.length > 100) {
                logs = logs.slice(-100);
            }
            localStorage.setItem('auditLogs', JSON.stringify(logs));
        } catch (error) {
            console.error("Error logging locally:", error);
        }
    },
    
    // Get local logs (backup)
    getLocalLogs() {
        try {
            return JSON.parse(localStorage.getItem('auditLogs') || '[]');
        } catch (error) {
            console.error("Error getting local logs:", error);
            return [];
        }
    },
    
    // Audit log functionality
    auditLog: {
        logAction(action, details = {}) {
            AuthManager.logAction(action, details);
        },
        getLocalLogs() {
            return AuthManager.getLocalLogs();
        }
    },

    // Login with email and password
    login(userData) {
        if (!userData.email || !userData.password) {
            console.error("Email and password are required for login");
            return Promise.reject(new Error("Email and password are required"));
        }
        
        return this.auth.signInWithEmailAndPassword(userData.email, userData.password)
            .then((userCredential) => {
                const user = userCredential.user;
                this.updateSessionData(user);
                this.logAction('LOGIN', { method: 'email' });
                return user;
            });
    }
};

// Initialize AuthManager when the script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing AuthManager");
    AuthManager.init();
    
    // Set up logout button handlers
    const logoutButtons = document.querySelectorAll('#logoutButton');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            AuthManager.logout();
        });
    });
});

// Make AuthManager available globally
window.AuthManager = AuthManager;
