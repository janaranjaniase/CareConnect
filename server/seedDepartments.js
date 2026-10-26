require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/Department');

const departments = [
  { name: 'Cardiology', description: 'Heart care' },
  { name: 'Neurology', description: 'Brain and nervous system' },
  { name: 'Orthopedics', description: 'Bones and joints' },
  { name: 'Pediatrics', description: 'Child health' },
  { name: 'Dermatology', description: 'Skin care' },
  { name: 'General Medicine', description: 'General health problems' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const d of departments) {
      const exists = await Department.findOne({ name: d.name });
      if (exists) {
        console.log(`Already exists: ${d.name}`);
        continue;
      }
      await Department.create(d);
      console.log(`Added: ${d.name}`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Done');
  }
}

seed();