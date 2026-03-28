# Authentication Flow

## Overview

This application uses **JWT (JSON Web Token)** authentication with **bcrypt**
password hashing. Here's how every step works.

---

## What is JWT?

A JWT is a digitally signed token that contains user data (called "claims").

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiam9obiJ9.signature
│                      │                                        │
│  Header              │  Payload (user data)                   │  Signature
│  (algorithm)         │  (id, username, email, expiry)         │  (verifies integrity)
```

**Key properties:**
- The server creates and signs the token using a secret key
- The client stores the token and sends it with every request
- The server verifies the signature to confirm the token is valid
- No session storage needed on the server (stateless)

---

## What is bcrypt?

bcrypt is a password hashing algorithm that:
1. **Adds salt** — A random string mixed into the hash (prevents rainbow table attacks)
2. **Is intentionally slow** — Configurable "rounds" make brute force attacks impractical
3. **Produces unique hashes** — Same password produces different hashes each time (due to salt)

```
Password: "mypassword123"
                ↓
bcrypt.hash("mypassword123", 10)  // 10 rounds of hashing
                ↓
Hash: "$2b$10$N/B7rR1kL5vMfHQzNqOY2eK3mJ..." (60 characters)
```

---

## Registration Flow

```
Step 1: User fills out form
┌────────────────────────┐
│   Register Form        │
│   Username: john       │
│   Email: john@mail.com │
│   Password: ******     │
│   [Create Account]     │
└────────────────────────┘
            │
            ▼
Step 2: Frontend sends POST request
POST /api/auth/register
{
  "username": "john",
  "email": "john@mail.com",
  "password": "secret123"
}
            │
            ▼
Step 3: Server validates input
- Is username provided? ✓
- Is email provided? ✓
- Is password ≥ 6 chars? ✓
            │
            ▼
Step 4: Check for existing user
SELECT * FROM users
WHERE email = 'john@mail.com'
   OR username = 'john';
→ No results? Continue. Exists? Return 409 error.
            │
            ▼
Step 5: Hash the password
bcrypt.hash("secret123", 10)
→ "$2b$10$N/B7rR1kL5vM..."
            │
            ▼
Step 6: Save to PostgreSQL
INSERT INTO users (id, username, email, password)
VALUES (uuid, 'john', 'john@mail.com', '$2b$10$N/B7...');
            │
            ▼
Step 7: Generate JWT token
jwt.sign({ id, username, email }, SECRET, { expiresIn: '7d' })
→ "eyJhbGci..."
            │
            ▼
Step 8: Return response
{
  "message": "Registration successful",
  "user": { "id": "...", "username": "john", "email": "john@mail.com" },
  "token": "eyJhbGci..."
}
            │
            ▼
Step 9: Frontend stores token
localStorage.setItem('token', 'eyJhbGci...')
→ AuthContext updates → User is now logged in
→ Navigate to chat page
```

---

## Login Flow

```
Step 1: User fills out form
┌────────────────────────┐
│   Login Form           │
│   Email: john@mail.com │
│   Password: ******     │
│   [Sign In]            │
└────────────────────────┘
            │
            ▼
Step 2: Frontend sends POST request
POST /api/auth/login
{
  "email": "john@mail.com",
  "password": "secret123"
}
            │
            ▼
Step 3: Find user by email
SELECT * FROM users WHERE email = 'john@mail.com';
→ User found? Continue. Not found? Return 401 "Invalid credentials"
            │
            ▼
Step 4: Verify password
bcrypt.compare("secret123", "$2b$10$N/B7rR1kL5vM...")
→ true? Continue. false? Return 401 "Invalid credentials"
            │
            ▼
Step 5: Generate JWT token
jwt.sign({ id, username, email }, SECRET, { expiresIn: '7d' })
→ "eyJhbGci..."
            │
            ▼
Step 6: Return response
{
  "message": "Login successful",
  "user": { "id": "...", "username": "john", "email": "john@mail.com" },
  "token": "eyJhbGci..."
}
            │
            ▼
Step 7: Frontend stores token & updates state
localStorage.setItem('token', '...')
→ AuthContext sets user → Navigate to chat page
```

---

## Token Verification (Protected Routes)

Every subsequent API request includes the JWT token:

```
Step 1: Frontend makes API call
GET /api/chats
Headers: {
  Authorization: "Bearer eyJhbGci..."
}
            │
            ▼
Step 2: Auth middleware intercepts
- Extract token from "Bearer <token>"
- If no token → 401 "No token provided"
            │
            ▼
Step 3: Verify the JWT
jwt.verify(token, SECRET)
- Checks signature (was this signed by our server?)
- Checks expiration (has the token expired?)
- If invalid → 401 "Invalid or expired token"
            │
            ▼
Step 4: Attach user to request
req.user = { id: "...", username: "john", email: "john@mail.com" }
            │
            ▼
Step 5: Continue to route handler
The handler can now use req.user to know who is making the request
```

---

## Logout Flow

Logout is entirely client-side:

```
Step 1: User clicks "Logout"
            │
            ▼
Step 2: Remove token
localStorage.removeItem('token')
            │
            ▼
Step 3: Update state
AuthContext: user = null, token = null
            │
            ▼
Step 4: Socket disconnects
SocketContext detects token change → socket.disconnect()
            │
            ▼
Step 5: Redirect
ProtectedRoute detects no user → Navigate to /login
```

**Why no server call?**
JWT is stateless — the server doesn't store sessions. Once the client
deletes the token, they can no longer make authenticated requests.

---

## Security Practices

| Practice                    | Implementation                        |
| --------------------------- | ------------------------------------- |
| Password hashing            | bcrypt with 10 salt rounds            |
| Token signing               | HMAC-SHA256 via jsonwebtoken          |
| Token expiry                | 7 days (configurable via .env)        |
| Generic error messages      | "Invalid credentials" for both wrong email and password |
| CORS restriction            | Only `CLIENT_URL` can make requests   |
| HTTP security headers       | Helmet middleware                     |
| Password never in response  | Prisma `select` excludes password     |
| Input validation            | Required fields, min password length  |

### Why generic error messages?

When a login fails, we always say "Invalid credentials" — never:
- "User not found" (reveals that the email doesn't exist)
- "Wrong password" (confirms the email exists)

This prevents **email enumeration attacks** where an attacker tries
different emails to find which ones are registered.

---

## How Auth Context Works in React

```
App Mount
    │
    ▼
AuthProvider initializes
    │
    ├─ token in localStorage?
    │   ├─ YES → Call GET /api/auth/me
    │   │           ├─ Success → Set user state → loading = false
    │   │           └─ Fail → Clear token → loading = false
    │   │
    │   └─ NO → loading = false (not logged in)
    │
    ▼
ProtectedRoute checks auth
    │
    ├─ loading = true → Show spinner
    ├─ user = null → Navigate to /login
    └─ user exists → Render child component
```

This ensures:
- Users stay logged in across page refreshes (token persisted in localStorage)
- Invalid/expired tokens are caught and cleared automatically
- The loading state prevents a brief flash of the login page
