// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session configuration (place this after app.use(express.json()))
app.use(session({
  name: 'sid', // cookie name
  secret: process.env.SESSION_SECRET, // replace with a strong secret in production
//   process.env.SESSION_SECRET || 'replace_this_with_a_real_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI, // same DB or a sessions DB
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 // 1 day in seconds
  }),
  cookie: {
    httpOnly: true,
    secure: false, // set true if using HTTPS in production
    sameSite: 'lax', // or 'strict'
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// MongoDB connection listeners
mongoose.connection.on('connected', () => {
    console.log(' Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error(' MongoDB connection error:', err);
});

// Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    specialization: String,
    createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

// Initialize dummy data
async function initializeData() {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            const users = [
                {
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    name: 'System Administrator',
                    email: 'admin@hospital.com',
                    phone: '9999999999'
                },
                {
                    username: 'patient1',
                    password: '123456',
                    role: 'patient',
                    name: 'Jane Doe',
                    email: 'jane@demo.com',
                    phone: '1111111111'
                },
                {
                    username: 'patient2',
                    password: '123456',
                    role: 'patient',
                    name: 'John Smith',
                    email: 'john@demo.com',
                    phone: '2222222222'
                },
                {
                    username: 'dr_cardio',
                    password: '123456',
                    role: 'doctor',
                    name: 'Dr. Sarah Wilson',
                    email: 'sarah@hospital.com',
                    phone: '3333333333',
                    specialization: 'Cardiology'
                },
                {
                    username: 'dr_derma',
                    password: '123456',
                    role: 'doctor',
                    name: 'Dr. Michael Brown',
                    email: 'michael@hospital.com',
                    phone: '4444444444',
                    specialization: 'Dermatology'
                },
                {
                    username: 'dr_neuro',
                    password: '123456',
                    role: 'doctor',
                    name: 'Dr. Emily Davis',
                    email: 'emily@hospital.com',
                    phone: '5555555555',
                    specialization: 'Neurology'
                }
            ];

            await User.insertMany(users);
            console.log('Dummy users initialized');
        }
    } catch (err) {
        console.error(' Initialization Error:', err);
    }
}

// API Routes


// Authentication
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
          // Save user details in the session
        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
            specialization: user.specialization
        };

        // Send response in your required format
        res.json({
            success: true,
            user: req.session.user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Could not log out' });
        }
        // Clear cookie on client
        res.clearCookie('sid'); // cookie name used above
        res.json({ success: true, message: 'Logged out' });
    });
});

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Not authenticated' });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}


app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name, email, phone, role, specialization } = req.body;

        if (!username || !password || !name || !email || !role) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const newUser = new User({ username, password, name, email, phone, role, specialization });
        await newUser.save();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Doctor management routes
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' }).select('-password');
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/doctors',requireRole('admin'), async (req, res) => {
    try {
        const { username, password, name, email, phone, specialization } = req.body;

        if (!username || !password || !name || !email || !specialization) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const newDoctor = new User({
            username,
            password,
            name,
            email,
            phone,
            role: 'doctor',
            specialization
        });

        await newDoctor.save();
        res.json({ success: true, message: 'Doctor added successfully', doctor: newDoctor });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/doctors/:id',requireRole('admin'), async (req, res) => {
    try {
        const doctorId = req.params.id;

        // Check if doctor has any scheduled appointments
        const hasAppointments = await Appointment.findOne({
            doctorId: doctorId,
            status: 'scheduled'
        });

        if (hasAppointments) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete doctor with scheduled appointments'
            });
        }

        const deletedDoctor = await User.findByIdAndDelete(doctorId);
        if (!deletedDoctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        res.json({ success: true, message: 'Doctor deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/doctors/:id',requireRole('admin'), async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { name, email, phone, specialization } = req.body;

        const updatedDoctor = await User.findByIdAndUpdate(
            doctorId,
            { name, email, phone, specialization },
            { new: true }
        ).select('-password');

        if (!updatedDoctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        res.json({ success: true, message: 'Doctor updated successfully', doctor: updatedDoctor });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Filter doctors by specialization
app.get('/api/doctors/specialization/:specialization', async (req, res) => {
    try {
        const regex = new RegExp(req.params.specialization, 'i');
        const doctors = await User.find({ role: 'doctor', specialization: regex }).select('-password');
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all specializations
app.get('/api/specializations', async (req, res) => {
    try {
        const specializations = await User.distinct('specialization', { role: 'doctor' });
        res.json(specializations.filter(Boolean));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Appointment management
app.post('/api/appointments',requireAuth, requireRole('patient'), async (req, res) => {
    try {
        const {  doctorId, date, timeSlot, notes } = req.body;
        const patientId = req.session.user.id;
        // Check if slot is already booked
        const existingAppointment = await Appointment.findOne({
            doctorId,
            date: new Date(date),
            timeSlot,
            status: 'scheduled'
        });

        if (existingAppointment) {
            return res.status(400).json({ success: false, message: 'Time slot already booked' });
        }

        const appointment = new Appointment({
            patientId,
            doctorId,
            date: new Date(date),
            timeSlot,
            notes
        });

        await appointment.save();
        res.json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get available time slots
app.get('/api/appointments/available/:doctorId/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        const allSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];

        const bookedAppointments = await Appointment.find({
            doctorId,
            date: new Date(date),
            status: 'scheduled'
        });

        const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        res.json(availableSlots);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get appointments by patient
// safer: appointments of logged-in patient
app.get('/api/appointments/me', requireAuth, requireRole('patient'), async (req,res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.session.user.id })
      .populate('doctorId', 'name specialization')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Get appointments by doctor
app.get('/api/appointments/doctor/me', requireAuth, requireRole('doctor'), async (req,res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.session.user.id })
      .populate('patientId', 'name email phone')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Get all appointments (admin)
// Enhanced appointments route in server.js
app.get('/api/appointments',requireRole('admin'), async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctorId', 'name specialization')
            .populate('patientId', 'name email')
            .sort({ date: -1 });

        // Filter out appointments with null populated fields
        const validAppointments = appointments.filter(apt =>
            apt.doctorId && apt.patientId
        );

        res.json(validAppointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update appointment status
app.put('/api/appointments/:id/status',  requireAuth, requireRole('doctor'),async (req, res) => {
   try {
    const { status } = req.body;
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ message: 'Not found' });

    // If doctor is updating, ensure the doctor owns appointment
    if (req.session.user.role === 'doctor' && apt.doctorId.toString() !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    apt.status = status;
    await apt.save();
    res.json({ success: true, appointment: apt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users (admin)
app.get('/api/users',requireRole('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout route: destroys the session on the server and clears the cookie
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Could not log out' });
    }
    // Clear the cookie that stores the session id (name used in session config)
    res.clearCookie('sid'); 
    res.json({ success: true, message: 'Logged out' });
  });
});


// Serve manifest.json
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve service worker
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Serve offline page
app.get('/offline', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'offline.html'));
});
// Frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session || req.session.user?.role !== 'admin') {
    return res.redirect('/'); // or send 403
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


app.get('/doctor', (req, res) => {
    if (!req.session || req.session.user?.role !== 'doctor') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'doctor.html'));
});
app.get('/patient', (req, res) => {
   if (!req.session || req.session.user?.role !== 'patient') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'patient.html'));
});






// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    initializeData();
});
