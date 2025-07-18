const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; 
const SESSION_SECRET = process.env.SESSION_SECRET; 



const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(`Created uploads directory at: ${uploadsDir}`);
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); 
    },
    filename: function (req, file, cb) {
        
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        
        const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports images (jpeg/jpg/png/gif), PDFs, Docs, or Text files!'));
    }
}).single('attachment'); 


app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(uploadsDir));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: SESSION_SECRET, 
    resave: false,
    saveUninitialized: false, 
    cookie: {
        secure: false, 
        maxAge: 3600000
    }
}));


const db = new sqlite3.Database('./comments.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
      
        
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_text TEXT,
            attachment_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
            if (createErr) {
                console.error('Error creating comments table:', createErr.message);
            } else {
                console.log('Comments table is ready.');
            }
        });
    }
});


function isAuthenticated(req, res, next) {
    if (req.session.isAdmin) {
        next(); 
    } else {
       
        res.status(401).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Access Denied</title>
                <link rel="stylesheet" href="style.css">
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            </head>
            <body>
                <div class="header">
                    <h1 class="logo">Access Denied</h1>
                </div>
                <main>
                    <section class="card fade-in">
                        <h2>Access Denied!</h2>
                        <p>You need to be logged in as an admin to view this page.</p>
                        <button onclick="window.location.href='/'" class="btn btn-primary">Go to Home Page</button>
                    </section>
                </main>
                <footer class="footer">
                    <p>&copy; 2025 Anonymous Feedback. All rights reserved.</p>
                </footer>
            </body>
            </html>
        `);
    }
}


app.post('/submit-comment', (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.error('File upload error:', err.message);
            return res.status(400).json({ message: `File upload failed: ${err.message}` });
        }

        const commentText = req.body.comment;
        const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null; 

        if (!commentText.trim() && !attachmentPath) {
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting orphaned file:', unlinkErr);
                });
            }
            return res.status(400).json({ message: 'Please enter a comment or attach a file.' });
        }

        db.run('INSERT INTO comments (comment_text, attachment_path) VALUES (?, ?)', [commentText, attachmentPath], function(err) {
            if (err) {
                console.error('Error inserting comment into DB:', err.message);
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting failed file:', unlinkErr);
                    });
                }
                return res.status(500).json({ message: 'Failed to submit comment. Please try again.' });
            }
            res.status(200).json({ message: 'Comment submitted successfully and anonymously!' + (attachmentPath ? ' (with attachment)' : '') });
        });
    });
});


app.post('/admin-login', (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.status(200).json({ message: 'Login successful!', redirectUrl: '/admin-view-comments' });
    } else {
        res.status(401).json({ message: 'Incorrect password.' });
    }
});


app.get('/admin-logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});


app.post('/delete-comment', isAuthenticated, (req, res) => {
    const commentId = req.body.id;

    if (!commentId) {
        return res.status(400).send('Comment ID is required for deletion.');
    }

    db.get('SELECT attachment_path FROM comments WHERE id = ?', [commentId], (err, row) => {
        if (err) {
            console.error('Error fetching comment for deletion:', err.message);
            return res.status(500).send('Error preparing to delete comment.');
        }

        if (row && row.attachment_path) {
            const filePathToDelete = path.join(__dirname, row.attachment_path);
            fs.unlink(filePathToDelete, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Error deleting attachment file ${filePathToDelete}:`, unlinkErr);
                } else {
                    console.log(`Deleted attachment file: ${filePathToDelete}`);
                }
            });
        }

        db.run('DELETE FROM comments WHERE id = ?', [commentId], function(dbErr) {
            if (dbErr) {
                console.error('Error deleting comment from DB:', dbErr.message);
                return res.status(500).send('Error deleting comment from database.');
            }
            if (this.changes === 0) {
                return res.status(404).send('Comment not found in database.');
            }
            console.log(`Deleted comment ID: ${commentId}`);
            res.redirect('/admin-view-comments');
        });
    });
});


app.get('/admin-view-comments', isAuthenticated, (req, res) => {
    db.all('SELECT id, comment_text, attachment_path, timestamp FROM comments ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving comments:', err.message);
            return res.status(500).send('Error retrieving comments.');
        }

        let commentsListHtml = '';
        if (rows.length === 0) {
            commentsListHtml = '<p class="no-comments">No comments received yet.</p>';
        } else {
            commentsListHtml = '<ul class="comment-list">';
            rows.forEach(row => {
                const formattedTimestamp = new Date(row.timestamp).toLocaleString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                let attachmentHtml = '';
                if (row.attachment_path) {
                    const fileExtension = path.extname(row.attachment_path).toLowerCase();
                    if (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png' || fileExtension === '.gif') {
                        attachmentHtml = `<div class="comment-attachment"><img src="${row.attachment_path}" alt="Attachment"></div>`;
                    } else {
                        attachmentHtml = `<div class="comment-attachment"><a href="${row.attachment_path}" target="_blank" download>Download Attachment (${fileExtension.substring(1).toUpperCase()} File)</a></div>`;
                    }
                }

                commentsListHtml += `
                    <li class="comment-item">
                        <p class="comment-text">${row.comment_text || '<em>(No comment text provided)</em>'}</p>
                        ${attachmentHtml}
                        <p class="comment-timestamp">Received: ${formattedTimestamp}</p>
                        <form action="/delete-comment" method="POST" class="delete-form">
                            <input type="hidden" name="id" value="${row.id}">
                            <button type="submit" class="btn btn-danger btn-small" onclick="return confirm('Are you sure you want to delete this comment and its attachment?');">Delete</button>
                        </form>
                    </li>
                `;
            });
            commentsListHtml += '</ul>';
        }

        let htmlResponse = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Panel: Anonymous Comments</title>
                <link rel="stylesheet" href="style.css">
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            </head>
            <body>
                <div class="header">
                    <h1 class="logo">Admin Panel</h1>
                </div>
                <main>
                    <div class="admin-comments-container fade-in">
                        <h1>Anonymous Feedback Dashboard</h1>
                        <p>Total Comments: ${rows.length}</p>
                        ${commentsListHtml}
                        <div class="admin-actions">
                            <button onclick="window.location.href='/admin-logout'" class="btn btn-danger">Logout</button>
                            <button onclick="window.location.href='/'" class="btn btn-outline">Go to Comment Page</button>
                        </div>
                    </div>
                </main>
                <footer class="footer">
                    <p>&copy; 2025 Anonymous Feedback. All rights reserved.</p>
                </footer>
            </body>
            </html>
        `;
        res.send(htmlResponse);
    });
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Anonymous feedback form: \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
    console.log(`\n\x1b[33m!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\x1b[0m`);
    console.log(`\x1b[33m!!! IMPORTANT: SET A STRONG ADMIN_PASSWORD in server.js !!!\x1b[0m`);
    console.log(`\x1b[33m!!! AND A UNIQUE SESSION_SECRET in server.js !!!\x1b[0m`);
    console.log(`\x1b[33m!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\x1b[0m`);
});


process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
