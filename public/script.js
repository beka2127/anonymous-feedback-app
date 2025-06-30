// Function to clear and set message
function setFormMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    // Remove previous types and add the new one
    messageElement.className = 'form-message ' + type;
}

// Comment form submission
document.getElementById('commentForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const commentText = document.getElementById('commentText').value;
    const attachmentFile = document.getElementById('attachment').files[0]; // Get the selected file

    // Check if either comment text or an attachment is provided
    if (!commentText.trim() && !attachmentFile) {
        setFormMessage('message', 'Please enter a comment or attach a file.', 'error');
        return;
    }

    // Use FormData to send both text and file
    const formData = new FormData();
    formData.append('comment', commentText);
    if (attachmentFile) {
        formData.append('attachment', attachmentFile); // 'attachment' is the name expected by multer
    }

    try {
        const response = await fetch('/submit-comment', {
            method: 'POST',
            // IMPORTANT: No 'Content-Type' header here. FormData automatically sets it to multipart/form-data.
            body: formData // Send FormData object directly
        });

        const data = await response.json();

        if (response.ok) {
            setFormMessage('message', data.message, 'success');
            document.getElementById('commentText').value = ''; // Clear text area
            document.getElementById('attachment').value = ''; // Clear file input
        } else {
            setFormMessage('message', data.message || 'Error submitting comment.', 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        setFormMessage('message', 'Could not connect to the server. Please try again later.', 'error');
    }
});

// Admin Login Logic (No changes needed here)
const commentSection = document.getElementById('commentSection');
const adminLoginSection = document.getElementById('adminLoginSection');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const backToCommentsBtn = document.getElementById('backToCommentsBtn');
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');

// Show admin login form when button is clicked
adminLoginBtn.addEventListener('click', () => {
    commentSection.style.display = 'none';
    adminLoginSection.style.display = 'block';
    adminPasswordInput.value = ''; // Clear password field
    setFormMessage('loginMessage', '', ''); // Clear any previous messages
});

// Go back to comment form
backToCommentsBtn.addEventListener('click', () => {
    commentSection.style.display = 'block';
    adminLoginSection.style.display = 'none';
    setFormMessage('message', '', ''); // Clear messages on comment form
});

// Handle login form submission
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const password = adminPasswordInput.value;

    try {
        const response = await fetch('/admin-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (response.ok) {
            setFormMessage('loginMessage', data.message, 'success');
            setTimeout(() => {
                window.location.href = data.redirectUrl;
            }, 500); // Small delay to show success message
        } else {
            setFormMessage('loginMessage', data.message || 'Login failed.', 'error');
        }
    } catch (error) {
        console.error('Login network error:', error);
        setFormMessage('loginMessage', 'Could not connect to the server for login.', 'error');
    }
});