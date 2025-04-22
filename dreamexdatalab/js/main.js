// HSE System - Main JavaScript File

// Check if user is authenticated
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase from firebase-config.js if not already initialized
    if (typeof firebase === 'undefined' && typeof firebaseConfig !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Set up session tracking
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Start session tracking
            startSessionTracking(user);
        } else {
            // User is not logged in, check if we're on a protected page
            if (window.location.pathname.indexOf('login.html') === -1) {
                // Only redirect if we're not on the login page
                window.location.href = 'login.html';
            }
        }
    });
    
    // Set up global event listeners
    setupActivityTracking();
});

// Start session tracking for the current user
function startSessionTracking(user) {
    // Check if we already have a session ID
    let sessionId = localStorage.getItem('current_session_id');
    
    // If no existing session ID, create a new one
    if (!sessionId) {
        getUserSessionInfo(user);
    } else {
        // Update existing session
        updateSessionActivity(sessionId);
        
        // Set up activity monitoring
        setUpActivityMonitoring(sessionId);
    }
}

// Get session info using ipinfo.io with the token
async function getUserSessionInfo(user) {
    try {
        // Get IP and location information
        const res = await fetch("https://ipinfo.io/json?token=d7f1400ff72967");
        const ipInfo = await res.json();
        
        // Create session ID
        const sessionId = generateSessionId();
        localStorage.setItem('current_session_id', sessionId);
        
        // Get device and browser info
        const deviceInfo = getDeviceInfo();
        
        // Create session data
        const sessionData = {
            userId: user.uid,
            userEmail: user.email,
            displayName: user.displayName || user.email,
            ip: ipInfo.ip,
            location: `${ipInfo.city || ''}, ${ipInfo.country || ''}`.trim(),
            coordinates: ipInfo.loc || '',
            timezone: ipInfo.timezone || '',
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            startTime: new Date().toISOString(),
            lastActivity: firebase.database.ServerValue.TIMESTAMP,
            status: "active"
        };
        
        // Save to global sessions collection
        await firebase.database().ref('sessions/' + sessionId).set(sessionData);
        
        // Also save to user's sessions collection for user-specific views
        await firebase.database().ref(`users/${user.uid}/sessions/${sessionId}`).set({
            id: sessionId,
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            ipAddress: ipInfo.ip,
            location: ipInfo.loc || '',
            cityCountry: `${ipInfo.city || ''}, ${ipInfo.country || ''}`.trim(),
            lastActivity: Date.now(),
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Set up activity monitoring
        setUpActivityMonitoring(sessionId);
        
        console.log("Session tracking initialized:", sessionId);
    } catch (error) {
        console.error("Error initializing session tracking:", error);
    }
}

// Generate a unique session ID
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomStr}`;
}

// Get device information from user agent
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';
    
    // Detect device
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
    }
    
    // Detect browser
    if (/Edge|Edg\//i.test(ua)) {
        browser = 'Microsoft Edge';
    } else if (/Chrome/i.test(ua) && !/Chromium|OPR|Edge/i.test(ua)) {
        browser = 'Chrome';
    } else if (/Firefox/i.test(ua)) {
        browser = 'Firefox';
    } else if (/Safari/i.test(ua) && !/Chrome|Chromium|Edge|OPR/i.test(ua)) {
        browser = 'Safari';
    } else if (/MSIE|Trident/i.test(ua)) {
        browser = 'Internet Explorer';
    } else if (/OPR\//i.test(ua)) {
        browser = 'Opera';
    }
    
    // Detect OS
    if (/Windows NT/i.test(ua)) {
        os = 'Windows';
        if (/Windows NT 10/i.test(ua)) os += ' 10';
        else if (/Windows NT 6.3/i.test(ua)) os += ' 8.1';
        else if (/Windows NT 6.2/i.test(ua)) os += ' 8';
        else if (/Windows NT 6.1/i.test(ua)) os += ' 7';
    } else if (/Mac OS X/i.test(ua)) {
        os = 'macOS';
    } else if (/Android/i.test(ua)) {
        os = 'Android';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        os = 'iOS';
    } else if (/Linux/i.test(ua)) {
        os = 'Linux';
    }
    
    return { device, browser, os };
}

// Update session activity timestamp
function updateSessionActivity(sessionId) {
    // Only update if we have a valid session ID
    if (!sessionId) return;
    
    // Update last activity timestamp in both locations
    const user = firebase.auth().currentUser;
    if (user) {
        const updates = {};
        updates[`sessions/${sessionId}/lastActivity`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`users/${user.uid}/sessions/${sessionId}/lastActivity`] = Date.now();
        
        firebase.database().ref().update(updates)
            .catch(error => console.error("Error updating session activity:", error));
    }
}

// Set up activity monitoring for the session
function setUpActivityMonitoring(sessionId) {
    // Update on regular intervals
    const activityInterval = setInterval(() => {
        // Check if user is still logged in
        const user = firebase.auth().currentUser;
        if (user) {
            updateSessionActivity(sessionId);
        } else {
            // User logged out, clear interval
            clearInterval(activityInterval);
        }
    }, 60000); // Update every minute
    
    // Capture page unload to update session status
    window.addEventListener('beforeunload', () => {
        const user = firebase.auth().currentUser;
        if (user && sessionId) {
            // Use navigator.sendBeacon for more reliable tracking on page exit
            const data = JSON.stringify({ status: 'inactive', lastActivity: new Date().toISOString() });
            const url = `${window.location.origin}/update-session-status?sessionId=${sessionId}&userId=${user.uid}`;
            
            // Try to use sendBeacon (more reliable) or fall back to sync XHR
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url, data);
            } else {
                // Fallback to synchronous AJAX request
                firebase.database().ref(`sessions/${sessionId}/status`).set('inactive');
            }
        }
    });
}

// Set up page activity tracking
function setupActivityTracking() {
    // Track user interactions to detect activity
    const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let lastActivityTime = Date.now();
    
    // Add event listeners for each activity type
    events.forEach(eventType => {
        document.addEventListener(eventType, () => {
            // If it's been more than 1 minute since the last update
            if (Date.now() - lastActivityTime > 60000) {
                lastActivityTime = Date.now();
                
                // Update session activity
                const sessionId = localStorage.getItem('current_session_id');
                if (sessionId) {
                    updateSessionActivity(sessionId);
                }
            }
        }, { passive: true });
    });
    
    // Check for session timeout every minute
    setInterval(() => {
        const sessionTimeoutMinutes = 30; // 30-minute timeout
        const lastActivity = lastActivityTime;
        const currentTime = Date.now();
        
        // If inactive for the timeout period, sign out
        if (currentTime - lastActivity > sessionTimeoutMinutes * 60 * 1000) {
            // User has been inactive, sign them out
            if (firebase.auth().currentUser) {
                localStorage.removeItem('current_session_id');
                firebase.auth().signOut().then(() => {
                    window.location.href = 'login.html?reason=timeout';
                });
            }
        }
    }, 60000); // Check every minute
}

// Add a function to sign out from all devices except current session
function signOutFromAllDevices(exceptSessionId) {
    return new Promise((resolve, reject) => {
        const user = firebase.auth().currentUser;
        if (!user) {
            reject(new Error('No user is currently signed in'));
            return;
        }
        
        // Get all user sessions
        firebase.database().ref(`users/${user.uid}/sessions`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const updates = {};
                    
                    // Mark all other sessions as terminated
                    snapshot.forEach(childSnapshot => {
                        const sessionId = childSnapshot.key;
                        if (sessionId !== exceptSessionId) {
                            updates[`users/${user.uid}/sessions/${sessionId}`] = null;
                            updates[`sessions/${sessionId}`] = null;
                        }
                    });
                    
                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        return firebase.database().ref().update(updates);
                    }
                }
                return Promise.resolve();
            })
            .then(() => {
                // Update password to invalidate existing tokens (requires re-authentication)
                // Note: This is a more complex approach that would require the user's password
                resolve();
            })
            .catch(error => {
                console.error("Error signing out from other devices:", error);
                reject(error);
            });
    });
}

// Add a function to terminate a specific session
function terminateSession(sessionId) {
    return new Promise((resolve, reject) => {
        const user = firebase.auth().currentUser;
        if (!user) {
            reject(new Error('No user is currently signed in'));
            return;
        }
        
        // Don't allow terminating the current session through this method
        const currentSessionId = localStorage.getItem('current_session_id');
        if (sessionId === currentSessionId) {
            reject(new Error('Cannot terminate the current session'));
            return;
        }
        
        // Remove session data from both locations
        const updates = {};
        updates[`users/${user.uid}/sessions/${sessionId}`] = null;
        updates[`sessions/${sessionId}`] = null;
        
        firebase.database().ref().update(updates)
            .then(() => resolve())
            .catch(error => reject(error));
    });
}

// Log user activity for auditing purposes
function logUserActivity(action, details = {}) {
    const user = firebase.auth().currentUser;
    if (!user) return Promise.reject(new Error('No user is signed in'));
    
    const activityData = {
        userId: user.uid,
        userEmail: user.email,
        displayName: user.displayName || user.email,
        action: action,
        details: details,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        sessionId: localStorage.getItem('current_session_id') || 'unknown',
        page: window.location.pathname
    };
    
    return firebase.database().ref('activity_log').push(activityData);
}

// Global error handling
window.addEventListener('error', function(e) {
    // Log client-side errors
    if (firebase.auth().currentUser) {
        logUserActivity('client_error', {
            message: e.message,
            source: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error ? e.error.stack : null
        }).catch(console.error);
    }
});