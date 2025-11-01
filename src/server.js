import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import { requireAuth, requireOnboardingComplete } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(express.static("public"));

app.get('/', (req, res) => {
  return res.redirect('/login');
});

app.get("/login", (_, res) => {
  res.sendFile(process.cwd() + "/public/html/login.html");
});
app.get("/register", (_, res) => {
  res.sendFile(process.cwd() + "/public/html/register.html");
});

// Onboarding (JWT required)
app.use('/onboarding', requireAuth, onboardingRoutes);

// Home (JWT required + must have onboarded)
app.get('/home', requireAuth, requireOnboardingComplete, (_, res) => {
  res.sendFile(process.cwd() + "/public/html/home.html");
});

// Auth endpoints
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server has started on port: ${PORT}`);
});
