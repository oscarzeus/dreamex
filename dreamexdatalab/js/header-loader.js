// Header Loader Script
document.addEventListener('DOMContentLoaded', async function() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase is not initialized');
        }

        // Load header content
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            const response = await fetch('components/header.html');
            const html = await response.text();
            headerPlaceholder.innerHTML = html;
            
            // Initialize header components after content is loaded
            setupHeader();
            
            // Set up authentication listener
            firebase.auth().onAuthStateChanged(function(user) {
                const userAvatar = document.getElementById('user-avatar');
                const userInfo = document.getElementById('user-info');
                
                if (user && userAvatar && userInfo) {
                    userInfo.innerHTML = `
                        <div class="user-info-item">
                            <strong>${user.displayName || user.email}</strong>
                            <small>${user.email}</small>
                        </div>
                    `;
                    userAvatar.style.display = 'flex';
                }
            });
        }
    } catch (error) {
        console.error('Header initialization error:', error);
    }
});

// Set up header functionality (notifications, user menu, active links)
function setupHeader() {
    // Set active link based on current page
    setActiveLink();
    
    // Set up notification panel toggle
    setupNotifications();
    
    // Set up user menu toggle
    setupUserMenu();
    
    // Set up sign out functionality
    setupSignOut();
    
    // Set up dropdown menu toggles
    setupDropdownMenus();
}

// Set the active link in the navigation
function setActiveLink() {
    // Get the current page path
    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop();
    
    // Find all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Set active class on matching link
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === pageName) {
            link.classList.add('active');
            
            // If this is inside a dropdown, mark the parent as active too
            const parentDropdown = link.closest('.dropdown');
            if (parentDropdown) {
                const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.classList.add('active');
                }
            }
        }
    });
    
    // Also check dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    dropdownItems.forEach(item => {
        const href = item.getAttribute('href');
        
        if (href === pageName) {
            item.classList.add('active');
            
            // Mark the parent dropdown toggle as active
            const parentDropdown = item.closest('.dropdown');
            if (parentDropdown) {
                const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.classList.add('active');
                }
            }
        }
    });
}

// Set up notification panel toggle
function setupNotifications() {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationPanel = document.getElementById('notification-panel');
    
    if (notificationIcon && notificationPanel) {
        // Toggle notification panel on click
        notificationIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationPanel.classList.toggle('show');
            
            // If panel is now visible, fetch notifications
            if (notificationPanel.classList.contains('show')) {
                fetchNotifications();
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationIcon.contains(e.target) && notificationPanel.classList.contains('show')) {
                notificationPanel.classList.remove('show');
            }
        });
        
        // Set up "Mark all as read" button
        const markAllReadButton = document.getElementById('mark-all-read');
        if (markAllReadButton) {
            markAllReadButton.addEventListener('click', function() {
                markAllNotificationsAsRead();
            });
        }
    }
    
    // Fetch initial notification count
    updateNotificationCount();
}

// Set up user menu toggle
function setupUserMenu() {
    const userAvatar = document.getElementById('user-avatar');
    const userMenu = document.getElementById('user-menu');
    
    if (userAvatar && userMenu) {
        // Toggle user menu on click
        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!userAvatar.contains(e.target) && userMenu.classList.contains('show')) {
                userMenu.classList.remove('show');
            }
        });
    }
}

// Set up sign out functionality
function setupSignOut() {
    const signOutBtn = document.getElementById('sign-out-btn');
    
    if (signOutBtn && typeof firebase !== 'undefined') {
        signOutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Sign out using Firebase
            firebase.auth().signOut()
                .then(() => {
                    // Redirect to login page
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error('Sign out error:', error);
                });
        });
    }
}

// Fetch notifications from Firebase
function fetchNotifications() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
        console.log('User not authenticated, cannot fetch notifications');
        return;
    }
    
    const notificationList = document.getElementById('notification-list');
    
    if (!notificationList) return;
    
    // Show loading state
    notificationList.innerHTML = '<div class="notification-loading" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    const userId = firebase.auth().currentUser.uid;
    
    // Fetch notifications from Firebase
    firebase.database().ref('notifications')
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(5)
        .once('value')
        .then(snapshot => {
            notificationList.innerHTML = '';
            
            if (snapshot.exists()) {
                // Convert to array and sort by timestamp (most recent first)
                const notifications = [];
                snapshot.forEach(childSnapshot => {
                    notifications.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                
                // Sort by timestamp (newest first)
                notifications.sort((a, b) => b.timestamp - a.timestamp);
                
                // Display notifications
                notifications.forEach(notification => {
                    const notificationItem = document.createElement('div');
                    notificationItem.className = `notification-item ${notification.read ? 'read' : ''}`;
                    notificationItem.setAttribute('data-type', notification.type || 'update');
                    notificationItem.setAttribute('data-id', notification.id);
                    
                    // Get icon based on notification type
                    let typeIcon = 'fa-info-circle';
                    if (notification.type === 'alert') typeIcon = 'fa-exclamation-triangle';
                    if (notification.type === 'reminder') typeIcon = 'fa-clock';
                    
                    // Format timestamp
                    const timestamp = new Date(notification.timestamp);
                    const formattedTime = timestamp.toLocaleString();
                    
                    notificationItem.innerHTML = `
                        <div class="notification-icon">
                            <i class="fas ${typeIcon}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-header">
                                <div class="notification-title">${notification.title}</div>
                                <div class="notification-time">${formattedTime}</div>
                            </div>
                            <div class="notification-message">${notification.message}</div>
                        </div>
                        <button class="mark-as-read" title="Mark as read">
                            <i class="fas ${notification.read ? 'fa-check-circle' : 'fa-circle'}"></i>
                        </button>
                    `;
                    
                    notificationList.appendChild(notificationItem);
                    
                    // Add click event to mark as read
                    const markAsReadBtn = notificationItem.querySelector('.mark-as-read');
                    if (markAsReadBtn) {
                        markAsReadBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            markNotificationAsRead(notification.id);
                        });
                    }
                    
                    // Add click event to go to notification target
                    notificationItem.addEventListener('click', function() {
                        if (notification.targetUrl) {
                            window.location.href = notification.targetUrl;
                        }
                        
                        // Mark as read when clicked
                        if (!notification.read) {
                            markNotificationAsRead(notification.id);
                        }
                    });
                });
            } else {
                // No notifications
                notificationList.innerHTML = `
                    <div class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching notifications:', error);
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading notifications</p>
                </div>
            `;
        });
}

// Update notification badge count
function updateNotificationCount() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
        // User not authenticated, hide badge
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.classList.add('empty');
            badge.textContent = '0';
        }
        return;
    }
    
    const userId = firebase.auth().currentUser.uid;
    const badge = document.getElementById('notification-count');
    
    if (!badge) return;
    
    // Count unread notifications
    firebase.database().ref('notifications')
        .orderByChild('userId')
        .equalTo(userId)
        .once('value')
        .then(snapshot => {
            let unreadCount = 0;
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const notification = childSnapshot.val();
                    if (!notification.read) {
                        unreadCount++;
                    }
                });
            }
            
            // Update badge
            badge.textContent = unreadCount;
            
            if (unreadCount > 0) {
                badge.classList.remove('empty');
            } else {
                badge.classList.add('empty');
            }
        })
        .catch(error => {
            console.error('Error updating notification count:', error);
        });
}

// Mark a notification as read
function markNotificationAsRead(notificationId) {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
    
    firebase.database().ref(`notifications/${notificationId}`)
        .update({ read: true })
        .then(() => {
            // Update UI
            const notification = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
            if (notification) {
                notification.classList.add('read');
                const icon = notification.querySelector('.mark-as-read i');
                if (icon) {
                    icon.classList.remove('fa-circle');
                    icon.classList.add('fa-check-circle');
                }
            }
            
            // Update badge count
            updateNotificationCount();
        })
        .catch(error => {
            console.error('Error marking notification as read:', error);
        });
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
    
    const userId = firebase.auth().currentUser.uid;
    
    // Get all notifications for the current user
    firebase.database().ref('notifications')
        .orderByChild('userId')
        .equalTo(userId)
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const updates = {};
                
                snapshot.forEach(childSnapshot => {
                    const notification = childSnapshot.val();
                    if (!notification.read) {
                        updates[`notifications/${childSnapshot.key}/read`] = true;
                    }
                });
                
                // Update all unread notifications to read
                if (Object.keys(updates).length > 0) {
                    firebase.database().ref().update(updates)
                        .then(() => {
                            // Update UI
                            document.querySelectorAll('.notification-item:not(.read)').forEach(item => {
                                item.classList.add('read');
                                const icon = item.querySelector('.mark-as-read i');
                                if (icon) {
                                    icon.classList.remove('fa-circle');
                                    icon.classList.add('fa-check-circle');
                                }
                            });
                            
                            // Update badge count
                            updateNotificationCount();
                        })
                        .catch(error => {
                            console.error('Error marking all notifications as read:', error);
                        });
                }
            }
        })
        .catch(error => {
            console.error('Error fetching notifications to mark as read:', error);
        });
}

// Set up dropdown menu toggles
function setupDropdownMenus() {
    const dropdowns = document.querySelectorAll('.nav-item.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close all other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.querySelector('.dropdown-menu')?.classList.remove('show');
                    }
                });
                
                // Toggle current dropdown
                menu.classList.toggle('show');
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// Initialize dropdown functionality
document.addEventListener('DOMContentLoaded', () => {
    setupDropdownMenus();
});