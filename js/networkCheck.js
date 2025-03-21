/**
 * Network check utility for production environments
 * Helps diagnose connection issues with Firebase and other services
 */

class NetworkDiagnostics {
    constructor() {
        this.initialized = false;
        this.results = {};
    }
    
    /**
     * Run basic network diagnostics
     * @returns {Promise} Promise that resolves with diagnostic results
     */
    runDiagnostics() {
        this.results = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            host: window.location.hostname,
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : 'Not available',
            online: navigator.onLine
        };
        
        return this.testFirebaseConnection()
            .then(result => {
                this.results.firebase = result;
                console.log("Network diagnostics complete:", this.results);
                return this.results;
            })
            .catch(error => {
                console.error("Error during network diagnostics:", error);
                this.results.error = error.message;
                return this.results;
            });
    }
    
    /**
     * Test Firebase connectivity
     * @returns {Promise} Promise that resolves with test results
     */
    testFirebaseConnection() {
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            // Check if Firebase is available
            if (!window.firebase) {
                resolve({
                    available: false,
                    status: 'Firebase SDK not loaded',
                    time: performance.now() - startTime
                });
                return;
            }
            
            // Check if Firebase is initialized
            if (firebase.apps.length === 0) {
                resolve({
                    available: false,
                    status: 'Firebase not initialized',
                    time: performance.now() - startTime
                });
                return;
            }
            
            // Try to connect to Firebase Realtime Database
            const testRef = firebase.database().ref('.info/connected');
            
            // Set timeout for the test
            const timeout = setTimeout(() => {
                resolve({
                    available: false,
                    status: 'Timeout waiting for Firebase connection',
                    time: performance.now() - startTime
                });
            }, 5000);
            
            // Listen for connection status
            testRef.on('value', snapshot => {
                clearTimeout(timeout);
                
                const connected = snapshot.val() === true;
                resolve({
                    available: true,
                    connected: connected,
                    status: connected ? 'Connected' : 'Disconnected',
                    time: performance.now() - startTime
                });
                
                // Clean up listener
                testRef.off();
            }, error => {
                clearTimeout(timeout);
                resolve({
                    available: true,
                    connected: false,
                    status: 'Error connecting: ' + error.message,
                    time: performance.now() - startTime
                });
            });
        });
    }
    
    /**
     * Attempts to fix common network and Firebase issues
     * @returns {Promise} Promise that resolves when fix attempts are complete
     */
    attemptFixes() {
        // Check if Firebase needs re-initialization
        if (window.firebase && firebase.apps.length === 0) {
            console.log("Attempting to re-initialize Firebase");
            
            // Try to initialize Firebase with default config
            try {
                const firebaseConfig = {
                    apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
                    authDomain: "users-8be65.firebaseapp.com",
                    databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
                    projectId: "users-8be65",
                    storageBucket: "users-8be65.appspot.com",
                    messagingSenderId: "829083030831",
                    appId: "1:829083030831:web:36a370e62691e560bc3dda"
                };
                
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase re-initialized successfully");
            } catch (error) {
                console.error("Failed to re-initialize Firebase:", error);
            }
        }
        
        // Try to refresh authentication
        if (window.firebase && firebase.apps.length > 0) {
            const auth = firebase.auth();
            
            return new Promise((resolve) => {
                auth.onAuthStateChanged(user => {
                    if (user) {
                        console.log("User authenticated after refresh");
                        resolve({
                            authRefreshed: true,
                            userId: user.uid,
                            userEmail: user.email
                        });
                    } else {
                        console.log("No user after auth refresh");
                        resolve({
                            authRefreshed: false
                        });
                    }
                });
                
                // Force refresh auth state
                auth.currentUser?.reload();
            });
        }
        
        return Promise.resolve({ noFixesApplied: true });
    }
}

// Create a global instance
window.NetworkDiagnostics = new NetworkDiagnostics();

// Auto-run diagnostics when network status changes
window.addEventListener('online', () => {
    console.log("Browser reports online status");
    window.NetworkDiagnostics.runDiagnostics();
});

window.addEventListener('offline', () => {
    console.log("Browser reports offline status");
    window.NetworkDiagnostics.runDiagnostics();
});
