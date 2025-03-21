/**
 * Enhanced AuthManager for maintaining consistent authentication state across pages
 */
class AuthManagerEnhanced {
    constructor() {
        this.initialized = false;
        this.auth = null;
        this.database = null;
        this.authStateListeners = [];
        this.currentUser = null;
        this.authCheckTimeout = null;
        this.initFirebase();
    }

    /**
     * Initialize Firebase and set up auth state listener
     */
    initFirebase() {
        if (window.firebase) {
            // Firebase already initialized
            this.auth = firebase.auth();
            this.database = firebase.database();
            
            // Set persistence to LOCAL to keep user logged in
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch(error => {
                    console.error("Error setting auth persistence:", error);
                });
                
            this.setupAuthStateListener();
        } else {
            // Need to initialize Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
                authDomain: "users-8be65.firebaseapp.com",
                databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
                projectId: "users-8be65",
                storageBucket: "users-8be65.appspot.com",
                messagingSenderId: "829083030831",
                appId: "1:829083030831:web:36a370e62691e560bc3dda"
            };
            
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.database = firebase.database();
            
            // Set persistence to LOCAL
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch(error => {
                    console.error("Error setting auth persistence:", error);
                });
                
            this.setupAuthStateListener();
        }
    }

    /**
     * Set up the auth state change listener
     */
    setupAuthStateListener() {
        this.auth.onAuthStateChanged(user => {
            this.initialized = true;
            this.currentUser = user;
            
            if (user) {
                // User is signed in
                console.log("AuthManager: User is signed in", user.email);
                // Store auth token in localStorage for persistence
                user.getIdToken().then(token => {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.uid);
                });
                
                // Update user object in session storage for quick access
                const serializedUser = {
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                };
                sessionStorage.setItem('currentUser', JSON.stringify(serializedUser));
                
                // Notify listeners
                this.notifyListeners(user);
            } else {
                // User is signed out
                console.log("AuthManager: User is signed out");
                localStorage.removeItem('authToken');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userId');
                sessionStorage.removeItem('currentUser');
                
                // Notify listeners
                this.notifyListeners(null);
            }
        });
        
        // Set a timeout to ensure we don't wait forever
        this.authCheckTimeout = setTimeout(() => {
            if (!this.initialized) {
                console.log("AuthManager: Auth check timed out, proceeding with null user");
                this.initialized = true;
                this.notifyListeners(null);
            }
        }, 3000); // 3 second timeout
    }

    /**
     * Login with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise}
     */
    login(email, password) {
        return this.auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Login successful
                return userCredential.user;
            });
    }

    /**
     * Logout the current user
     * @returns {Promise}
     */
    logout() {
        return this.auth.signOut()
            .then(() => {
                // Clear any stored session data
                localStorage.removeItem('authToken');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userId');
                sessionStorage.removeItem('currentUser');
                sessionStorage.removeItem('userPermissions');
                sessionStorage.removeItem('userRole');
                
                // Redirect to login page
                window.location.href = "login.html";
            });
    }

    /**
     * Check if a user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.currentUser || !!localStorage.getItem('authToken');
    }

    /**
     * Get the current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to get from session storage
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
        } catch (e) {
            console.error("Error retrieving user from session storage:", e);
        }
        
        return null;
    }

    /**
     * Register a listener for auth state changes
     * @param {Function} listener 
     */
    addAuthStateListener(listener) {
        this.authStateListeners.push(listener);
        
        // If already initialized, call the listener immediately
        if (this.initialized) {
            listener(this.currentUser);
        }
    }

    /**
     * Notify all listeners of auth state change
     * @param {Object|null} user 
     */
    notifyListeners(user) {
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (e) {
                console.error("Error in auth state listener:", e);
            }
        });
    }
}   

    

