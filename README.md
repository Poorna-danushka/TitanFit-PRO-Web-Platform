# 🏋️ GymFit Pro - Full Stack Gym Management System

A complete full-stack web application for gym management and workout tracking, built with React, Node.js, Express, and MongoDB.

## 🎯 Features

✅ **User Authentication**
- Register and login with JWT
- Secure password hashing with bcrypt
- Protected routes

✅ **Gym Exercise Library**
- Pre-loaded 6 exercises with detailed information
- Filter and search exercises
- Track muscle groups and equipment

✅ **Workout Tracking**
- Log workouts with exercise, duration, sets, and reps
- Automatic calorie calculation
- View workout history
- Edit and delete workouts

✅ **User Dashboard**
- Welcome message with user stats
- Total workouts and calories burned
- Weekly progress tracking

✅ **User Profile**
- Update personal information
- Track weight and height
- Calculate BMI
- View member since date

✅ **Responsive UI**
- Tailwind CSS styling
- Mobile-friendly design
- Professional look and feel

## 🔐 Backup & Recovery with AWS S3

The backend includes a full MongoDB backup and restore workflow that stores compressed database archives in AWS S3 using server-side encryption and SHA-256 checksum validation.

Required backend env variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your-fitness-backup-bucket
AWS_S3_PREFIX=database-backups
AWS_S3_SERVER_SIDE_ENCRYPTION=AES256
BACKUP_RETENTION_DAYS=30
```

Admin API endpoints:

- GET /api/v1/admin/backups/config
- GET /api/v1/admin/backups
- POST /api/v1/admin/backups/create
- POST /api/v1/admin/backups/restore

The dump files are produced with `mongodump --archive --gzip` and uploaded with S3 server-side encryption, while each backup is verified by SHA-256 checksums before restore.

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling

## 📁 Project Structure

```
fitness_app/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Exercise.js
│   │   └── Workout.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── exerciseController.js
│   │   └── workoutController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── exerciseRoutes.js
│   │   └── workoutRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── seed/
│   │   └── seedExercises.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── apiService.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Exercises.tsx
│   │   │   ├── Workouts.tsx
│   │   │   └── Profile.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .gitignore
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your MongoDB URI and JWT secrets:
   ```
   MONGODB_URI=mongodb://localhost:27017/gymfit-pro
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Seed exercises to database**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```
   
   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Frontend will run on `http://localhost:3000`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Exercises
- `GET /api/exercises` - Get all exercises
- `GET /api/exercises/:id` - Get exercise by ID
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise

### Workouts
- `GET /api/workouts` - Get all workouts for user
- `GET /api/workouts/:id` - Get workout by ID
- `POST /api/workouts` - Create new workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout
- `GET /api/workouts/stats` - Get workout statistics

## 💪 Predefined Exercises

The system comes with 6 pre-loaded exercises:

1. **Push Ups** - Chest, Triceps | 80 cal/10min | Beginner
2. **Squats** - Legs, Glutes | 100 cal/10min | Beginner
3. **Bench Press** - Chest | 120 cal/10min | Intermediate
4. **Deadlift** - Back, Legs | 150 cal/10min | Advanced
5. **Pull Ups** - Back, Biceps | 110 cal/10min | Intermediate
6. **Plank** - Core | 50 cal/10min | Beginner

## 📊 Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  weight: Number (optional),
  height: Number (optional),
  createdAt: Date
}
```

### Exercise
```javascript
{
  name: String,
  muscleGroup: String,
  equipment: String,
  difficulty: String (Beginner|Intermediate|Advanced),
  caloriesPer10Min: Number,
  description: String,
  createdAt: Date
}
```

### Workout
```javascript
{
  userId: ObjectId (ref: User),
  exerciseId: ObjectId (ref: Exercise),
  duration: Number (minutes),
  sets: Number (optional),
  reps: Number (optional),
  caloriesBurned: Number (calculated),
  date: Date,
  createdAt: Date
}
```

## 🔐 Calorie Calculation Formula

```
Calories Burned = (Exercise Calories Per 10 Min) × (Duration / 10)

Example: 30 minute Push Ups
= (80 cal/10min) × (30 / 10)
= 240 calories
```

## 🎨 Frontend Pages

- **Login Page** - User login with email and password
- **Register Page** - Create new account
- **Dashboard** - Home page with stats and welcome message
- **Exercises** - Browse all available exercises with search
- **Workouts** - View, add, and manage workout history
- **Profile** - Update personal info and view BMI

## 🔒 Security Features

- ✅ JWT authentication with access tokens
- ✅ Password hashing with bcrypt
- ✅ Protected API routes
- ✅ CORS enabled
- ✅ Input validation
- ✅ Authorization checks on user workouts

## 🚦 Running the Full App

### Terminal 1 - Backend
```bash
cd backend
npm install
npm run seed   # First time only
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser

## 📝 Example Workflow

1. **Register** a new account on `/register`
2. **Login** with your credentials on `/login`
3. **View Dashboard** to see your stats
4. **Browse Exercises** to understand available workouts
5. **Add Workout** - Select an exercise, duration, and date
6. **Track Progress** - View your workout history and calories
7. **Update Profile** - Add weight and height for BMI tracking

## 🎓 Learning Resources

This project demonstrates:
- Full-stack MERN architecture
- RESTful API design
- MongoDB relationships
- JWT authentication
- React hooks and routing
- Tailwind CSS styling
- Form handling and validation
- CORS setup
- Environment variables

## 🤝 Contributing

Feel free to fork, modify, and use this project as a learning resource or portfolio project!

## 📄 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

Possible features to add:
- User roles (Admin/User)
- Exercise images and videos
- Workout plans and routines
- Social features (follow friends)
- Advanced analytics and graphs
- Email notifications
- Mobile app version
- Progress photos
- Nutrition tracking

## 💬 Support

If you encounter any issues or have questions, feel free to open an issue or contact the maintainers.

---

**Built with ❤️ for fitness enthusiasts and developers**
