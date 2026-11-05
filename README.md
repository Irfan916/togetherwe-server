# TogetherWe — Social Development Events Platform

A backend API for **TogetherWe**, a social development events platform designed to help people discover, organize, and participate in events that contribute to social development.

The platform allows users to create events, explore upcoming events, join events, and manage the events they organize.

## 📌 Project Overview

TogetherWe aims to connect people through meaningful activities and social development initiatives.

This repository contains the backend server responsible for event management, database operations, authentication verification, and protected API endpoints.

## ✨ Features

- **Event Creation:** Create events with a title, description, event type, thumbnail URL, location, date, and creator email.
- **Upcoming Events:** Retrieve upcoming events, including a limited selection of recent events for the homepage.
- **Event Details:** Retrieve details about individual events.
- **Join Events:** Allow authenticated users to join events.
- **Joined Events:** Retrieve events that the authenticated user has joined.
- **My Events:** Retrieve events created by the authenticated user.
- **Event Management:** Update or delete events with ownership verification.
- **Authentication Middleware:** Verify JWTs before allowing access to protected endpoints.
- **MongoDB Integration:** Store and retrieve event data using MongoDB.
- **Dashboard Statistics:** Retrieve event-related statistics through a dedicated endpoint.

## 🛠️ Technology Stack

| Technology | Purpose                                   |
| ---------- | ----------------------------------------- |
| Node.js    | JavaScript runtime                        |
| Express.js | Backend framework                         |
| TypeScript | Type-safe development                     |
| MongoDB    | Database                                  |
| Mongoose   | MongoDB object modeling                   |
| JWT        | Authentication token verification         |
| `jose`     | JWT and cryptographic operations          |
| JWKS       | Public-key discovery for JWT verification |
| dotenv     | Environment variable management           |

> **Authentication status:** The current backend contains JWT verification middleware. A complete authentication provider, such as BetterAuth, must be configured separately if it has not already been implemented.

## 📁 Project Structure

The following is a representative structure. Adjust it to match the actual files in your repository.

```text
togetherwe-server/
├── src/
│   ├── middleware/
│   │   └── auth.ts
│   ├── models/
│   │   ├── Event.ts
│   │   └── User.ts
│   └── index.ts
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## ⚙️ Prerequisites

Before running the server, make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm
- A MongoDB database, either locally or through [MongoDB Atlas](https://www.mongodb.com/atlas)
- An API testing tool such as [Postman](https://www.postman.com/)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Irfan916/togetherwe-server.git
```

Navigate to the backend directory:

```bash
cd togetherwe-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory of the backend.

Use `.env.example` as a reference:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000

AUTH_ISSUER=http://localhost:3000
JWKS_URL=http://localhost:3000/api/auth/jwks
```

**Important:** These values are examples, not guaranteed to match your actual configuration.

- Set `PORT` to the port your Express server uses.
- Set `MONGODB_URI` to your MongoDB connection string.
- Set `CLIENT_URL` to the address of your frontend.
- Configure `AUTH_ISSUER` and `JWKS_URL` to match your actual JWT issuer and public-key endpoint.

Do not commit your `.env` file or expose database credentials, signing keys, or other secrets.

### 4. Start the Development Server

Check the scripts in `package.json` to determine the correct development command.

For example, if your project defines a `dev` script:

```bash
npm run dev
```

If your project uses a different script, use the command defined in `package.json`.

When the server starts successfully, open the configured local address in your browser or API testing tool.

For example:

```text
http://localhost:5000
```

Replace the port if your server uses another one.

## 🔌 API Endpoints

The following endpoints are based on the current backend API structure. Verify request fields, authentication requirements, and response formats against the implementation.

| Method | Endpoint               | Description                                       |
| ------ | ---------------------- | ------------------------------------------------- |
| GET    | `/`                    | Check whether the server is running               |
| POST   | `/api/events`          | Create an event                                   |
| GET    | `/api/events/upcoming` | Retrieve upcoming events                          |
| GET    | `/api/events`          | Retrieve events                                   |
| GET    | `/api/events/:id`      | Retrieve a specific event                         |
| POST   | `/api/events/:id/join` | Join an event                                     |
| GET    | `/api/my-events`       | Retrieve events created by the authenticated user |
| GET    | `/api/joined-events`   | Retrieve events joined by the authenticated user  |
| PUT    | `/api/events/:id`      | Update an event                                   |
| DELETE | `/api/events/:id`      | Delete an event                                   |
| GET    | `/api/dashboard-stats` | Retrieve dashboard statistics                     |

### Authentication

Some endpoints require a valid JWT.

For protected requests, include the token in the HTTP request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The token must be signed by a trusted issuer and satisfy the requirements enforced by the authentication middleware.

A running Express server does not necessarily mean JWT issuance is configured. If the authentication provider has not been implemented, configure it before attempting to test protected endpoints with real authentication.

### Example: Create an Event

**Endpoint**

```http
POST /api/events
```

The event data is expected to contain fields such as:

```json
{
  "title": "Community Cleanup",
  "description": "A community initiative to clean and improve our local environment.",
  "type": "Environment",
  "thumbnail": "https://example.com/event-image.jpg",
  "location": "Community Center",
  "date": "2027-01-15T09:00:00.000Z",
  "creatorEmail": "organizer@example.com"
}
```

This is an illustrative payload. Use the exact property names and validation rules defined in your backend implementation.

### Example: Retrieve Upcoming Events

**Endpoint**

```http
GET /api/events/upcoming
```

This endpoint returns upcoming events for display on the frontend.

The homepage can use this endpoint to display a selection of recent upcoming events.

### Example: Join an Event

**Endpoint**

```http
POST /api/events/:id/join
```

Replace `:id` with the event's actual MongoDB document ID.

A valid authentication token may be required. The server should associate the joining user with the selected event and prevent duplicate registrations.

## 🗄️ Database

TogetherWe uses MongoDB to store application data.

Mongoose is used for MongoDB object modeling and database operations.

The database supports the event-related operations implemented in the backend, including event creation, retrieval, joining, updating, and deletion.

Ensure that your MongoDB connection string is configured correctly before starting the application.

## 🔐 Security Considerations

- Validate request data before processing it.
- Protect private endpoints with authentication middleware.
- Verify event ownership before allowing updates or deletions.
- Never expose database credentials or authentication secrets.
- Validate JWT signatures, issuer, audience, and expiration.
- Ensure the JWT verification configuration matches the actual authentication provider.
- Use HTTPS in production.
- Configure CORS to allow only trusted frontend origins.
- Avoid trusting client-supplied identity fields without verifying the authenticated user's identity.

## 🧪 Testing

Use Postman or another API client to test the backend.

Recommended testing order:

1. Check the root endpoint.
2. Retrieve upcoming events.
3. Retrieve all events.
4. Retrieve an individual event.
5. Test event creation with valid and invalid data.
6. Test protected endpoints without a token.
7. Test protected endpoints with a valid token.
8. Test joining an event more than once.
9. Test updating an event as its creator.
10. Test updating or deleting another user's event.
11. Test invalid event IDs and nonexistent events.
12. Verify database records after each operation.

Record the actual responses and fix any unexpected behavior before deploying.

## 🌐 Deployment

The backend can be prepared for deployment on a Node.js hosting service such as Render.

Before deployment:

1. Push the backend source code to GitHub.
2. Configure the production start and build commands.
3. Set the required environment variables in the hosting dashboard.
4. Configure the production MongoDB connection.
5. Configure the authentication issuer and JWKS endpoint.
6. Set the allowed frontend origin.
7. Deploy the server.
8. Test public and protected endpoints using the deployed URL.

Do not assume deployment is complete until the server, database connection, authentication flow, and API endpoints have been tested in production.

## 🗺️ Development Roadmap

- [ ] Complete and test JWT authentication integration.
- [ ] Test all event endpoints.
- [ ] Verify validation and error handling.
- [ ] Test event ownership restrictions.
- [ ] Test duplicate event joining.
- [ ] Complete the Next.js frontend.
- [ ] Integrate the frontend with the backend API.
- [ ] Configure production environment variables.
- [ ] Deploy and verify the application.

## 👨‍💻 Project Information

**Project Name:** TogetherWe
**Project Type:** Social Development Events Platform
**Repository:** Backend API
**Status:** Backend development and testing

