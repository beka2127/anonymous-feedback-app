
function setFormMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
   
    messageElement.className = 'form-message ' + type;
}



document.getElementById('commentForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const commentText = document.getElementById('commentText').value;
    const attachmentFile = document.getElementById('attachment').files[0]; 

   
    if (!commentText.trim() && !attachmentFile) {
        setFormMessage('message', 'Please enter a comment or attach a file.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('comment', commentText);
    if (attachmentFile) {
        formData.append('attachment', attachmentFile); 
    }

    try {
        const response = await fetch('/submit-comment', {
            method: 'POST',
           
            body: formData 
        });

        const data = await response.json();

        if (response.ok) {
            setFormMessage('message', data.message, 'success');
            document.getElementById('commentText').value = ''; 
            document.getElementById('attachment').value = ''; 
        } else {
            setFormMessage('message', data.message || 'Error submitting comment.', 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        setFormMessage('message', 'Could not connect to the server. Please try again later.', 'error');
    }
});

const commentSection = document.getElementById('commentSection');
const adminLoginSection = document.getElementById('adminLoginSection');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const backToCommentsBtn = document.getElementById('backToCommentsBtn');
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');

adminLoginBtn.addEventListener('click', () => {
    commentSection.style.display = 'none';
    adminLoginSection.style.display = 'block';
    adminPasswordInput.value = ''; 
    setFormMessage('loginMessage', '', ''); 
});

backToCommentsBtn.addEventListener('click', () => {
    commentSection.style.display = 'block';
    adminLoginSection.style.display = 'none';
    setFormMessage('message', '', ''); 
});

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
            }, 500); 
        } else {
            setFormMessage('loginMessage', data.message || 'Login failed.', 'error');
        }
    } catch (error) {
        console.error('Login network error:', error);
        setFormMessage('loginMessage', 'Could not connect to the server for login.', 'error');
    }
});
document.getElementById("langToggle").addEventListener("click", function () {
    const isAmharic = this.innerText === "አማርኛ";
    this.innerText = isAmharic ? "English" : "አማርኛ";

    document.querySelector(".logo").innerText = isAmharic ? "ምሥጢራዊ የጥቆማ መስጫ" : "Anonymous whistleblowing hub";
    document.querySelector("#commentSection h2").innerText = isAmharic ? "የጥቆማ መስጫ" : "Share Your whistleblow";
    document.querySelector("label[for='commentText']").innerText = isAmharic ? "ጥቆማዎን ያጋሩ" : "Your whistleblow:";
    document.getElementById("commentText").placeholder = isAmharic ?
        "ጥቆማዎን እዚህ ይጻፉ... ለአስተዳዳሪ ብቻ ይታያል፣ ጥቆማዎ እና ማንነትዎ በምሥጢር ይቆያል።(ከለላ የሚፈልጉ ከሆነ ስምዎን እና መለያ ቁጥርዎን ያስቀምጡ)" :
        "Type your whistleblow here... It will be seen only by the admin, and your identity will remain private.";
    document.querySelector("label[for='attachment']").innerText = isAmharic ? "ፋይል ያካትቱ (አማራጭ):" : "Add an Attachment (Optional):";
    document.querySelector("small").innerText = isAmharic ? "ከፍተኛ 6MB። ምስሎች (JPG, PNG, GIF), PDF, Word ወይም የጽሑፍ ፋይሎች ይፈቀዳሉ።" :
        "Max 6MB. Images (JPG, PNG, GIF), PDFs, Word Docs, or Text files allowed.";
    document.querySelector("#commentForm button").innerText = isAmharic ? "በምሥጢር ይላኩ" : "Submit Comment Anonymously";
    document.querySelector(".admin-access-area p").innerText = isAmharic ? "አንተ አስተዳዳሪ ነህ?" : "Are you the admin?";
    document.getElementById("adminLoginBtn").innerText = isAmharic ? "ወደ አስተዳዳሪ ይግቡ" : "Admin Login";
    document.querySelector("#adminLoginSection h2").innerText = isAmharic ? "የአስተዳዳሪ ግባ" : "Admin Login";
    document.querySelector("label[for='adminPassword']").innerText = isAmharic ? "የአስተዳዳሪ የምስጢር ቃል ያስገቡ፡" : "Enter Admin Password:";
    document.querySelector("#loginForm button").innerText = isAmharic ? "ግባ" : "Login";
    document.getElementById("backToCommentsBtn").innerText = isAmharic ? "ወደ ቅድመ ቅጽ ተመለስ" : "Back to Feedback Form";
    document.querySelector(".footer p").innerText = isAmharic ? "© 2025 የማስታወቂያ መድረክ። መብት የተጠበቀ." : "© 2025 Anonymous Feedback. All rights reserved.";
});
