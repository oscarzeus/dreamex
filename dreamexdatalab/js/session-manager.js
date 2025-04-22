/**
 * Session Manager 
 * Handles authentication sessions, tokens, and domain-specific authentication
 */

// Initialize session tracking
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the custom domain
    const isCustomDomain = window.location.hostname === 'dreamexdatalab.com' || 
                         window.location.hostname.endsWith('.dreamexdatalab.com');
    
    // Special handling for authentication on custom domain
    if (isCustomDomain) {
        console.log('Custom domain detected: implementing domain-specific session handling');
        
        // Set up domain-specific cookie settings
        document.cookie = "domainAuth=true; path=/; domain=.dreamexdatalab.com; SameSite=Strict; Secure";
        
        // Check for Firebase initialization
        if (typeof firebase !== 'undefined') {
            // Apply custom auth persistence settings for the domain
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('Domain-specific auth persistence applied');
                })
                .catch(error => {
                    console.error('Auth persistence error:', error);
                });
        }
    }
});

/**
 * Manages user session and authentication state
 */
class SessionManager {
    constructor() {
        this.currentUser = null;
        this.lastActivity = Date.now();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes by default
        this.initSessionMonitoring();
    }
    
    /**
     * Initialize session monitoring
     */
    initSessionMonitoring() {
        // Set up auth state monitoring
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged(user => {
                this.handleAuthStateChange(user);
            });
        }
        
        // Set up activity monitoring
        this.setupActivityTracking();
        
        // Check for orphaned sessions
        this.checkForOrphanedSessions();
    }
    
    /**
     * Handle authentication state changes
     * @param {Object} user - Firebase user object
     */
    handleAuthStateChange(user) {
        if (user) {
            this.currentUser = user;
            this.lastActivity = Date.now();
            
            // Store session info in localStorage for domain-specific access
            localStorage.setItem('userSession', JSON.stringify({
                uid: user.uid,
                email: user.email,
                lastActivity: this.lastActivity,
                domain: window.location.hostname
            }));
            
            // Special handling for dreamexdatalab.com domain
            if (window.location.hostname === 'dreamexdatalab.com' || 
                window.location.hostname.endsWith('.dreamexdatalab.com')) {
                
                // Create domain-specific session tokens
                this.createDomainSessionToken(user);
                console.log('Domain-specific authentication applied');
            }
            
            console.log('User authenticated:', user.email);
        } else {
            this.currentUser = null;
            localStorage.removeItem('userSession');
            console.log('User signed out');
        }
    }
    
    /**
     * Create a domain-specific session token
     * @param {Object} user - Firebase user object
     */
    createDomainSessionToken(user) {
        if (!user) return;
        
        // Create a domain-specific token
        user.getIdToken(true).then(token => {
            // Store token in a secure cookie with domain
            this.setSecureCookie('dreamexauth', token, 1, 'dreamexdatalab.com');
        }).catch(error => {
            console.error('Error creating domain token:', error);
        });
    }
    
    /**
     * Set secure cookie with domain
     */
    setSecureCookie(name, value, days, domain) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        
        let cookieString = name + '=' + value + expires + '; path=/; SameSite=Strict; Secure';
        
        if (domain) {
            cookieString += '; domain=' + domain;
        }
        
        document.cookie = cookieString;
    }
    
    /**
     * Set up tracking for user activity to maintain session
     */
    setupActivityTracking() {
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        
        // Update last activity timestamp on user interaction
        activityEvents.forEach(event => {
            window.addEventListener(event, () => {
                this.lastActivity = Date.now();
                
                // Update stored session
                const session = localStorage.getItem('userSession');
                if (session) {
                    const sessionData = JSON.parse(session);
                    sessionData.lastActivity = this.lastActivity;
                    localStorage.setItem('userSession', JSON.stringify(sessionData));
                }
            });
        });
        
        // Check session every minute
        setInterval(() => this.checkSession(), 60000);
    }
    
    /**
     * Check for session timeout
     */
    checkSession() {
        const currentTime = Date.now();
        const inactiveTime = currentTime - this.lastActivity;
        
        // If user inactive for longer than timeout period and logged in
        if (inactiveTime > this.sessionTimeout && this.currentUser) {
            console.log('Session timeout due to inactivity');
            this.signOut();
        }
    }
    
    /**
     * Check for orphaned sessions
     */
    checkForOrphanedSessions() {
        const session = localStorage.getItem('userSession');
        
        if (session) {
            const sessionData = JSON.parse(session);
            const currentTime = Date.now();
            
            // Clean up orphaned sessions older than the timeout
            if (currentTime - sessionData.lastActivity > this.sessionTimeout) {
                console.log('Cleaning up orphaned session');
                localStorage.removeItem('userSession');
            }
        }
    }
    
    /**
     * Sign out current user
     */
    signOut() {
        if (typeof firebase !== 'undefined') {
            firebase.auth().signOut()
                .then(() => {
                    console.log('User signed out successfully');
                    // Clear session storage
                    localStorage.removeItem('userSession');
                    
                    // Clear domain cookies if on custom domain
                    if (window.location.hostname === 'dreamexdatalab.com' || 
                        window.location.hostname.endsWith('.dreamexdatalab.com')) {
                        this.setSecureCookie('dreamexauth', '', -1, 'dreamexdatalab.com');
                    }
                    
                    // Redirect to login page if not already there
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html';
                    }
                })
                .catch(error => {
                    console.error('Sign out error:', error);
                });
        }
    }
    
    /**
     * Get current authenticated user
     * @returns {Object|null} Firebase user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Set custom session timeout
     * @param {number} minutes - Timeout in minutes
     */
    setSessionTimeout(minutes) {
        if (typeof minutes !== 'number' || minutes <= 0) {
            console.error('Invalid session timeout value');
            return;
        }
        
        this.sessionTimeout = minutes * 60 * 1000;
        console.log(`Session timeout set to ${minutes} minutes`);
    }
}

// Create and export session manager instance
window.sessionManager = new SessionManager();

// Add authentication functions
window.auth = {
    /**
     * Check if user is logged in
     * @returns {boolean} Whether user is logged in
     */
    isLoggedIn() {
        return window.sessionManager.getCurrentUser() !== null;
    },
    
    /**
     * Get current user
     * @returns {Object|null} Current user or null
     */
    getCurrentUser() {
        return window.sessionManager.getCurrentUser();
    },
    
    /**
     * Sign out current user
     */
    signOut() {
        window.sessionManager.signOut();
    },
    
    /**
     * Require authentication to access page
     * @param {string} redirectUrl - URL to redirect to if not authenticated
     * @returns {boolean} Whether user is authenticated
     */
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
};