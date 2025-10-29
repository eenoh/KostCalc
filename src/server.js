import express from 'express';
import authRoutes from './routes/authRoutes.js';


const app = express();
const PORT = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(express.static("public"));


app.get("/login", (_, res) => {
  res.sendFile(process.cwd() + "/public/html/login.html")
});
app.get("/register", (_, res) => {
  res.sendFile(process.cwd() + "/public/html/register.html")
});



// Routes
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server has started on port: ${PORT}`);
});
