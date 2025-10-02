# NestJS Starter Project

A production-ready NestJS starter project with industry-standard structure, best practices, and comprehensive features.

## 🚀 Features

- **NestJS Framework** - Modern, scalable Node.js framework
- **TypeScript** - Full TypeScript support with strict configuration
- **Swagger Documentation** - Auto-generated API documentation
- **Health Checks** - Application health monitoring
- **Validation** - Request validation with class-validator
- **Security** - Helmet for security headers, CORS configuration
- **Environment Configuration** - Centralized configuration management
- **Code Quality** - ESLint, Prettier, and Jest testing setup
- **Modular Architecture** - Clean, scalable folder structure

## 📁 Project Structure

```
src/
├── common/                 # Shared utilities and common code
│   ├── decorators/        # Custom decorators
│   ├── dto/              # Common DTOs
│   ├── filters/          # Exception filters
│   ├── interceptors/     # Response interceptors
│   └── common.module.ts
├── config/               # Configuration files
│   └── configuration.ts
├── health/               # Health check module
│   └── health.controller.ts
├── modules/              # Feature modules
│   └── users/           # Example users module
│       ├── dto/         # Data Transfer Objects
│       ├── entities/    # Database entities
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── app.controller.ts     # Main application controller
├── app.module.ts        # Main application module
├── app.service.ts       # Main application service
└── main.ts             # Application entry point
```

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd nestjs-starter
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up MySQL Database**

   ```bash
   # Connect to MySQL
   mysql -u root -p

   # Create database
   CREATE DATABASE nestjs_starter;

   # Create user (optional)
   CREATE USER 'nestjs_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON nestjs_starter.* TO 'nestjs_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your MySQL configuration.

5. **Start the development server**
   ```bash
   npm run start:dev
   ```

## 📚 Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🌐 API Endpoints

### Application

- `GET /api/v1/` - Welcome message
- `GET /api/v1/health` - Health check

### Users (Example Module)

- `GET /api/v1/users` - Get all users (with pagination)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Documentation

- `GET /api/docs` - Swagger API documentation

## 🔧 Configuration

The application uses environment variables for configuration. Copy `env.example` to `.env` and modify as needed:

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database (MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=password
DATABASE_NAME=nestjs_starter

# JWT (for future use)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📖 API Documentation

Once the server is running, visit `http://localhost:3000/api/docs` to view the interactive Swagger documentation.

## 🏗️ Adding New Modules

To add a new feature module:

1. Create a new folder in `src/modules/`
2. Create the module files:
   - `module-name.module.ts`
   - `module-name.controller.ts`
   - `module-name.service.ts`
   - `dto/` folder for DTOs
   - `entities/` folder for entities
3. Import the module in `app.module.ts`

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing configuration
- **Validation** - Input validation with class-validator
- **Environment Variables** - Secure configuration management

## 🚀 Production Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Start in production mode:
   ```bash
   npm run start:prod
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
