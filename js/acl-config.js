const dashboardSettings = {
	acl: {
		admin: {
			permissions: [
				"create_content",       // Create all content
				"read_content",         // Read all content
				"update_content",       // Update all content
				"delete_content",       // Delete all content
				"manage_users",         // Manage user accounts
				"change_system_settings", // Change system settings
				"view_analytics_logs"   // View system analytics and logs
			]
		},
		editor: {
			permissions: [
				"create_own_content",   // Create own content
				"read_own_content",     // Read own content
				"update_own_content",   // Update own content
				"read_others_content",  // Read content created by others
				"update_others_content",// Update content created by others
				"publish_content",      // Publish content
				"unpublish_content"     // Unpublish content
			]
		},
		user: {
			permissions: [
				"read_content",         // Read content
				"comment_content",      // Comment on content
				"modify_own_profile"    // Modify own profile information
			]
		}
	}
};

document.addEventListener("DOMContentLoaded", function() {
	const loginButton = document.getElementById("dashboard-login-button");
	if (loginButton) {
		// Ensure the login button is fixed and remains visible on hover
		loginButton.style.position = "fixed";
		loginButton.addEventListener("mouseover", function() {
			// Override any styles that might hide the button
			loginButton.style.display = "";
			loginButton.style.visibility = "visible";
			
			// Fix the dropdown box attached to the login button
			const dropdownBox = loginButton.querySelector(".dropdown-box");
			if (dropdownBox) {
				dropdownBox.style.position = "fixed";
				const rect = loginButton.getBoundingClientRect();
				dropdownBox.style.top = rect.bottom + "px";
				dropdownBox.style.left = rect.left + "px";
				dropdownBox.style.zIndex = "1000";
			}
		});
	}
	
	// New code: fix user avatar container on hover
	const avatarContainer = document.getElementById("user-avatar-container");
	if (avatarContainer) {
		avatarContainer.addEventListener("mouseover", function() {
			avatarContainer.style.position = "fixed";
			avatarContainer.style.zIndex = "1000";
		});
	}
	
	// Helper function to get user initials from email or name
	window.getUserInitials = function(emailOrName) {
		if (!emailOrName) return "GU"; // Guest User default
		
		// Check if it's an email and extract name part
		const namePart = emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName;
		
		// Split by common separators and get initials
		const parts = namePart.split(/[\s\._-]+/);
		return parts.map(part => part.charAt(0).toUpperCase()).join('');
	};
});
