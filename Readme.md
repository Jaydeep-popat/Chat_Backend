# 💬 MeanMessenger Backend

A robust, secure real-time chat application backend built with Node.js, Express, Socket.IO, and MongoDB.

## 🚀 Features

- **Real-time Messaging**: Instant messaging with Socket.IO
- **User Authentication**: JWT-based authentication with refresh tokens
- **File Upload**: Secure file upload with Cloudinary integration
- **Rate Limiting**: API rate limiting for security
- **Input Validation**: Comprehensive input validation
- **Error Handling**: Global error handling middleware
- **Security**: Multiple security layers including Helmet, CORS, and secure cookies

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Validation**: express-validator
- **Security**: Helmet, bcrypt, rate limiting
- **Message History**: Persistent storage of chat messages.

## Technologies Used

- **Frontend**: Angular
- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/MeanMessenger.git
    cd MeanMessenger
    ```

2. Install dependencies:
    ```bash
    npm install
    cd client
    npm install
    cd ..
    ```

3. Configure environment variables:
    - Create a `.env` file in the root directory.
    - Add the following minimum variables:
      ```
      PORT=5000
      MONGO_URI=your_mongodb_connection_string
      JWT_SECRET=your_jwt_secret
      REFRESH_TOKEN_SECRET=your_refresh_secret
      CORS_ORIGIN=http://localhost:4200
      SMTP_HOST=your_smtp_host
      SMTP_PORT=587
      SMTP_SECURE=false
      SMTP_USER=your_smtp_username
      SMTP_PASS=your_smtp_password
      SMTP_FROM="MeanMessenger <no-reply@meanmessenger.com>"
      ```

4. Start the application:
    ```bash
    npm run dev
    ```

5. Open your browser and navigate to `http://localhost:4200`.

## Usage

1. Register a new account or log in with an existing one.
2. Create or join a chat room.
3. Start chatting in real-time!
4. Forgot password flow:
   - `POST /api/v1/users/forgot-password/request` with email to receive OTP.
   - `POST /api/v1/users/forgot-password/verify` with email + OTP to verify.
   - `POST /api/v1/users/forgot-password/reset` with email + new password to complete the reset.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes:
    ```bash
    git commit -m "Add feature-name"
    ```
4. Push to the branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions or feedback, feel free to reach out at your.email@example.com.