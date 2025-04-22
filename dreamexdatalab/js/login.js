// HSE System - Login JS

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase from firebase-config.js
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not initialized. Make sure firebase-config.js is included before login.js');
        return;
    }
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is already signed in, redirect to home page
            console.log('User already signed in:', user.email);
            window.location.href = 'index.html';
        }
    });
    
    // Get form elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            
            // Validate form
            if (!email || !password) {
                showError('Please enter both email and password.');
                return;
            }
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            
            // Sign in with email and password
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(async (userCredential) => {
                    // Set persistence based on remember me checkbox
                    const persistence = rememberMe ? 
                        firebase.auth.Auth.Persistence.LOCAL : 
                        firebase.auth.Auth.Persistence.SESSION;
                    
                    await firebase.auth().setPersistence(persistence);
                    
                    // Get session info after successful login
                    await getSessionInfo(userCredential.user);
                    
                    // Redirect to home page
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Login error:', error);
                    showError(getErrorMessage(error));
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                });
        });
    }
    
    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate form
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                showError('Please fill in all required fields.', 'register-error');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match.', 'register-error');
                return;
            }
            
            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#]{8,}$/;
            if (!passwordRegex.test(password)) {
                showError('Password must be at least 8 characters and include uppercase, lowercase, and numbers.', 'register-error');
                return;
            }
            
            // Show loading state
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
            
            // Create user with email and password
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update user profile with name
                    const user = userCredential.user;
                    const displayName = `${firstName} ${lastName}`;
                    
                    user.updateProfile({
                        displayName: displayName
                    }).then(() => {
                        // Store additional user data in database
                        const userData = {
                            firstName: firstName,
                            lastName: lastName,
                            email: email,
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString(),
                            role: 'user' // Default role
                        };
                        
                        return firebase.database().ref('users/' + user.uid).set(userData);
                    }).then(async () => {
                        // Add to activity log
                        await logActivity('user-created', `New user ${email} registered`);
                        
                        // Get session info after successful registration
                        await getSessionInfo(user);
                        
                        // Show success message and redirect
                        alert('Account created successfully! You are now signed in.');
                        window.location.href = 'index.html';
                    });
                })
                .catch((error) => {
                    console.error('Registration error:', error);
                    showError(getErrorMessage(error), 'register-error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                });
        });
    }
    
    // Forgot password form submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('forgot-email').value;
            
            // Validate form
            if (!email) {
                showError('Please enter your email address.', 'forgot-error');
                return;
            }
            
            // Show loading state
            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Send password reset email
            firebase.auth().sendPasswordResetEmail(email)
                .then(() => {
                    // Show success message
                    document.getElementById('forgot-success').textContent = 
                        'Password reset email sent! Check your inbox.';
                    document.getElementById('forgot-success').style.display = 'block';
                    document.getElementById('forgot-error').style.display = 'none';
                    forgotPasswordForm.reset();
                })
                .catch((error) => {
                    console.error('Password reset error:', error);
                    showError(getErrorMessage(error), 'forgot-error');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Reset Link';
                });
        });
    }
    
    // Toggle between login and register forms
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('register-container').style.display = 'block';
            document.getElementById('forgot-password-container').style.display = 'none';
        });
    }
    
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('register-container').style.display = 'none';
            document.getElementById('forgot-password-container').style.display = 'none';
        });
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('register-container').style.display = 'none';
            document.getElementById('forgot-password-container').style.display = 'block';
        });
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('register-container').style.display = 'none';
            document.getElementById('forgot-password-container').style.display = 'none';
        });
    }
    
    // Helper functions
    function showError(message, elementId = 'login-error') {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }
    
    function getErrorMessage(error) {
        switch(error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Invalid password. Please try again.';
            case 'auth/invalid-email':
                return 'Invalid email format.';
            case 'auth/email-already-in-use':
                return 'An account already exists with this email address.';
            case 'auth/weak-password':
                return 'Password is too weak. Please choose a stronger password.';
            case 'auth/too-many-requests':
                return 'Too many failed login attempts. Please try again later.';
            default:
                return error.message;
        }
    }
    
    async function logActivity(action, description) {
        const activityData = {
            action: action,
            description: description,
            timestamp: Date.now(),
            type: 'auth'
        };
        
        try {
            await firebase.database().ref('activity').push(activityData);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    
    // Get session info using ipinfo.io
    async function getSessionInfo(user) {
        try {
            // Get IP and location information
            const res = await fetch("https://ipinfo.io/json?token=d7f1400ff72967");
            const ipInfo = await res.json();
            
            // Get browser and device information
            const userAgent = navigator.userAgent;
            const browserInfo = getBrowserInfo(userAgent);
            
            // Generate a unique session ID
            const sessionId = generateSessionId();
            
            // Store session ID in local storage for future reference
            localStorage.setItem('current_session_id', sessionId);
            
            // Create session data object
            const sessionData = {
                userId: user.uid,
                userEmail: user.email,
                displayName: user.displayName || 'Unknown User',
                ip: ipInfo.ip || 'Unknown',
                city: ipInfo.city || 'Unknown',
                region: ipInfo.region || 'Unknown',
                country: ipInfo.country || 'Unknown',
                location: ipInfo.loc || 'Unknown',
                timezone: ipInfo.timezone || 'Unknown',
                browser: browserInfo.browser,
                browserVersion: browserInfo.version,
                os: browserInfo.os,
                device: browserInfo.device,
                startTime: new Date().toISOString(),
                lastActivity: firebase.database.ServerValue.TIMESTAMP,
                status: "active"
            };
            
            // Save to Firebase database
            await firebase.database().ref('sessions/' + sessionId).set(sessionData);
            
            // Also save to user's sessions
            await firebase.database().ref(`users/${user.uid}/sessions/${sessionId}`).set({
                id: sessionId,
                device: browserInfo.device,
                browser: browserInfo.browser,
                os: browserInfo.os,
                ipAddress: ipInfo.ip || 'Unknown',
                location: ipInfo.loc || 'Unknown',
                cityCountry: `${ipInfo.city || ''}, ${ipInfo.country_name || ipInfo.country || ''}`.trim(),
                lastActivity: Date.now(),
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Update user's last login time
            await firebase.database().ref(`users/${user.uid}/lastLogin`).set(new Date().toISOString());
            
            console.log('Session tracking initialized:', sessionId);
        } catch (error) {
            console.error('Error initializing session tracking:', error);
        }
    }
    
    // Function to generate a unique session ID
    function generateSessionId() {
        const timestamp = new Date().getTime().toString(36);
        const randomChars = Math.random().toString(36).substring(2, 10);
        return `${timestamp}-${randomChars}`;
    }
    
    // Function to extract browser information from user agent
    function getBrowserInfo(userAgent) {
        let browser = 'Unknown';
        let version = 'Unknown';
        let os = 'Unknown';
        let device = 'Desktop';
        
        // Detect browser
        if (/Edge|Edg\//.test(userAgent)) {
            browser = 'Microsoft Edge';
        } else if (/MSIE|Trident/.test(userAgent)) {
            browser = 'Internet Explorer';
        } else if (/Firefox\//.test(userAgent)) {
            browser = 'Firefox';
        } else if (/Chrome\//.test(userAgent)) {
            browser = 'Chrome';
        } else if (/Safari\//.test(userAgent)) {
            browser = 'Safari';
        } else if (/Opera\/|OPR\//.test(userAgent)) {
            browser = 'Opera';
        }
        
        // Detect OS
        if (/Windows/.test(userAgent)) {
            os = 'Windows';
            if (/Windows NT 10/.test(userAgent)) os += ' 10';
            else if (/Windows NT 6\.3/.test(userAgent)) os += ' 8.1';
            else if (/Windows NT 6\.2/.test(userAgent)) os += ' 8';
            else if (/Windows NT 6\.1/.test(userAgent)) os += ' 7';
        } else if (/Macintosh|Mac OS X/.test(userAgent)) {
            os = 'macOS';
        } else if (/Android/.test(userAgent)) {
            os = 'Android';
            device = 'Mobile';
        } else if (/iOS|iPhone|iPad|iPod/.test(userAgent)) {
            os = 'iOS';
            device = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
        } else if (/Linux/.test(userAgent)) {
            os = 'Linux';
        }
        
        // Extract version number for the browser
        let match;
        if (browser === 'Chrome') {
            match = userAgent.match(/Chrome\/(\d+\.\d+)/);
            if (match) version = match[1];
        } else if (browser === 'Firefox') {
            match = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (match) version = match[1];
        } else if (browser === 'Safari') {
            match = userAgent.match(/Version\/(\d+\.\d+)/);
            if (match) version = match[1];
        } else if (browser === 'Microsoft Edge') {
            match = userAgent.match(/Edge\/(\d+\.\d+)/) || userAgent.match(/Edg\/(\d+\.\d+)/);
            if (match) version = match[1];
        }

        return { browser, version, os, device };
    }
});